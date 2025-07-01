const logger = require('../lib/logger');

logger.setLogLevel('debug'); // Set log level to debug for detailed output

logger.info('Multi\nline\ntest');
logger.info('Multi\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\nline\ntest');
logger.info('This is an info message');
logger.debug('This is a debug message');
logger.warn('This is a warning message');
logger.error('This is an error message');
