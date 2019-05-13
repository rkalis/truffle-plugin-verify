const ethers = require("ethers");
const fs = require('fs')
const axios = require('axios')
const querystring = require('querystring')
const sleep = require('await-sleep')

const API_URLS = {
  [1]: 'https://api.etherscan.io/api',
  [3]: 'https://api-ropsten.etherscan.io/api',
  [4]: 'https://api-rinkeby.etherscan.io/api',
  [5]: 'https://api-goerli.etherscan.io/api',
  [42]: 'https://api-kovan.etherscan.io/api',
}

const VerificationStatus = {
  FAILED: 'Fail - Unable to verify',
  SUCCESS: 'Pass - Verified',
  PENDING: 'Pending in queue'
}

const fetchConstructorTypes = (artifact) => {
  for (const value of artifact.abi) {
	if (value.type === "constructor") {
		return value.inputs.map(inp => inp.type);
	}
  }
  return [];
}

const sendVerifyRequest = async (artifact, options) => {
  // Encode parameters
  const encoder = new ethers.utils.AbiCoder();
  // Change to your constructor parameters
  const types = fetchConstructorTypes(artifact);
  const values = []; // populate with constructor values
  const encodedConstructorArgs = await encoder.encode(types, values);
  encodedConstructorArgs = encodedConstructorArgs.substr(2);
  return await axios.post(
    options.apiUrl,
    querystring.stringify({
      apikey: options.apiKey,
      module: 'contract',
      action: 'verifysourcecode',
      // TODO: detect deployed networks
      contractaddress: artifact.networks[`${options.networkId}`].address,
      // TODO: Flatten multi-level contracts
      sourceCode: artifact.source,
      contractname: artifact.contractName,
      compilerversion: `v${artifact.compiler.version.replace('.Emscripten.clang', '')}`,
      optimizationUsed: options.optimizationUsed,
      runs: options.runs,
      constructorArguements: encodedConstructorArgs
    })
  )
}

const verificationStatus = async (guid, options) => {
  while (true) {
    await sleep(1000)

    const verificationResult = await axios.get(
      `${options.apiUrl}?module=contract&action=checkverifystatus&apikey=${options.apiKey}&guid=${guid}`
    )

    if (verificationResult.data.result !== VerificationStatus.PENDING) {
      return verificationResult.data.result
    }
  }
}

const parseConfig = (config) => {
  const networkId = (config.networks[config.network] || {}).network_id || 4
  const apiUrl = API_URLS[networkId]
  const apiKey = config.api_keys.etherscan
  const flattenedLocation = config.flattenedLocation
  const contractName = config._[1]
  const workingDir = config.working_directory
  const contractsBuildDir = config.contracts_build_directory
  const optimizerSettings = config.compilers.solc.settings.optimizer

  return {
    apiUrl,
    apiKey,
    networkId,
    contractName,
    workingDir,
    contractsBuildDir,
    flattenedLocation,
    // Note: API docs state enabled = 0, disbled = 1, but empiric evidence suggests reverse
    optimizationUsed: optimizerSettings.enabled ? 1 : 0,
    runs: optimizerSettings.runs
  }
}

module.exports = async (config) => {
  const options = parseConfig(config)

  const artifactPath = `${options.contractsBuildDir}/${options.contractName}.json`
  const artifact = require(artifactPath)

  if (options.flattenedLocation) {
    const flattenedPath = `${options.flattenedLocation}/${options.contractName}.sol`
    const source = fs.readFileSync(flattenedPath, "utf8");
    artifact.source = source;
  }

  try {
    const res = await sendVerifyRequest(artifact, options)

    // TODO: Better error handling
    if (res.data && res.data.status === '1') {
      const status = await verificationStatus(res.data.result, options)
      console.log(status)
    } else {
      console.log(res.data.result)
    }
  } catch (e) {
    console.log(e)
  }
}