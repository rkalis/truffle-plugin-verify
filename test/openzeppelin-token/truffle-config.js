const HDWalletProvider = require('@truffle/hdwallet-provider')
require('dotenv').config()

module.exports = {
  compilers: {
    solc: {
      version: '0.8.9',
    }
  },
  plugins: ['truffle-plugin-verify'],
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY,
    snowtrace: process.env.SNOWTRACE_API_KEY,
  },
  networks: {
    ropsten: {
      provider: () => {
        return new HDWalletProvider(`${process.env.MNEMONIC}`, `wss://ropsten.infura.io/ws/v3/${process.env.INFURA_ID}`)
      },
      gas: 0x7a1200,
      network_id: 3,
      skipDryRun: true
    },
    rinkeby: {
      provider: () => {
        return new HDWalletProvider(`${process.env.MNEMONIC}`, `wss://rinkeby.infura.io/ws/v3/${process.env.INFURA_ID}`)
      },
      gas: 0x7a1200,
      network_id: 4,
      skipDryRun: true
    },
    goerli: {
      provider: () => {
        return new HDWalletProvider(`${process.env.MNEMONIC}`, `wss://goerli.infura.io/ws/v3/${process.env.INFURA_ID}`)
      },
      gas: 0x7a1200,
      network_id: 5,
      skipDryRun: true
    },
    fuji: {
      provider: () =>
        new HDWalletProvider(`${process.env.MNEMONIC}`, `https://api.avax-test.network/ext/bc/C/rpc`),
      network_id: 1,
      confirmations: 2,
    },
    avax: {
      provider: () =>
        new HDWalletProvider(`${process.env.MNEMONIC}`, `https://api.avax.network/ext/bc/C/rpc`),
      network_id: 1,
      confirmations: 2,
    },
  }
}
