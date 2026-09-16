import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Module,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, AuthModule } from '../auth/auth.module.js';
import type { AuthRequest } from '../auth/auth.service.js';
import { parse, uuid } from '../common/http.js';
import { TemplatesService } from './templates.service.js';

@Controller('api/templates')
@UseGuards(AuthGuard)
class TemplatesController {
  constructor(@Inject(TemplatesService) private readonly templates: TemplatesService) {}
  @Get() list(@Req() r: AuthRequest) {
    return this.templates.list(r.identity.id);
  }
  @Get(':id') get(@Req() r: AuthRequest, @Param('id') id: string) {
    return this.templates.get(parse(uuid, id), r.identity.id);
  }
  @Post() save(@Req() r: AuthRequest, @Body() body: unknown) {
    return this.templates.save(
      r.identity.id,
      parse(
        z
          .object({
            name: z.string().trim().min(1).max(100),
            sourcePageId: uuid,
            spec: z.unknown(),
          })
          .strict(),
        body,
      ),
    );
  }
  @Post(':id/use') use(@Req() r: AuthRequest, @Param('id') id: string, @Body() body: unknown) {
    const input = parse(z.object({ projectId: uuid }).strict(), body);
    return this.templates.use(parse(uuid, id), r.identity.id, input.projectId);
  }
  @Delete(':id') delete(@Req() r: AuthRequest, @Param('id') id: string) {
    return this.templates.delete(parse(uuid, id), r.identity.id);
  }
}
@Module({
  imports: [AuthModule],
  controllers: [TemplatesController],
  providers: [TemplatesService],
})
export class TemplatesModule {}
