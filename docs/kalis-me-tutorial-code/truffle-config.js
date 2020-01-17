const HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config();

module.exports = {
  networks: {
    rinkeby: {
      provider: function() {
        return new HDWalletProvider(`${process.env.MNEMONIC}`, `https://rinkeby.infura.io/v3/${process.env.INFURA_ID}`)
      },
      network_id: 4
    }
  },
  plugins: [
    'truffle-plugin-verify'
  ],
  verify: {
    preamble: 'Hello world!\nThis is an example preamble at the top of the verified source code!\nIt is compatible with multiline strings.'
  },
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY
  }
};
