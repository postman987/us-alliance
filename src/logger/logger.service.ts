import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logFilePath = path.resolve(process.cwd(), 'logs.txt');

  private writeLog(level: string, message: unknown, context?: string) {
    const timestamp = new Date().toISOString();
    const formattedContext = context ? `[${context}] ` : '';
    const logMessage =
      typeof message === 'object' && message !== null
        ? JSON.stringify(message)
        : String(message);
    const line = `[${timestamp}] [${level}] ${formattedContext}${logMessage}\n`;

    try {
      fs.appendFileSync(this.logFilePath, line, 'utf8');
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }

  log(message: unknown, context?: string) {
    this.writeLog('INFO', message, context);
  }

  error(message: unknown, stack?: string, context?: string) {
    const msg = stack
      ? `${String(message)} - Stack: ${stack}`
      : String(message);
    this.writeLog('ERROR', msg, context);
  }

  warn(message: unknown, context?: string) {
    this.writeLog('WARN', message, context);
  }

  debug(message: unknown, context?: string) {
    this.writeLog('DEBUG', message, context);
  }

  verbose(message: unknown, context?: string) {
    this.writeLog('VERBOSE', message, context);
  }
}
