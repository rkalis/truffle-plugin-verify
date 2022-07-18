const HDWalletProvider = require('@truffle/hdwallet-provider')
require('dotenv').config()

module.exports = {
  compilers: {
    solc: {
      version: '0.8.9',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
      }
    }
  },
  plugins: ['truffle-plugin-verify'],
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY,
    polygonscan: process.env.POLYGONSCAN_API_KEY,
    snowtrace: process.env.SNOWTRACE_API_KEY,
    bttcscan: process.env.BTTCSCAN_API_KEY,
    aurorascan: process.env.AURORASCAN_API_KEY
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
    'goerli-custom': {
      provider: () => {
        return new HDWalletProvider(`${process.env.MNEMONIC}`, `wss://goerli.infura.io/ws/v3/${process.env.INFURA_ID}`)
      },
      gas: 0x7a1200,
      network_id: 5,
      skipDryRun: true,
      verify: {
        apiUrl: 'https://api-goerli.etherscan.io/api',
        apiKey: process.env.ETHERSCAN_API_KEY
      }
    },
    polygon: {
      provider: () => {
        return new HDWalletProvider(`${process.env.MNEMONIC}`, `wss://ws-matic-mainnet.chainstacklabs.com`)
      },
      gas: 0x7a1200,
      network_id: 137,
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
    bttc: {
      provider: () =>
        new HDWalletProvider(`${process.env.MNEMONIC}`, `https://rpc.bt.io`),
      network_id: 199,
      confirmations: 2,
    },
    donau: {
      provider: () =>
        new HDWalletProvider(`${process.env.MNEMONIC}`, `https://pre-rpc.bt.io/`),
      network_id: 1029,
      confirmations: 2,
      gasPrice: 300000000000000
    },
    aurora_mainnet: {
      provider: () =>
        new HDWalletProvider(`${process.env.MNEMONIC}`, `wss://mainnet.aurora.dev`),
      network_id: 1313161554,
      confirmations: 4,
      gasPrice: 0
    },
    aurora_testnet: {
      provider: () =>
        new HDWalletProvider(`${process.env.MNEMONIC}`, `wss://testnet.aurora.dev`),
      network_id: 1313161555,
      confirmations: 4,
      gasPrice: 0
    }
  }
}
