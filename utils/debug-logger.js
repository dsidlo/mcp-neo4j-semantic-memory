/**
 * Debug logger utility for semantic memory operations
 */
import fs from 'fs';
import path from 'path';

// Constants for logging
const LOG_DIR = process.env.MCP_SEMMEM_LOG_DIR || '/tmp';
const LOG_FILE = 'mcp-semmem-debug.log';
const LOG_PATH = path.join(LOG_DIR, LOG_FILE);

// Check if logging is enabled via environment variable
const isLoggerEnabled = process.env.MCP_SEMMEM_DEBUG !== undefined;

// Determine log level (default to 'info' if set without value)
const logLevel = process.env.MCP_SEMMEM_DEBUG || 'info';

// Log the status of MCP_SEMMEM_DEBUG if it exists
if (isLoggerEnabled) {
  console.error(`MCP_SEMMEM_DEBUG=${logLevel} - Logging enabled at level: ${logLevel}`);
} else {
  console.error('MCP_SEMMEM_DEBUG not set - logging disabled');
}

/**
 * Logs debug information to file if MCP_SEMMEM_DEBUG is set
 * @param {string} functionName - The name of the function being executed
 * @param {Object} data - Data to log
 * @param {string} [type='info'] - Log entry type (info, error, start, end)
 */
export function debugLog(functionName, data, type = 'info') {
  if (!isLoggerEnabled) return;

  try {
    const timestamp = new Date().toISOString();

    // Format the log entry with more readable indentation for objects
    const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
    const logText = `[${timestamp}] [${type.toUpperCase()}] [${functionName}] ${dataStr}\n`;

    // Check again that logger is enabled before writing
    // This ensures we don't write if the env var was removed after module load
    if (process.env.MCP_SEMMEM_DEBUG !== undefined) {
      try {
        // Verify the log directory still exists and is writable
        if (!fs.existsSync(LOG_DIR)) {
          console.error(`Debug log directory ${LOG_DIR} does not exist. Attempting to create...`);
          fs.mkdirSync(LOG_DIR, { recursive: true });
        }

        // Append to log file
        fs.appendFileSync(LOG_PATH, logText);
      } catch (fsError) {
        // If we can't write to the log file, just output to console and mention the issue
        console.error(`Unable to write to debug log file: ${fsError.message}`);
      }

      // Always log to console for better visibility
      const consoleMsg = `[DEBUG][${type.toUpperCase()}][${functionName}] ${typeof data === 'object' ? JSON.stringify(data) : data}`;
      console.error(consoleMsg);
    }
  } catch (error) {
    // Don't crash if logging fails
    console.error(`Debug logging error: ${error.message}`);
  }
}

/**
 * Logs the start of a function execution
 * @param {string} functionName - The name of the function being executed
 * @param {Object} [params={}] - Function parameters
 */
export function logFunctionStart(functionName, params = {}) {
  if (!isLoggerEnabled) return;
  debugLog(functionName, { params }, 'start');
}

/**
 * Logs the end of a function execution
 * @param {string} functionName - The name of the function being executed
 * @param {Object} [result={}] - Function result
 */
export function logFunctionEnd(functionName, result = {}) {
  if (!isLoggerEnabled) return;
  debugLog(functionName, { result }, 'end');
}

/**
 * Logs an error that occurred during function execution
 * @param {string} functionName - The name of the function being executed
 * @param {Error} error - The error that occurred
 */
export function logFunctionError(functionName, error) {
  if (!isLoggerEnabled) return;
  debugLog(functionName, { message: error.message, stack: error.stack }, 'error');
}

/**
 * Wraps a function with debug logging
 * @param {Function} fn - The function to wrap
 * @param {string} functionName - The name of the function
 * @returns {Function} - The wrapped function
 */
export function withDebugLogging(fn, functionName) {
  if (!isLoggerEnabled) return fn;

  return async function(...args) {
    logFunctionStart(functionName, args);
    try {
      const result = await fn.apply(this, args);
      logFunctionEnd(functionName, result);
      return result;
    } catch (error) {
      logFunctionError(functionName, error);
      throw error;
    }
  };
}

// Initialize the log file only if logging is enabled
if (isLoggerEnabled) {
  try {
    // Ensure the log directory exists
    if (!fs.existsSync(LOG_DIR)) {
      try {
        fs.mkdirSync(LOG_DIR, { recursive: true });
      } catch (dirError) {
        throw new Error(`Cannot create log directory ${LOG_DIR}: ${dirError.message}`);
      }
    }

    // Check if directory is writable
    try {
      fs.accessSync(LOG_DIR, fs.constants.W_OK);
    } catch (accessError) {
      throw new Error(`Log directory ${LOG_DIR} is not writable: ${accessError.message}`);
    }

    // Create or clear the log file
    const startMessage = `MCP Semantic Memory Log Started: ${new Date().toISOString()}\n` +
                        `Log Level: ${logLevel}\n` +
                        `Log Location: ${LOG_PATH}\n` +
                        '--------------------------------------------------\n';

    try {
      fs.writeFileSync(LOG_PATH, startMessage);
    } catch (fileError) {
      throw new Error(`Cannot write to log file ${LOG_PATH}: ${fileError.message}`);
    }

    // Make initialization more visible with clear console messages
    console.error('=======================================================');
    console.error(`MCP_SEMMEM_DEBUG ENABLED - Level: ${logLevel}`);
    console.error(`Logs writing to: ${LOG_PATH}`);
    console.error('=======================================================');

    // Log a test message to verify logging is working
    debugLog('debug-logger', { status: 'initialized', logPath: LOG_PATH }, 'init');

  } catch (error) {
    console.error(`Failed to initialize log: ${error.message}`);
  }
}
