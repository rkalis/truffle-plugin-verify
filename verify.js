const axios = require('axios')
const cliLogger = require('cli-logger')
const delay = require('delay')
const fs = require('fs')
const path = require('path')
const querystring = require('querystring')
const { API_URLS, EXPLORER_URLS, RequestStatus, VerificationStatus } = require('./constants')
const { enforce, enforceOrThrow, normaliseContractPath } = require('./util')
const { version } = require('./package.json')

const logger = cliLogger({ level: 'info' })

module.exports = async (config) => {
  const options = parseConfig(config)

  // Set debug logging
  if (config.debug) logger.level('debug')
  logger.debug('DEBUG logging is turned ON')
  logger.debug(`Running truffle-plugin-verify v${version}`)

  // Verify each contract
  const contractNameAddressPairs = config._.slice(1)

  // Track which contracts failed verification
  const failedContracts = []
  for (const contractNameAddressPair of contractNameAddressPairs) {
    logger.info(`Verifying ${contractNameAddressPair}`)
    try {
      const [contractName, contractAddress] = contractNameAddressPair.split('@')

      const artifact = getArtifact(contractName, options)

      if (contractAddress) {
        logger.debug(`Custom address ${contractAddress} specified`)
        if (!artifact.networks[`${options.networkId}`]) {
          artifact.networks[`${options.networkId}`] = {}
        }
        artifact.networks[`${options.networkId}`].address = contractAddress
      }

      let status = await verifyContract(artifact, options)

      if (status === VerificationStatus.FAILED) {
        failedContracts.push(`${contractNameAddressPair}`)
      } else {
        // Add link to verified contract on Etherscan
        const explorerUrl = `${EXPLORER_URLS[options.networkId]}/${artifact.networks[`${options.networkId}`].address}#contracts`
        status += `: ${explorerUrl}`
      }
      logger.info(status)
    } catch (error) {
      logger.error(error.message)
      failedContracts.push(contractNameAddressPair)
    }
    logger.info()
  }

  enforce(
    failedContracts.length === 0,
    `Failed to verify ${failedContracts.length} contract(s): ${failedContracts.join(', ')}`,
    logger
  )

  logger.info(`Successfully verified ${contractNameAddressPairs.length} contract(s).`)
}

const parseConfig = (config) => {
  // Truffle handles network stuff, just need to get network_id
  const networkId = config.network_id
  const apiUrl = API_URLS[networkId]
  enforce(apiUrl, `Etherscan has no support for network ${config.network} with id ${networkId}`, logger)

  const etherscanApiKey = config.api_keys && config.api_keys.etherscan
  const bscscanApiKey = config.api_keys && config.api_keys.bscscan

  const apiKey = apiUrl.includes('bscscan') && bscscanApiKey ? bscscanApiKey : etherscanApiKey
  enforce(apiKey, 'No Etherscan API key specified', logger)

  enforce(config._.length > 1, 'No contract name(s) specified', logger)

  const workingDir = config.working_directory
  const contractsBuildDir = config.contracts_build_directory

  return {
    apiUrl,
    apiKey,
    networkId,
    workingDir,
    contractsBuildDir
  }
}

const getArtifact = (contractName, options) => {
  const artifactPath = path.resolve(options.contractsBuildDir, `${contractName}.json`)

  logger.debug(`Reading artifact file at ${artifactPath}`)
  enforceOrThrow(fs.existsSync(artifactPath), `Could not find ${contractName} artifact at ${artifactPath}`)

  // Stringify + parse to make a deep copy (to avoid bugs with PR #19)
  return JSON.parse(JSON.stringify(require(artifactPath)))
}

const verifyContract = async (artifact, options) => {
  enforceOrThrow(
    artifact.networks && artifact.networks[`${options.networkId}`],
    `No instance of contract ${artifact.contractName} found for network id ${options.networkId}`
  )

  const res = await sendVerifyRequest(artifact, options)
  enforceOrThrow(res.data, `Failed to connect to Etherscan API at url ${options.apiUrl}`)

  if (res.data.result === VerificationStatus.ALREADY_VERIFIED) {
    return VerificationStatus.ALREADY_VERIFIED
  }

  enforceOrThrow(res.data.status === RequestStatus.OK, res.data.result)
  return verificationStatus(res.data.result, options)
}

