/**
 * Centralized logger for Aurora DE (main process).
 *
 * Uses electron-log to write structured logs to a rotating file in userData.
 * - File: userData/logs/aurora-de.log
 * - Console output in dev, file output always
 * - Captures unhandled exceptions & promise rejections
 */
import log from 'electron-log/main'

// File transport: write logs to disk
log.transports.file.level = 'info'
log.transports.file.fileName = 'aurora-de.log'
log.transports.file.maxSize = 5 * 1024 * 1024 // 5 MB

// Console transport: show in dev
log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'warn'

// Capture uncaught errors
log.errorHandler.startCatching()

export default log
