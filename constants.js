const API_URLS = {
  1: 'https://api.etherscan.io/api',
  3: 'https://api-ropsten.etherscan.io/api',
  4: 'https://api-rinkeby.etherscan.io/api',
  5: 'https://api-goerli.etherscan.io/api',
  10: 'https://api-optimistic.etherscan.io/api',
  42: 'https://api-kovan.etherscan.io/api',
  56: 'https://api.bscscan.com/api',
  97: 'https://api-testnet.bscscan.com/api',
  128: 'https://api.hecoinfo.com/api',
  137: 'https://api.polygonscan.com/api',
  250: 'https://api.ftmscan.com/api',
  256: 'https://api-testnet.hecoinfo.com/api',
  4002: 'https://api-testnet.ftmscan.com/api',
  42161: 'https://api.arbiscan.io/api',
  421611: 'https://api-testnet.arbiscan.io/api',
  80001: 'https://api-testnet.polygonscan.com/api'
}

const EXPLORER_URLS = {
  1: 'https://etherscan.io/address',
  3: 'https://ropsten.etherscan.io/address',
  4: 'https://rinkeby.etherscan.io/address',
  5: 'https://goerli.etherscan.io/address',
  10: 'https://optimistic.etherscan.io/address',
  42: 'https://kovan.etherscan.io/address',
  56: 'https://bscscan.com/address',
  97: 'https://testnet.bscscan.com/address',
  128: 'https://hecoinfo.com/address',
  137: 'https://polygonscan.com/address',
  250: 'https://ftmscan.com/address',
  256: 'https://testnet.hecoinfo.com/address',
  4002: 'https://testnet.ftmscan.com/address',
  42161: 'https://arbiscan.io/address',
  421611: 'https://testnet.arbiscan.io/address',
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

module.exports = {
  API_URLS,
  EXPLORER_URLS,
  RequestStatus,
  VerificationStatus
}
