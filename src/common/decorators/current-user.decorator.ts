import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '@/modules/user/dto/login.dto';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

