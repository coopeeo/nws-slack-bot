
require('dotenv').config();

let logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

function formatMessage(level, colorsSelected = colors.reset, ...args) {
  if (typeof colorsSelected === 'string') {
    colorsSelected = [colorsSelected];
  }
  const message = args.join(' ');
  const lines = message.split('\n');
  
  if (lines.length === 1) {
    // Single line - no counter needed
    const prefix = `${colorsSelected.join('')}[${level}]:${colors.reset}`;
    return `${prefix} ${lines[0]}`;
  } else {
    // Multi-line - add line counter with padding based on total lines
    const totalLines = lines.length;
    const padLength = totalLines.toString().length;
    return lines.map((line, index) => {
      const lineNumber = (index + 1).toString().padStart(padLength, '0');
      const prefix = `${colorsSelected.join('')}[${level}:${lineNumber}/${totalLines}]:${colors.reset}`;
      return `${prefix} ${line}`;
    }).join('\n');
  }
}

function info(...args) {
  if (logLevel === 'debug' || logLevel === 'info') {
    console.info(formatMessage('INFO', colors.cyan, ...args));
  }
}

function warn(...args) {
  if (logLevel === 'debug' || logLevel === 'info') {
    console.warn(formatMessage('WARN', colors.yellow, ...args));
  }
}

function error(...args) {
  console.error(formatMessage('ERROR', colors.red, ...args));
}

function fatal(...args) {
  console.error(formatMessage('FATAL', [ colors.red, colors.bold ], ...args));
  throw new Error(args.join(' '));
}

function debug(...args) {
  if (logLevel === 'debug') {
    console.log(formatMessage('DEBUG', colors.dim, ...args));
  }
}

function setLogLevel(level = process.env.LOG_LEVEL || 'info') {
  if (!['debug', 'info', 'none'].includes(level.toLowerCase())) {
    fatal(`Invalid log level: ${level}. Valid levels are: debug, info, none.`);
  }
  logLevel = level.toLowerCase();
}

function getLogLevel() {
  return logLevel;
}

module.exports = {
  info,
  log: info,
  error,
  fatal,
  throw: fatal,
  debug,
  warn,
  throwError: fatal,
  setLogLevel,
  getLogLevel,
  colors: Object.freeze(colors),
};
