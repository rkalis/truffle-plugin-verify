const axios = require('axios')
const querystring = require('querystring')
const sleep = require('await-sleep')
const { merge } = require('sol-merger')
const fs = require('fs')

const API_URLS = {
  1: 'https://api.etherscan.io/api',
  3: 'https://api-ropsten.etherscan.io/api',
  4: 'https://api-rinkeby.etherscan.io/api',
  5: 'https://api-goerli.etherscan.io/api',
  42: 'https://api-kovan.etherscan.io/api'
}

const VerificationStatus = {
  FAILED: 'Fail - Unable to verify',
  SUCCESS: 'Pass - Verified',
  PENDING: 'Pending in queue'
}

const RequestStatus = {
  OK: '1',
  NOTOK: '0'
}

const fetchConstructorValues = async (artifact, options) => {
  const contractAddress = artifact.networks[`${options.networkId}`].address
  // fetch the contract creation transaction and extract the input data
  const res = await axios.get(
    `${options.apiUrl}?module=account&action=txlist&address=${contractAddress}&page=1&sort=asc&offset=1`
  )

  if (res.data && res.data.status === RequestStatus.OK) {
    const bytecodeLength = artifact.bytecode.length
    // the last part of the transaction data is the constructor parameters
    return res.data.result[0].input.substring(bytecodeLength)
  }

  throw new Error('Failed to fetch constructor arguments')
}

const fetchMergedSource = async (artifact, options) => {
  if (!fs.existsSync(artifact.sourcePath)) {
    throw new Error(`Could not find source file: ${artifact.sourcePath}`)
  }

  let mergedSource = await merge(artifact.sourcePath)
  // Include the preamble if it exists, removing all instances of */ for safety
  if (options.verifyPreamble) {
    mergedSource = `/**
${options.verifyPreamble.replace(/\*+\/+/g, '')}
*/

${mergedSource}`
  }
  return mergedSource
}

const sendVerifyRequest = async (artifact, options) => {
  const encodedConstructorArgs = await fetchConstructorValues(artifact, options)
  const mergedSource = await fetchMergedSource(artifact, options)
  const postQueries = {
    apikey: options.apiKey,
    module: 'contract',
    action: 'verifysourcecode',
    // TODO: detect deployed networks
    contractaddress: artifact.networks[`${options.networkId}`].address,
    sourceCode: mergedSource,
    contractname: artifact.contractName,
    compilerversion: `v${artifact.compiler.version.replace('.Emscripten.clang', '')}`,
    optimizationUsed: options.optimizationUsed,
    runs: options.runs,
    constructorArguements: encodedConstructorArgs
  }

  const libraries = artifact.networks[`${options.networkId}`].links || {}
  Object.entries(libraries).forEach(([key, value], i) => {
    if (i > 9) throw new Error('Can not link more than 10 libraries with Etherscan API')
    postQueries[`libraryname${i + 1}`] = key
    postQueries[`libraryaddress${i + 1}`] = value
  })

  try {
    return axios.post(
      options.apiUrl,
      querystring.stringify(postQueries)
    )
  } catch (e) {
    throw new Error(`Failed to connect to Etherscan API at url ${options.apiUrl}`)
  }
}

const verificationStatus = async (guid, options) => {
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

const parseConfig = (config) => {
  if (!config.networks[config.network]) {
    throw new Error(`No network configuration found for network ${config.network}`)
  }

  const networkId = (config.networks[config.network] || {}).network_id || 1
  const apiUrl = API_URLS[networkId]

  if (!apiUrl) {
    throw new Error(`Incorrect network id specified for network ${config.network}`)
  }

  if (!config.api_keys || !config.api_keys.etherscan) {
    throw new Error('No Etherscan API key specified')
  }

  const apiKey = config.api_keys.etherscan

  if (config._.length < 2) {
    throw new Error('No contract name(s) specified')
  }

  const workingDir = config.working_directory
  const contractsBuildDir = config.contracts_build_directory
  const optimizerSettings = config.compilers.solc.settings.optimizer

  let verifyPreamble = ''
  if (config.verify && config.verify.preamble) {
    verifyPreamble = config.verify.preamble
  }

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

const verifyContract = async (options, contractName) => {
  const artifactPath = `${options.contractsBuildDir}/${contractName}.json`
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Could not find ${contractName} artifact at: ${artifactPath}`)
  }

  const artifact = require(artifactPath)
  if (!artifact.networks || !artifact.networks[`${options.networkId}`]) {
    throw new Error(`No instance of contract ${contractName} found on network ${config.network}`)
  }

  const res = await sendVerifyRequest(artifact, options)
  if (!res.data) {
    throw new Error(`Failed to connect to Etherscan API at url ${options.apiUrl}`)
  } else if (res.data.status !== RequestStatus.OK) {
    throw new Error(res.data.result)
  } else {
    const status = await verificationStatus(res.data.result, options)
    console.log(status)
  }
}

module.exports = async (config) => {
  // Attempt to parse options
  let options
  try {
    options = parseConfig(config)
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }

  // Verify each contract
  const contractNames = config._.slice(1)
  // Track which contracts failed verification
  const errorContracts = []
  for (const contractName of contractNames) {
    console.log(`\nVerifying: ${contractName}`)
    try {
      await verifyContract(options, contractName)
    } catch (e) {
      console.error(e.message)
      errorContracts.push(contractName)
    }
  }

  if (errorContracts.length > 0) {
    console.error(`\nFailed to verify ${errorContracts.length} contract(s): ${errorContracts.join(', ')}`)
    process.exit(1)
  }

  console.log(`\nSuccessfully verified ${contractNames.length} contract(s).`)
}
