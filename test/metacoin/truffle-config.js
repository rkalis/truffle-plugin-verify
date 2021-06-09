const HDWalletProvider = require('@truffle/hdwallet-provider')
require('dotenv').config()

module.exports = {
  compilers: {
    solc: {
      version: '0.8.0',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: 'byzantium'
      }
    }
  },
  plugins: ['truffle-plugin-verify'],
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY,
    polygonscan: process.env.POLYGONSCAN_API_KEY,
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
    polygon: {
      provider: () => {
        return new HDWalletProvider(`${process.env.MNEMONIC}`, `wss://ws-matic-mainnet.chainstacklabs.com`)
      },
      gas: 0x7a1200,
      network_id: 137,
      skipDryRun: true
    }
  }
}
