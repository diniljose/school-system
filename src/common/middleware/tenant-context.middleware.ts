/**
 * Tenant Context Middleware
 * Automatically injects school context from JWT into the request
 * Ensures all queries are scoped to the correct school
 */
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction) {
    // The school context will be set by the JWT strategy after authentication
    // This middleware ensures the schoolId is available in the request
    const user = (req as any).user;
    if (user?.school) {
      (req as any).schoolId = user.school;
    }
    next();
  }
}
