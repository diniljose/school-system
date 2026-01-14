import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, body } = request;
    const userAgent = request.headers['user-agent'] || '';
    const userId = request.user?.id || 'anonymous';

    const startTime = Date.now();

    this.logger.log(
      `Incoming Request: ${method} ${url} - User: ${userId} - IP: ${ip} - UserAgent: ${userAgent}`,
    );

    if (method !== 'GET' && body && Object.keys(body).length > 0) {
      const sanitizedBody = this.sanitizeBody(body);
      this.logger.debug(`Request Body: ${JSON.stringify(sanitizedBody)}`);
    }

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const duration = Date.now() - startTime;

          this.logger.log(
            `Outgoing Response: ${method} ${url} - Status: ${statusCode} - Duration: ${duration}ms - User: ${userId}`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;

          this.logger.error(
            `Request Failed: ${method} ${url} - Duration: ${duration}ms - User: ${userId} - Error: ${error.message}`,
            error.stack,
          );
        },
      }),
    );
  }

  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    const sensitiveFields = [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'apiKey',
    ];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    return sanitized;
  }
}
