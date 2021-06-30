const API_URLS = {
  1: 'https://api.etherscan.io/api',
  3: 'https://api-ropsten.etherscan.io/api',
  4: 'https://api-rinkeby.etherscan.io/api',
  5: 'https://api-goerli.etherscan.io/api',
  42: 'https://api-kovan.etherscan.io/api',
  56: 'https://api.bscscan.com/api',
  97: 'https://api-testnet.bscscan.com/api',
  128: 'https://api.hecoinfo.com/api',
  137: 'https://api.polygonscan.com/api',
  250: 'https://api.ftmscan.com/api',
  256: 'https://api-testnet.hecoinfo.com/api',
  80001: 'https://api-testnet.polygonscan.com/api'
}

const EXPLORER_URLS = {
  1: 'https://etherscan.io/address',
  3: 'https://ropsten.etherscan.io/address',
  4: 'https://rinkeby.etherscan.io/address',
  5: 'https://goerli.etherscan.io/address',
  42: 'https://kovan.etherscan.io/address',
  56: 'https://bscscan.com/address',
  97: 'https://testnet.bscscan.com/address',
  128: 'https://hecoinfo.com/address',
  137: 'https://polygonscan.com/address',
  250: 'https://ftmscan.com/address',
  256: 'https://testnet.hecoinfo.com/address',
  80001: 'https://mumbai.polygonscan.com/address'
}

const RequestStatus = {
  OK: '1',
  NOTOK: '0'
}

const VerificationStatus = {
  FAILED: 'Fail - Unable to verify',
  SUCCESS: 'Pass - Verified',
  PENDING: 'Pending in queue',
  ALREADY_VERIFIED: 'Contract source code already verified'
}

const EtherscanLicense = {
  NONE: 1,
  UNLICENSE: 2,
  MIT: 3,
  GPL2: 4,
  'GPL-2.0-ONLY': 4,
  GPL3: 5,
  'GPL-3.0-ONLY': 5,
  'LGPL2.1': 6,
  'LGPL-2.1-ONLY': 6,
  LGPL3: 7,
  'LGPL-3.0-ONLY': 7,
  'BSD-2-CLAUSE': 8,
  'BSD-3-CLAUSE': 9,
  MPL2: 10,
  'MPL-2.0': 10,
  OSL3: 11,
  'OSL-3.0': 11,
  APACHE2: 12,
  'APACHE-2.0': 12,
  AGPL3: 13,
  'AGPL-3.0-ONLY': 13
}

module.exports = {
  API_URLS,
  EXPLORER_URLS,
  RequestStatus,
  VerificationStatus,
  EtherscanLicense
}
