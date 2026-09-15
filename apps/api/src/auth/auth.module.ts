import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  Inject,
  Injectable,
  Module,
  UseGuards,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, type AuthRequest } from './auth.service.js';
import { OidcService } from './oidc.service.js';
import { config } from '../config.js';
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    request.identity = await this.auth.authenticate(request);
    return true;
  }
}
@Controller()
class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Get('api/auth/config') settings() {
    return { devAuthEnabled: config.bypass };
  }
  @Get('auth/login') login(@Res() response: Response) {
    return this.auth.begin(response);
  }
  @Get('auth/callback') callback(@Req() request: Request, @Res() response: Response) {
    return this.auth.callback(request, response);
  }
  @Get('logout-callback') done(@Res() response: Response) {
    response.redirect('/');
  }
  @Post('api/auth/dev') dev(@Req() request: Request, @Res() response: Response) {
    return this.auth.devLogin(request, response);
  }
  @Get('api/auth/me') @UseGuards(AuthGuard) me(@Req() request: AuthRequest) {
    return request.identity;
  }
  @Post('api/auth/logout') @UseGuards(AuthGuard) logout(
    @Req() request: AuthRequest,
    @Res() response: Response,
  ) {
    return this.auth.logout(request, response);
  }
}
@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, OidcService],
  exports: [AuthGuard, AuthService],
})
export class AuthModule {}
