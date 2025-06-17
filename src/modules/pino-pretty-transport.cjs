module.exports = opts => require('pino-pretty')({
  ...opts,
  messageFormat: (log, messageKey) => `${log[messageKey]}`
})