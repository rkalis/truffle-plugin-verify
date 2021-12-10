const path = require('path')
const { promisify } = require('util')
const { StorageSlot, STORAGE_ZERO } = require('./constants')

const abort = (message, logger = console, code = 1) => {
  logger.error(message)
  process.exit(code)
}

const enforce = (condition, message, logger, code) => {
  if (!condition) abort(message, logger, code)
}

const enforceOrThrow = (condition, message) => {
  if (!condition) throw new Error(message)
}

/**
 * The metadata in the Truffle artifact file changes source paths on Windows. Instead of
 * D:\Hello\World.sol, it looks like /D/Hello/World.sol. When trying to read this path,
 * Windows cannot find it, since it is not a valid path. This function changes
 * /D/Hello/World.sol to D:\Hello\World.sol. This way, Windows is able to read these source
 * files. It does not change regular Unix paths, only Unixified Windows paths. It also does
 * not make any changes on platforms that aren't Windows.
 *
 * @param {string} contractPath path to a contract file in any format.
 * @param {any} options Options object containing the parsed truffle-plugin-verify options
 * @returns {string} path to the contract in Windows format when on Windows, or Unix format otherwise.
 */
const normaliseContractPath = (contractPath, options) => {
  // Replace the 'project:' prefix that was added in Truffle v5.3.14 with the actual project path
  const absolutePath = getAbsolutePath(contractPath, options)

  // If the current platform is not Windows, the path does not need to be changed
  if (process.platform !== 'win32') return absolutePath

  // If the contract path doesn't start with '/[A-Z]/' it is not a Unixified Windows path
  if (!absolutePath.match(/^\/[A-Z]\//i)) return absolutePath

  const driveLetter = absolutePath.substring(1, 2)
  const normalisedContractPath = path.resolve(`${driveLetter}:/${absolutePath.substring(3)}`)

  return normalisedContractPath
}

/**
 * @param {string} contractPath path to a contract file in any format.
 * @param {any} options Options object containing the parsed truffle-plugin-verify options
 * @returns {string} absolute path to the contract source file
 */
const getAbsolutePath = (contractPath, options) => {
  // Older versions of truffle already used the absolute path
  // Also node_modules contracts don't use the project: prefix
  if (!contractPath.startsWith('project:/')) return contractPath

  const relativeContractPath = contractPath.replace('project:/', '')
  const absolutePath = path.join(options.projectDir, relativeContractPath)

  return absolutePath
}

/**
 * If the network config includes a provider we use it to retrieve the chain ID
 * for the network. If that fails, we fall back to the network ID.
 * @param {any} config
 * @param {any} logger
 * @returns {Promise<number>} Chain ID if it could be retrieved, or else network ID
 */
const getChainId = async (config, logger) => {
  const send = getRpcSendFunction(config.provider)

  if (!send) {
    logger.debug('No (valid) provider configured, using network ID in place of chain ID')
    return config.network_id
  }

  try {
    logger.debug('Retrieving network\'s chain ID')

    const result = await send({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'eth_chainId',
      params: []
    })

    const chainId = result && Number.parseInt(result.result, 16)

    // Throw an error that gets caught by the try-catch
    if (!chainId) {
      throw new Error('Could not retrieve chain ID')
    }

    return chainId
  } catch {
    logger.debug('Failed to retrieve chain ID, using network ID instead')
    return config.network_id
  }
}

/**
 * Check whether the address is an EIP1967 proxy and if so, return its implementation
 * address. Note that only the LOGIC variety of EIP1967 is supported, not the BEACON
 * variety. If support for BEACON proxies is added to the openzeppelin plugin,
 * I will add it here as well
 * @param {any | undefined} provider a provider or undefined
 * @param {string} address the address of a potential proxy contract
 * @param {any} logger
 * @returns {Promise<string | undefined>} address of the implementation or undefined if its not a proxy
 */
const getImplementationAddress = async (provider, address, logger) => {
  const send = getRpcSendFunction(provider)

  if (!send) {
    logger.debug('No (valid) provider configured, assuming no proxy')
    return undefined
  }

  const { result } = await send({
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'eth_getStorageAt',
    params: [address, StorageSlot.LOGIC, 'latest']
  })

  if (typeof result === 'string' && result !== STORAGE_ZERO) {
    return getAddressFromStorage(result)
  }

  return undefined
}

/**
 * Get a promisified RPC Send function from a provider
 * @param {any | undefined} provider a provider or undefined
 * @returns {any | undefined} a promisified RPC send function
 */
const getRpcSendFunction = (provider) => (
  provider && provider.sendAsync
    ? promisify(provider.sendAsync.bind(provider))
    : provider && provider.send
      ? promisify(provider.send.bind(provider))
      : undefined
)

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj))

const getAddressFromStorage = (storage) => `0x${storage.slice(12 * 2 + 2)}`

module.exports = {
  abort,
  enforce,
  enforceOrThrow,
  normaliseContractPath,
  getChainId,
  getImplementationAddress,
  deepCopy
}
