import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const SchoolContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.school || request.headers['x-school-id'];
  },
);
