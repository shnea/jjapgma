import {
  BadRequestException,
  Catch,
  HttpException,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { z } from 'zod';
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new BadRequestException('입력값을 확인해 주세요.');
  return result.data;
}
export const uuid = z.uuid();
@Catch()
export class SafeErrors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const message = error instanceof HttpException ? error.message : '요청을 처리하지 못했습니다.';
    if (status >= 500)
      console.error(
        JSON.stringify({
          event: 'request_failed',
          type: error instanceof Error ? error.constructor.name : 'Unknown',
        }),
      );
    response.status(status).json({ statusCode: status, message });
  }
}
