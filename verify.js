const axios = require('axios')
const querystring = require('querystring')
const sleep = require('await-sleep')
const { merge } = require('sol-merger')
const fs = require('fs')
const { enforce, enforceOrThrow } = require('./util')
const { API_URLS, EXPLORER_URLS, RequestStatus, VerificationStatus } = require('./constants')

module.exports = async (config) => {
  const options = parseConfig(config)

  // Verify each contract
  const contractNames = config._.slice(1)

  // Track which contracts failed verification
  const failedContracts = []
  for (const contractName of contractNames) {
    console.log(`Verifying ${contractName}`)
    try {
      const artifact = getArtifact(contractName, options)
      let status = await verifyContract(artifact, options)
      if (status === VerificationStatus.FAILED) {
        failedContracts.push(contractName)
      } else {
        // Add link to verified contract on Etherscan
        const contractAddress = artifact.networks[`${options.networkId}`].address
        const explorerUrl = `${EXPLORER_URLS[options.networkId]}/${contractAddress}#contracts`
        status += `: ${explorerUrl}`
      }
      console.log(status)
    } catch (e) {
      console.error(e.message)
      failedContracts.push(contractName)
    }
    console.log()
  }

  enforce(
    failedContracts.length === 0,
    `Failed to verify ${failedContracts.length} contract(s): ${failedContracts.join(', ')}`
  )

  console.log(`Successfully verified ${contractNames.length} contract(s).`)
}

const parseConfig = (config) => {
  // Truffle handles network stuff, just need network_id
  const networkId = config.network_id
  const apiUrl = API_URLS[networkId]
  enforce(apiUrl, `Etherscan has no support for network ${config.network} with id ${networkId}`)

  const apiKey = config.api_keys && config.api_keys.etherscan
  enforce(apiKey, 'No Etherscan API key specified')

  enforce(config._.length > 1, 'No contract name(s) specified')

  const workingDir = config.working_directory
  const contractsBuildDir = config.contracts_build_directory
  const optimizerSettings = config.compilers.solc.settings.optimizer
  const verifyPreamble = config.verify && config.verify.preamble

  return {
    apiUrl,
    apiKey,
    networkId,
    workingDir,
    contractsBuildDir,
    verifyPreamble,
    // Note: API docs state enabled = 0, disbled = 1, but empiric evidence suggests reverse
    optimizationUsed: optimizerSettings.enabled ? 1 : 0,
    runs: optimizerSettings.runs
  }
}

const getArtifact = (contractName, options) => {
  // Construct artifact path and read artifact
  const artifactPath = `${options.contractsBuildDir}/${contractName}.json`
  enforceOrThrow(fs.existsSync(artifactPath), `Could not find ${contractName} artifact at ${artifactPath}`)
  return require(artifactPath)
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

  const postQueries = {
    apikey: options.apiKey,
    module: 'contract',
    action: 'verifysourcecode',
    contractaddress: artifact.networks[`${options.networkId}`].address,
    sourceCode: mergedSource,
    contractname: artifact.contractName,
    compilerversion: `v${artifact.compiler.version.replace('.Emscripten.clang', '')}`,
    optimizationUsed: options.optimizationUsed,
    runs: options.runs,
    constructorArguements: encodedConstructorArgs
  }

  // Link libraries as specified in the artifact
  const libraries = artifact.networks[`${options.networkId}`].links || {}
  Object.entries(libraries).forEach(([key, value], i) => {
    enforceOrThrow(i < 10, 'Can not link more than 10 libraries with Etherscan API')
    postQueries[`libraryname${i + 1}`] = key
    postQueries[`libraryaddress${i + 1}`] = value
  })

  try {
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
    res = await axios.get(
      `${options.apiUrl}?module=account&action=txlist&address=${contractAddress}&page=1&sort=asc&offset=1`
    )
  } catch (e) {
    throw new Error(`Failed to connect to Etherscan API at url ${options.apiUrl}`)
  }
  enforceOrThrow(res.data && res.data.status === RequestStatus.OK, 'Failed to fetch constructor arguments')

  // The last part of the transaction data is the constructor parameters
  return res.data.result[0].input.substring(artifact.bytecode.length)
}

const fetchMergedSource = async (artifact, options) => {
  enforceOrThrow(
    fs.existsSync(artifact.sourcePath),
    `Could not find ${artifact.contractName} source file at ${artifact.sourcePath}`
  )

  let mergedSource = await merge(artifact.sourcePath)
  // Include the preamble if it exists, removing all instances of */ for safety
  if (options.verifyPreamble) {
    const preamble = options.verifyPreamble.replace(/\*+\//g, '')
    mergedSource = `/**\n${preamble}\n*/\n\n${mergedSource}`
  }
  return mergedSource
}

const verificationStatus = async (guid, options) => {
  // Retry API call every second until status is no longer pending
  while (true) {
    await sleep(1000)

    try {
      const verificationResult = await axios.get(
        `${options.apiUrl}?module=contract&action=checkverifystatus&apikey=${options.apiKey}&guid=${guid}`
      )
      if (verificationResult.data.result !== VerificationStatus.PENDING) {
        return verificationResult.data.result
      }
    } catch (e) {
      throw new Error(`Failed to connect to Etherscan API at url ${options.apiUrl}`)
    }
  }
}
