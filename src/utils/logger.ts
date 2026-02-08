/**
 * Logger Utility
 * 
 * Environment-aware logging that:
 * - Shows debug logs ONLY in development
 * - Always shows warnings and errors
 * - Provides consistent formatting
 * - Supports log levels
 * 
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   
 *   logger.debug('Debug info', { data });  // Dev only
 *   logger.info('Info message');            // Dev only  
 *   logger.warn('Warning!');                 // Always
 *   logger.error('Error!', error);          // Always
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
    enabledInProduction: LogLevel[];
    prefix?: string;
    timestamp?: boolean;
}

const DEFAULT_CONFIG: LoggerConfig = {
    enabledInProduction: ['warn', 'error'], // Only warnings and errors in prod
    timestamp: false // Disable timestamps (browser DevTools already shows them)
};

class Logger {
    private config: LoggerConfig;
    private isDev: boolean;

    constructor(config: Partial<LoggerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.isDev = import.meta.env.DEV;
    }

    /**
     * Check if a log level should be shown
     */
    private shouldLog(level: LogLevel): boolean {
        // In development, show everything
        if (this.isDev) return true;

        // In production, only show configured levels
        return this.config.enabledInProduction.includes(level);
    }

    /**
     * Format log message with optional prefix and timestamp
     */
    private formatMessage(level: LogLevel, message: string): string {
        const parts: string[] = [];

        if (this.config.timestamp) {
            const time = new Date().toISOString();
            parts.push(`[${time}]`);
        }

        if (this.config.prefix) {
            parts.push(`[${this.config.prefix}]`);
        }

        parts.push(message);

        return parts.join(' ');
    }

    /**
     * Debug logging (development only)
     */
    debug(message: string, ...args: any[]): void {
        if (!this.shouldLog('debug')) return;

        const formattedMessage = this.formatMessage('debug', message);
        console.log(formattedMessage, ...args);
    }

    /**
     * Info logging (development only)
     */
    info(message: string, ...args: any[]): void {
        if (!this.shouldLog('info')) return;

        const formattedMessage = this.formatMessage('info', message);
        console.info(formattedMessage, ...args);
    }

    /**
     * Warning logging (always shown)
     */
    warn(message: string, ...args: any[]): void {
        if (!this.shouldLog('warn')) return;

        const formattedMessage = this.formatMessage('warn', message);
        console.warn(formattedMessage, ...args);
    }

    /**
     * Error logging (always shown)
     */
    error(message: string, ...args: any[]): void {
        if (!this.shouldLog('error')) return;

        const formattedMessage = this.formatMessage('error', message);
        console.error(formattedMessage, ...args);
    }

    /**
     * Create a child logger with a prefix
     */
    child(prefix: string): Logger {
        const childPrefix = this.config.prefix
            ? `${this.config.prefix}:${prefix}`
            : prefix;

        return new Logger({
            ...this.config,
            prefix: childPrefix
        });
    }
}

// ============ Default Logger Instance ============

export const logger = new Logger();

// ============ Named Loggers for Different Modules ============

export const permissionsLogger = logger.child('Permissions');
export const authLogger = logger.child('Auth');
export const cacheLogger = logger.child('Cache');
export const supabaseLogger = logger.child('Supabase');
export const rbacLogger = logger.child('RBAC');

// ============ Helper: Replace console.log Globally (Optional) ============

/**
 * Override console.log to use logger.debug
 * ONLY use this if you want to catch ALL console.log calls
 * 
 * Usage in main.tsx:
 *   if (!import.meta.env.DEV) {
 *     replaceConsoleLog();
 *   }
 */
export function replaceConsoleLog(): void {
    const originalLog = console.log;

    console.log = (...args: any[]) => {
        if (import.meta.env.DEV) {
            originalLog(...args);
        }
        // In production, console.log does nothing
    };
}

// ============ Export Default ============

export default logger;
