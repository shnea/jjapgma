import {
  Body,
  Controller,
  Delete,
  Inject,
  Module,
  Param,
  Patch,
  Post,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthModule, AuthGuard } from '../auth/auth.module.js';
import type { AuthRequest } from '../auth/auth.service.js';
import { parse, uuid } from '../common/http.js';
import { SharingService } from './sharing.service.js';
import { NotifyService } from './notify.service.js';
const roleInput = z.object({ role: z.enum(['EDITOR', 'VIEWER']) }).strict();
const shareInput = roleInput.extend({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
});
const tokenInput = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict();

@Controller('api')
@UseGuards(AuthGuard)
class SharingController {
  constructor(@Inject(SharingService) private readonly sharing: SharingService) {}
  @Get('projects/:id/sharing') list(@Req() r: AuthRequest, @Param('id') id: string) {
    return this.sharing.list(parse(uuid, id), r.identity.id);
  }
  @Post('projects/:id/sharing') add(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = parse(shareInput, body);
    return this.sharing.add(parse(uuid, id), r.identity.id, input.email, input.role);
  }
  @Patch('projects/:id/members/:userId') memberRole(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: unknown,
  ) {
    return this.sharing.member(
      parse(uuid, id),
      r.identity.id,
      parse(uuid, userId),
      parse(roleInput, body).role,
    );
  }
  @Delete('projects/:id/members/:userId') remove(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.sharing.member(parse(uuid, id), r.identity.id, parse(uuid, userId));
  }
  @Patch('projects/:id/invitations/:invitationId') invitationRole(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
    @Body() body: unknown,
  ) {
    return this.sharing.invitation(
      parse(uuid, id),
      r.identity.id,
      parse(uuid, invitationId),
      parse(roleInput, body).role,
    );
  }
  @Delete('projects/:id/invitations/:invitationId') revoke(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.sharing.invitation(parse(uuid, id), r.identity.id, parse(uuid, invitationId));
  }
  @Post('projects/:id/invitations/:invitationId/retry') retry(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.sharing.deliver(parse(uuid, id), parse(uuid, invitationId), r.identity.id);
  }
  @Post('invitations/preview') preview(@Req() r: AuthRequest, @Body() body: unknown) {
    return this.sharing.accept(parse(tokenInput, body).token, r.identity.id, false);
  }
  @Post('invitations/accept') accept(@Req() r: AuthRequest, @Body() body: unknown) {
    return this.sharing.accept(parse(tokenInput, body).token, r.identity.id, true);
  }
}
@Module({
  imports: [AuthModule],
  controllers: [SharingController],
  providers: [SharingService, NotifyService],
})
export class SharingModule {}
