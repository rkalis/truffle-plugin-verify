const path = require('path')

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
 * @returns {string} path to the contract in Windows format when on Windows, or Unix format otherwise.
 */
const normaliseContractPath = (contractPath) => {
  // If the current platform is not Windows, the path does not need to be changed
  if (process.platform !== 'win32') return contractPath

  // If the contract path doesn't start with '/[A-Z]/' it is not a Unixified Windows path
  if (!contractPath.match(/^\/[A-Z]\//i)) return contractPath

  const driveLetter = contractPath.substring(1, 2)
  const normalisedContractPath = path.resolve(`${driveLetter}:/${contractPath.substring(3)}`)

  return normalisedContractPath
}

module.exports = {
  abort,
  enforce,
  enforceOrThrow,
  normaliseContractPath
}
