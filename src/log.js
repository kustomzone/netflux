const Level = {
  TRACE: 1,
  DEBUG: 2,
  INFO: 3,
  WARN: 4,
  ERROR: 5
}

const logLevel = LOG_LEVEL

export const trace = logLevel <= Level.TRACE
? (msg, ...rest) => {
  console.trace(`TRACE| ${msg}`, ...rest)
}
: () => {}

export const debug = logLevel <= Level.DEBUG
? (msg, ...rest) => {
  console.group(`DEBUG| ${msg}`)
  rest.forEach(param => logRecursive(param))
  console.groupEnd()
}
: () => {}

export const info = logLevel <= Level.INFO
? (msg, ...rest) => {
  console.info(`INFO | ${msg}`, ...rest)
}
: () => {}

export const warn = logLevel <= Level.WARN
? (msg, ...rest) => {
  console.warn(`WARN | ${msg}`, ...rest)
}
: () => {}

export const error = logLevel <= Level.ERROR
? (msg, ...rest) => {
  console.error(`ERROR| ${msg}`, ...rest)
}
: () => {}

function logObject (obj) {
  for (let prop in obj) {
    console.log(`${prop} = `, obj[prop])
  }
}

function logRecursive (obj) {
  if (typeof obj === 'object') {
    if ('forEach' in obj) {
      obj.forEach((value, index) => {
        console.groupCollapsed(`${index} ${value.constructor.name}`)
        logRecursive(value)
        console.groupEnd()
      })
    } else {
      logObject(obj)
    }
  } else {
    console.log(obj)
  }
}
