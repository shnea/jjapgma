import {
  All,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Inject,
  Module,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { AuthGuard, AuthModule } from '../auth/auth.module.js';
import type { AuthRequest } from '../auth/auth.service.js';
import { parse, uuid } from '../common/http.js';
import { config } from '../config.js';
import { PagesModule } from '../pages/pages.module.js';
import { McpAccessService } from './mcp-access.service.js';
import { ProposalsService } from './proposals.service.js';
import { ChatService, chatInput } from './chat.service.js';
import { serveMcp } from './mcp-server.js';
import { UsageService } from './usage.service.js';
@Controller('api')
@UseGuards(AuthGuard)
class AiController {
  constructor(
    @Inject(McpAccessService) readonly access: McpAccessService,
    @Inject(ProposalsService) readonly proposals: ProposalsService,
    @Inject(ChatService) readonly chat: ChatService,
    @Inject(UsageService) readonly usage: UsageService,
  ) {}
  @Get('account/usage') usageList(@Req() r: AuthRequest, @Query('offset') offset: unknown) {
    return this.usage.list(
      r.identity.id,
      parse(z.coerce.number().int().min(0).max(100000).default(0), offset),
    );
  }
  @Get('projects/:projectId/mcp-connections') list(
    @Req() r: AuthRequest,
    @Param('projectId') id: string,
  ) {
    return this.access.list(parse(uuid, id), r.identity.id);
  }
  @Post('projects/:projectId/mcp-connections') async create(
    @Req() r: AuthRequest,
    @Param('projectId') id: string,
    @Body() body: unknown,
  ) {
    const projectId = parse(uuid, id),
      input = parse(
        z
          .object({
            name: z.string().trim().min(1).max(100),
            scope: z.enum(['read', 'write']).default('read'),
            days: z.number().int().min(1).max(365).default(30),
          })
          .strict(),
        body,
      );
    return {
      ...(await this.access.create(projectId, r.identity.id, input)),
      url: `${config.APP_URL}/api/mcp/projects/${projectId}`,
    };
  }
  @Delete('projects/:projectId/mcp-connections/:id') revoke(
    @Req() r: AuthRequest,
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.access.revoke(parse(uuid, projectId), r.identity.id, parse(uuid, id));
  }
  @Get('projects/:projectId/chat') history(@Req() r: AuthRequest, @Param('projectId') id: string) {
    return this.chat.history(parse(uuid, id), r.identity.id);
  }
  @Post('projects/:projectId/chat') send(
    @Req() r: AuthRequest,
    @Param('projectId') id: string,
    @Body() body: unknown,
  ) {
    return this.chat.send(parse(uuid, id), r.identity.id, parse(chatInput, body));
  }
  @Get('projects/:projectId/proposals') proposalsList(
    @Req() r: AuthRequest,
    @Param('projectId') id: string,
  ) {
    return this.proposals.list(parse(uuid, id), r.identity.id);
  }
  @Get('proposals/:id') proposal(@Req() r: AuthRequest, @Param('id') id: string) {
    return this.proposals.get(parse(uuid, id), r.identity.id);
  }
  @Get('proposals/:id/review') review(@Req() r: AuthRequest, @Param('id') id: string) {
    return this.proposals.review(parse(uuid, id), r.identity.id);
  }
  @Post('proposals/:id/apply') apply(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const options = parse(
      z
        .object({
          mode: z.enum(['merge', 'overwrite']).optional(),
          expectedRevision: z.number().int().positive().optional(),
        })
        .strict(),
      body ?? {},
    );
    return this.proposals.apply(parse(uuid, id), r.identity.id, options);
  }
  @Delete('proposals/:id') reject(@Req() r: AuthRequest, @Param('id') id: string) {
    return this.proposals.reject(parse(uuid, id), r.identity.id);
  }
}
@Controller('api/mcp')
class McpController {
  constructor(
    @Inject(McpAccessService) readonly access: McpAccessService,
    @Inject(ProposalsService) readonly proposals: ProposalsService,
  ) {}
  private async handle(req: Request, res: Response, projectId?: string, runId?: string) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.headers.origin && req.headers.origin !== config.APP_URL)
      throw new ForbiddenException('허용되지 않은 출처입니다.');
    if (req.hostname !== new URL(config.APP_URL).hostname)
      throw new ForbiddenException('허용되지 않은 호스트입니다.');
    const header = req.headers.authorization;
    const actor = await this.access.authenticate(
      header?.startsWith('Bearer ') ? header.slice(7) : '',
      projectId,
      runId,
    );
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).end();
    }
    return serveMcp(req, res, actor, this.access, this.proposals);
  }
  @All('n8n/:runId') n8nRun(
    @Req() req: Request,
    @Res() res: Response,
    @Param('runId') runId: string,
  ) {
    return this.handle(req, res, undefined, parse(uuid, runId));
  }
  @All('projects/:projectId') project(
    @Req() req: Request,
    @Res() res: Response,
    @Param('projectId') id: string,
  ) {
    return this.handle(req, res, parse(uuid, id));
  }
}
@Controller('api/ai/usage')
class UsageReportController {
  constructor(@Inject(UsageService) readonly usage: UsageService) {}
  @Post(':id') report(@Req() r: Request, @Param('id') id: string, @Body() body: unknown) {
    const header = r.headers.authorization;
    return this.usage.report(
      parse(uuid, id),
      header?.startsWith('Bearer ') ? header.slice(7) : '',
      body,
    );
  }
}
@Module({
  imports: [AuthModule, PagesModule],
  providers: [McpAccessService, ProposalsService, ChatService, UsageService],
  controllers: [AiController, McpController, UsageReportController],
})
export class AiModule {}
