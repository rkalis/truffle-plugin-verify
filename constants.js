const API_URLS = {
  1: 'https://api.etherscan.io/api',
  3: 'https://api-ropsten.etherscan.io/api',
  4: 'https://api-rinkeby.etherscan.io/api',
  5: 'https://api-goerli.etherscan.io/api',
  42: 'https://api-kovan.etherscan.io/api',
  56: 'https://api.bscscan.com/api',
  97: 'https://api-testnet.bscscan.com/api'
}

const EXPLORER_URLS = {
  1: 'https://etherscan.io/address',
  3: 'https://ropsten.etherscan.io/address',
  4: 'https://rinkeby.etherscan.io/address',
  5: 'https://goerli.etherscan.io/address',
  42: 'https://kovan.etherscan.io/address',
  56: 'https://bscscan.com/address',
  97: 'https://testnet.bscscan.com/address'
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
