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
 * For some reason, the metadata in the Truffle artifact file mangles source paths on Windows.
 * Instead of D:/Hello/World.sol, it looks like /D/Hello/World.sol. When trying to read this path,
 * Windows cannot find it, since it is not a valid path. This function changes /D/Hello/World.sol
 * to D:/Hello/World.sol, and does not change non-Windows paths.
 *
 * @param {string} contractPath path to a contract file.
 * @param {any} logger cliLogger instance.
 * @returns {string} normalised path to the contract.
 */
const normaliseContractPath = (contractPath, logger) => {
  // If the current platform is not Windows, the contract does not need to be changed
  if (process.platform !== 'win32') return contractPath

  // If the contract path doesn't start with '/[A-Z]/' it is not a Windows path
  if (!contractPath.match(/^\/[A-Z]\//i)) return contractPath

  const driveLetter = contractPath.substring(1, 2)
  const normalisedContractPath = `${driveLetter}:/${contractPath.substring(3)}`

  logger.debug(`Normalised contract path from ${contractPath} to ${normalisedContractPath}`)

  return normalisedContractPath
}

module.exports = {
  abort,
  enforce,
  enforceOrThrow,
  normaliseContractPath
}