const sendVerifyRequest = async (artifact, options) => {
  const compilerVersion = extractCompilerVersion(artifact)
  const encodedConstructorArgs = await fetchConstructorValues(artifact, options)
  const inputJSON = getInputJSON(artifact, options)

  const postQueries = {
    apikey: options.apiKey,
    module: 'contract',
    action: 'verifysourcecode',
    contractaddress: artifact.networks[`${options.networkId}`].address,
    sourceCode: JSON.stringify(inputJSON),
    codeformat: 'solidity-standard-json-input',
    contractname: `${artifact.ast.absolutePath}:${artifact.contractName}`,
    compilerversion: compilerVersion,
    constructorArguements: encodedConstructorArgs
  }

  try {
    logger.debug('Sending verify request with POST arguments:')
    logger.debug(JSON.stringify(postQueries, null, 2))
    return await axios.post(options.apiUrl, querystring.stringify(postQueries))
  } catch (error) {
    logger.debug(error.message)
    throw new Error(`Failed to connect to Etherscan API at url ${options.apiUrl}`)
  }
}

const extractCompilerVersion = (artifact) => {
  const metadata = JSON.parse(artifact.metadata)

  const compilerVersion = `v${metadata.compiler.version}`

  return compilerVersion
}

const fetchConstructorValues = async (artifact, options) => {
  const contractAddress = artifact.networks[`${options.networkId}`].address

  // Fetch the contract creation transaction to extract the input data
  let res
  try {
    const qs = querystring.stringify({
      apiKey: options.apiKey,
      module: 'account',
      action: 'txlist',
      address: contractAddress,
      page: 1,
      sort: 'asc',
      offset: 1
    })
    const url = `${options.apiUrl}?${qs}`
    logger.debug(`Retrieving constructor parameters from ${url}`)
    res = await axios.get(url)
  } catch (error) {
    logger.debug(error.message)
    throw new Error(`Failed to connect to Etherscan API at url ${options.apiUrl}`)
  }

  // The last part of the transaction data is the constructor arguments
  // If it can't be accessed for any reason, try using empty constructor arguments
  if (res.data && res.data.status === RequestStatus.OK && res.data.result[0] !== undefined) {
    const constructorArgs = res.data.result[0].input.substring(artifact.bytecode.length)
    logger.debug(`Constructor parameters retrieved: 0x${constructorArgs}`)
    return constructorArgs
  } else {
    logger.debug('Could not retrieve constructor parameters, using empty parameters as fallback')
    return ''
  }
}

const getInputJSON = (artifact, options) => {
  const metadata = JSON.parse(artifact.metadata)

  const libraries = getLibraries(artifact, options)

  const inputJSON = {
    language: metadata.language,
    sources: metadata.sources,
    settings: {
      remappings: metadata.settings.remappings,
      optimizer: metadata.settings.optimizer,
      evmVersion: metadata.settings.evmVersion,
      libraries
    }
  }

  for (const contractPath in inputJSON.sources) {
    // If we're on Windows we need to de-Unixify the path so that Windows can read the file
    const normalisedContractPath = normaliseContractPath(contractPath, logger)
    const absolutePath = require.resolve(normalisedContractPath)
    const content = fs.readFileSync(absolutePath, 'utf8')
    inputJSON.sources[contractPath] = { content }
  }

  return inputJSON
}

const getLibraries = (artifact, options) => {
  const libraries = {
    // Example data structure of libraries object in Standard Input JSON
    // 'ConvertLib.sol': {
    //   'ConvertLib': '0x...',
    //   'OtherLibInSameSourceFile': '0x...'
    // }
  }

  const links = artifact.networks[`${options.networkId}`].links || {}

  for (const libraryName in links) {
    // Retrieve the source path for this library
    const libraryArtifact = getArtifact(libraryName, options)
    const librarySourceFile = libraryArtifact.ast.absolutePath

    // Add the library to the object of libraries for this source path
    const librariesForSourceFile = libraries[librarySourceFile] || {}
    librariesForSourceFile[libraryName] = links[libraryName]
    libraries[librarySourceFile] = librariesForSourceFile
  }

  return libraries
}

const verificationStatus = async (guid, options) => {
  logger.debug(`Checking status of verification request ${guid}`)
  // Retry API call every second until status is no longer pending
  while (true) {
    await delay(1000)

    try {
      const qs = querystring.stringify({
        apiKey: options.apiKey,
        module: 'contract',
        action: 'checkverifystatus',
        guid
      })
      const verificationResult = await axios.get(`${options.apiUrl}?${qs}`)
      if (verificationResult.data.result !== VerificationStatus.PENDING) {
        return verificationResult.data.result
      }
    } catch (error) {
      logger.debug(error.message)
      throw new Error(`Failed to connect to Etherscan API at url ${options.apiUrl}`)
    }
  }
}
