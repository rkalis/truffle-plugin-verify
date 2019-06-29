const abort = (message, code = 1) => {
  console.error(message)
  process.exit(code)
}

const enforce = (condition, message, code) => {
  if (!condition) abort(message, code)
}

const enforceOrThrow = (condition, message) => {
  if (!condition) throw new Error(message)
}

module.exports = {
  abort,
  enforce,
  enforceOrThrow
}
