const axios = require('axios')
const cliLogger = require('cli-logger')
const delay = require('delay')
const fs = require('fs')
const path = require('path')
const querystring = require('querystring')
const { merge } = require('sol-merger')
const { plugins } = require('sol-merger/dist/lib/plugins')
const { API_URLS, EXPLORER_URLS, RequestStatus, VerificationStatus, EtherscanLicense } = require('./constants')
const { enforce, enforceOrThrow } = require('./util')
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
    } catch (e) {
      logger.error(e.message)
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
  // Truffle handles network stuff, just need network_id
  const networkId = config.network_id
  const apiUrl = API_URLS[networkId]
  enforce(apiUrl, `Etherscan has no support for network ${config.network} with id ${networkId}`, logger)

  const etherscanApiKey = config.api_keys && config.api_keys.etherscan
  const bscscanApiKey = config.api_keys && config.api_keys.bscscan
  const hecoinfoApiKey = config.api_keys && config.api_keys.hecoinfo
  const ftmscanApiKey = config.api_keys && config.api_keys.ftmscan
  const polygonscanApiKey = config.api_keys && config.api_keys.polygonscan

  const apiKey = apiUrl.includes('bscscan') && bscscanApiKey
    ? bscscanApiKey
    : apiUrl.includes('ftmscan') && ftmscanApiKey
      ? ftmscanApiKey
      : apiUrl.includes('hecoinfo') && hecoinfoApiKey
        ? hecoinfoApiKey
        : apiUrl.includes('polygonscan') && polygonscanApiKey
          ? polygonscanApiKey
          : etherscanApiKey

  enforce(apiKey, 'No Etherscan API key specified', logger)

  enforce(config._.length > 1, 'No contract name(s) specified', logger)

  const workingDir = config.working_directory
  const contractsBuildDir = config.contracts_build_directory
  const solcSettings = config.compilers.solc.settings
  const verifyPreamble = config.verify && config.verify.preamble

  return {
    apiUrl,
    apiKey,
    networkId,
    workingDir,
    contractsBuildDir,
    verifyPreamble,
    optimizationUsed: solcSettings.optimizer.enabled ? 1 : 0,
    runs: solcSettings.optimizer.runs,
    evmVersion: solcSettings.evmTarget,
    license: config.license
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
  const encodedConstructorArgs = await fetchConstructorValues(artifact, options)
  const mergedSource = await fetchMergedSource(artifact, options)

  const license = EtherscanLicense[options.license]

  const postQueries = {
    apikey: options.apiKey,
    module: 'contract',
    action: 'verifysourcecode',
    contractaddress: artifact.networks[`${options.networkId}`].address,
    sourceCode: mergedSource,
    codeformat: 'solidity-single-file',
    contractname: artifact.contractName,
    compilerversion: `v${artifact.compiler.version.replace('.Emscripten.clang', '')}`,
    optimizationUsed: options.optimizationUsed,
    runs: options.runs,
    constructorArguements: encodedConstructorArgs,
    evmversion: options.evmVersion,
    licenseType: license
  }

  // Link libraries as specified in the artifact
  const libraries = artifact.networks[`${options.networkId}`].links || {}
  Object.entries(libraries).forEach(([key, value], i) => {
    logger.debug(`Adding ${key} as a linked library at address ${value}`)
    enforceOrThrow(i < 10, 'Can not link more than 10 libraries with Etherscan API')
    postQueries[`libraryname${i + 1}`] = key
    postQueries[`libraryaddress${i + 1}`] = value
  })

  try {
    logger.debug('Sending verify request with POST arguments:')
    logger.debug(JSON.stringify(postQueries, null, 2))
    return axios.post(options.apiUrl, querystring.stringify(postQueries))
  } catch (e) {
    throw new Error(`Failed to connect to Etherscan API at url ${options.apiUrl}`)
  }
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
  } catch (e) {
    throw new Error(`Failed to connect to Etherscan API at url ${options.apiUrl}`)
  }

  // The last part of the transaction data is the constructor arguments
  // If it can't be accessed, try using empty constructor arguments
  const constructorParameters = res.data && res.data.status === RequestStatus.OK && res.data.result[0] !== undefined
    ? res.data.result[0].input.substring(artifact.bytecode.length)
    : ''
  logger.debug(`Constructor parameters received: 0x${constructorParameters}`)
  return constructorParameters
}

const fetchMergedSource = async (artifact, options) => {
  enforceOrThrow(
    fs.existsSync(artifact.sourcePath),
    `Could not find ${artifact.contractName} source file at ${artifact.sourcePath}`
  )

  logger.debug(`Flattening source file ${artifact.sourcePath}`)

  // If a license is provided, we remove all other SPDX-License-Identifiers
  const pluginList = options.license ? [plugins.SPDXLicenseRemovePlugin] : []
  let mergedSource = await merge(artifact.sourcePath, { removeComments: false, exportPlugins: pluginList })

  // Include the preamble if it exists, removing all instances of */ for safety
  if (options.verifyPreamble) {
    logger.debug('Adding preamble to merged source code')
    const preamble = options.verifyPreamble.replace(/\*+\//g, '')
    mergedSource = `/**\n${preamble}\n*/\n\n${mergedSource}`
  }

  if (options.license) {
    mergedSource = `// SPDX-License-Identifier: ${options.license}\n\n${mergedSource}`
  }

  // Etherscan disallows multiple SPDX-License-Identifier statements
  enforceOrThrow(
    (mergedSource.match(/SPDX-License-Identifier:/g) || []).length <= 1,
    'Found duplicate SPDX-License-Identifiers in the Solidity code, please provide the correct license with --license <license identifier>'
  )

  return mergedSource
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
      const verificationResult = await axios.get(
        `${options.apiUrl}?${qs}`
      )
      if (verificationResult.data.result !== VerificationStatus.PENDING) {
        return verificationResult.data.result
      }
    } catch (e) {
      throw new Error(`Failed to connect to Etherscan API at url ${options.apiUrl}`)
    }
  }
}
