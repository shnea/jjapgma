import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Module,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, AuthModule } from '../auth/auth.module.js';
import type { AuthRequest } from '../auth/auth.service.js';
import { parse, uuid } from '../common/http.js';
import { PagesService } from './pages.service.js';
const name = z.string().trim().min(1).max(100);
@Controller('api')
@UseGuards(AuthGuard)
class PagesController {
  constructor(@Inject(PagesService) private readonly pages: PagesService) {}
  @Get('projects/:projectId/pages') list(@Req() r: AuthRequest, @Param('projectId') id: string) {
    return this.pages.list(parse(uuid, id), r.identity.id);
  }
  @Post('projects/:projectId/pages') create(
    @Req() r: AuthRequest,
    @Param('projectId') id: string,
    @Body() body: unknown,
  ) {
    const input = parse(
      z.object({ name, templateId: z.string().min(1).max(60).optional() }).strict(),
      body,
    );
    return this.pages.create(parse(uuid, id), r.identity.id, input.name, input.templateId);
  }
  @Get('pages/:pageId') get(@Req() r: AuthRequest, @Param('pageId') id: string) {
    return this.pages.get(parse(uuid, id), r.identity.id);
  }
  @Put('pages/:pageId') save(
    @Req() r: AuthRequest,
    @Param('pageId') id: string,
    @Body() body: unknown,
  ) {
    return this.pages.save(
      parse(uuid, id),
      r.identity.id,
      parse(
        z.object({ name, baseRevision: z.number().int().min(1), spec: z.unknown() }).strict(),
        body,
      ),
    );
  }
  @Get('pages/:pageId/revisions') listRevisions(
    @Req() r: AuthRequest,
    @Param('pageId') id: string,
    @Query('before') before?: string,
  ) {
    return this.pages.listRevisions(
      parse(uuid, id),
      r.identity.id,
      before === undefined ? undefined : parse(z.coerce.number().int().positive(), before),
    );
  }
  @Get('projects/:projectId/deleted-pages') trash(
    @Req() r: AuthRequest,
    @Param('projectId') id: string,
  ) {
    return this.pages.trash(parse(uuid, id), r.identity.id);
  }
  @Post('pages/:pageId/restore') restore(
    @Req() r: AuthRequest,
    @Param('pageId') id: string,
    @Body() body: unknown,
  ) {
    const input = parse(
      z
        .object({
          baseRevision: z.number().int().positive(),
          revision: z.number().int().positive(),
        })
        .strict(),
      body,
    );
    return this.pages.restore(parse(uuid, id), r.identity.id, input.baseRevision, input.revision);
  }
  @Delete('pages/:pageId') delete(
    @Req() r: AuthRequest,
    @Param('pageId') id: string,
    @Body() body: unknown,
  ) {
    const input = parse(z.object({ baseRevision: z.number().int().min(1) }).strict(), body);
    return this.pages.delete(parse(uuid, id), r.identity.id, input.baseRevision);
  }
  @Get('pages/:pageId/revisions/:revision') getRevision(
    @Req() r: AuthRequest,
    @Param('pageId') id: string,
    @Param('revision') rev: string,
  ) {
    const revisionNumber = parse(z.coerce.number().int().min(1), rev);
    return this.pages.getRevision(parse(uuid, id), r.identity.id, revisionNumber);
  }
}
@Module({
  imports: [AuthModule],
  providers: [PagesService],
  controllers: [PagesController],
  exports: [PagesService],
})
export class PagesModule {}
