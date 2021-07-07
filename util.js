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
 * @param {string} contractsDir path to the directory containing contract source files.
 * @returns {string} absolute path to the contract source file
 */
const getAbsolutePath = (contractPath, contractsDir) => {
  // Older versions of truffle already used the absolute path
  if (!contractPath.startsWith('project:/')) return contractPath

  // Figure out the project path and use it to construct the absolute path
  const relativeContractPath = contractPath.replace('project:/', '')
  const projectPath = findProjectPath(relativeContractPath, contractsDir)
  const absolutePath = path.join(projectPath, relativeContractPath)

  return absolutePath
}

/**
 * @param {string} relativeContractPath path to a contract file in any format.
 * @param {string} contractsPath path to the directory containing contract source files.
 * @returns {string} project path
 */
const findProjectPath = (relativeContractPath, contractsDir) => {
  for (let currentPath = relativeContractPath; currentPath.length > 0; currentPath = currentPath.slice(0, -1)) {
    if (contractsDir.endsWith(currentPath)) {
      return contractsDir.slice(0, -1 * currentPath.length)
    }
  }
}

module.exports = {
  abort,
  enforce,
  enforceOrThrow,
  normaliseContractPath
}
