const API_URLS = {
  1: 'https://api.etherscan.io/api',
  3: 'https://api-ropsten.etherscan.io/api',
  4: 'https://api-rinkeby.etherscan.io/api',
  5: 'https://api-goerli.etherscan.io/api',
  10: 'https://api-optimistic.etherscan.io/api',
  42: 'https://api-kovan.etherscan.io/api',
  56: 'https://api.bscscan.com/api',
  69: 'https://api-kovan-optimistic.etherscan.io/api',
  97: 'https://api-testnet.bscscan.com/api',
  128: 'https://api.hecoinfo.com/api',
  137: 'https://api.polygonscan.com/api',
  250: 'https://api.ftmscan.com/api',
  256: 'https://api-testnet.hecoinfo.com/api',
  1285: 'https://api-moonriver.moonscan.io/api',
  4002: 'https://api-testnet.ftmscan.com/api',
  42161: 'https://api.arbiscan.io/api',
  43113: 'https://api-testnet.snowtrace.io/api',
  43114: 'https://api.snowtrace.io/api',
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
  69: 'https://kovan-optimistic.etherscan.io/address',
  97: 'https://testnet.bscscan.com/address',
  128: 'https://hecoinfo.com/address',
  137: 'https://polygonscan.com/address',
  250: 'https://ftmscan.com/address',
  256: 'https://testnet.hecoinfo.com/address',
  1285: 'https://moonriver.moonscan.io/address',
  4002: 'https://testnet.ftmscan.com/address',
  42161: 'https://arbiscan.io/address',
  43113: 'https://testnet.snowtrace.io/address',
  43114: 'https://snowtrace.io/address',
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
  ALREADY_VERIFIED: 'Contract source code already verified',
  AUTOMATICALLY_VERIFIED: 'Already Verified'
}

const StorageSlot = {
  LOGIC: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
  BEACON: '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50'
}

const STORAGE_ZERO = '0x0000000000000000000000000000000000000000000000000000000000000000'

module.exports = {
  API_URLS,
  EXPLORER_URLS,
  RequestStatus,
  VerificationStatus,
  StorageSlot,
  STORAGE_ZERO
}
