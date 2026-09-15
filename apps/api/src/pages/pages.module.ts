import {
  Body,
  Controller,
  Get,
  Inject,
  Module,
  Param,
  Post,
  Put,
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
    return this.pages.create(
      parse(uuid, id),
      r.identity.id,
      parse(z.object({ name }).strict(), body).name,
    );
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
  ) {
    return this.pages.listRevisions(parse(uuid, id), r.identity.id);
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
@Module({ imports: [AuthModule], providers: [PagesService], controllers: [PagesController] })
export class PagesModule {}
