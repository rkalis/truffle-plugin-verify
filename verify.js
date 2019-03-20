const axios = require('axios')
const querystring = require('querystring')

const API_URLS = {
  [1]: 'https://api.etherscan.io/api',
  [4]: 'https://api-rinkeby.etherscan.io/api'
}

module.exports = async (config) => {
  const networkId = (config.networks[config.network] || {}).network_id || 4
  const apiUrl = API_URLS[networkId]
  const apiKey = config.verify.etherscanApiKey
  const contractName = config._[1]
  const artifactPath = `${config.working_directory}/build/contracts/${contractName}.json`
  const artifact = require(artifactPath)
  const compilerVersion = `v${artifact.compiler.version.replace('.Emscripten.clang', '')}`

  try {
    const res = await axios.post(
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
        compilerversion: compilerVersion,
        optimizationUsed: 0,
        runs: 200,
        // constructorArguements: '$('#constructorArguements').val()'
      })
    )
    // TODO: Auto-checking status & better error handling
    if (res.data && res.data.status === '1') {
      const guid = res.data.result
      console.log(`You can check your verification status with this guid: ${guid}`)
    } else {
      console.log(`Something went wrong\n${JSON.stringify(res.data)}`)
    }
  } catch (e) {
    console.log(e)
  }
}
