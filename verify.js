const axios = require('axios')
const querystring = require('querystring')
const sleep = require('await-sleep')

const API_URLS = {
  [1]: 'https://api.etherscan.io/api',
  [4]: 'https://api-rinkeby.etherscan.io/api'
}

const VerificationStatus = {
  FAILED: 'Fail - Unable to verify',
  SUCCESS: 'Pass - Verified',
  PENDING: 'Pending in queue'
}

const sendVerifyRequest = async (apiUrl, apiKey, networkId, artifact) => {
  return await axios.post(
    apiUrl,
    querystring.stringify({
      apikey: apiKey,
      module: 'contract',
      action: 'verifysourcecode',
      // TODO: detect deployed networks
      contractaddress: artifact.networks[`${networkId}`].address,
      // TODO: Flatten multi-level contracts
      sourceCode: artifact.source,
      contractname: artifact.contractName,
      compilerversion: `v${artifact.compiler.version.replace('.Emscripten.clang', '')}`,
      optimizationUsed: 0,
      runs: 200,
      // constructorArguements: '$('#constructorArguements').val()'
    })
  )
}

const verificationStatus = async (apiUrl, apiKey, guid) => {
  while (true) {
    await sleep(1000)

    const verificationResult = await axios.get(
      `${apiUrl}?module=contract&action=checkverifystatus&apikey=${apiKey}&guid=${guid}`
    )

    if (verificationResult.data.result !== VerificationStatus.PENDING) {
      return verificationResult.data.result
    }
  }
}

module.exports = async (config) => {
  const networkId = (config.networks[config.network] || {}).network_id || 4
  const apiUrl = API_URLS[networkId]
  const apiKey = config.verify.etherscanApiKey
  const contractName = config._[1]
  const artifactPath = `${config.working_directory}/build/contracts/${contractName}.json`
  const artifact = require(artifactPath)

  try {
    const res = await sendVerifyRequest(apiUrl, apiKey, networkId, artifact)

    // TODO: Better error handling
    if (res.data && res.data.status === '1') {
      const status = await verificationStatus(apiUrl, apiKey, res.data.result)
      console.log(status)
    } else {
      console.log(res.data.result)
    }
  } catch (e) {
    console.log(e)
  }
}
