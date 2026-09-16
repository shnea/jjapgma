import { Inject, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID, createHash } from 'node:crypto';
import { Database } from '../database/database.js';
import { config } from '../config.js';
import { hash, randomToken, encrypt, decrypt } from './crypto.js';
import { OidcService, type Tokens } from './oidc.service.js';
import { claimAutoShares, lockEmail } from '../sharing/claim.js';
export type Identity = {
  id: string;
  displayName: string;
  nickname: string | null;
  email: string | null;
  csrfToken: string;
};
export type AuthRequest = Request & { identity: Identity };
export function cookie(request: Request, name: string) {
  return (
    request.headers.cookie
      ?.split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${name}=`))
      ?.slice(name.length + 1) ?? ''
  );
}
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: config.APP_URL.startsWith('https:'),
  path: '/',
};
@Injectable()
export class AuthService {
  constructor(
    @Inject(Database) private readonly db: Database,
    @Inject(OidcService) private readonly oidc: OidcService,
  ) {}
  async begin(response: Response) {
    const state = randomToken();
    const nonce = randomToken();
    const verifier = randomToken();
    await this.db.pool.query('DELETE FROM login_attempts WHERE expires_at < now()');
    await this.db.pool.query(
      "INSERT INTO login_attempts VALUES($1,$2,$3,now()+interval '10 minutes')",
      [hash(state), nonce, verifier],
    );
    response.cookie('jjapgma_login', state, { ...cookieOptions, maxAge: 600000 });
    const url = new URL('/authorize', config.issuer);
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: config.OIDC_CLIENT_ID,
      redirect_uri: `${config.APP_URL}/auth/callback`,
      scope: config.OIDC_SCOPE,
      state,
      nonce,
      code_challenge: createHash('sha256').update(verifier).digest('base64url'),
      code_challenge_method: 'S256',
    }).toString();
    response.redirect(url.toString());
  }
  async callback(request: Request, response: Response) {
    const { state, code } = request.query;
    response.clearCookie('jjapgma_login', cookieOptions);
    if (
      typeof state !== 'string' ||
      typeof code !== 'string' ||
      state !== cookie(request, 'jjapgma_login') ||
      request.query.error
    )
      throw new UnauthorizedException('로그인 요청을 확인할 수 없습니다.');
    const attempt = await this.db.pool.query(
      'DELETE FROM login_attempts WHERE state_hash=$1 AND expires_at>now() RETURNING nonce,verifier',
      [hash(state)],
    );
    if (!attempt.rowCount) throw new UnauthorizedException('로그인 요청이 만료되었습니다.');
    const tokens = await this.oidc.exchange({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${config.APP_URL}/auth/callback`,
      code_verifier: attempt.rows[0].verifier,
    });
    if (!tokens.id_token) throw new UnauthorizedException('ID 토큰이 없습니다.');
    const claims = await this.oidc.identity(tokens.id_token, attempt.rows[0].nonce);
    const email = await this.oidc.email(tokens, claims);
    const user = await this.user(
      config.issuer,
      claims.sub!,
      typeof claims.name === 'string' ? claims.name.slice(0, 100) : '새 사용자',
      email,
    );
    await this.createSession(user.id, response, tokens);
    response.redirect('/');
  }
  private async user(issuer: string, subject: string, name: string, email: string | null = null) {
    return this.db.transaction(async (client) => {
      if (email) await lockEmail(client, email);
      const result = await client.query(
        'INSERT INTO users(id,issuer,subject,display_name,email) VALUES($1,$2,$3,$4,$5) ON CONFLICT(issuer,subject) DO UPDATE SET display_name=EXCLUDED.display_name,email=EXCLUDED.email RETURNING id',
        [randomUUID(), issuer, subject, email ? email.split('@')[0] : name, email],
      );
      await claimAutoShares(client, result.rows[0].id);
      return result.rows[0];
    });
  }
  async devLogin(request: Request, response: Response) {
    if (!config.bypass || config.NODE_ENV === 'production') throw new ForbiddenException();
    this.checkOrigin(request);
    const user = await this.user('jjapgma:development', 'developer', '개발자');
    await this.createSession(user.id, response);
    response.json({ ok: true });
  }
  async createSession(userId: string, response: Response, tokens?: Tokens) {
    const token = randomToken();
    await this.db.pool.query('DELETE FROM sessions WHERE expires_at < now()');
    await this.db.pool.query(
      "INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at,refresh_token,access_expires_at) VALUES($1,$2,$3,now()+interval '7 days',$4,$5)",
      [
        hash(token),
        userId,
        randomToken(),
        tokens?.refresh_token ? encrypt(tokens.refresh_token) : null,
        tokens ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      ],
    );
    response.cookie('jjapgma_session', token, { ...cookieOptions, maxAge: 7 * 86400000 });
  }
  checkOrigin(request: Request) {
    if (request.headers.origin !== config.APP_URL)
      throw new ForbiddenException('허용되지 않은 요청 출처입니다.');
  }
  async authenticate(request: Request): Promise<Identity> {
    const token = cookie(request, 'jjapgma_session');
    if (!token) throw new UnauthorizedException('로그인이 필요합니다.');
    const identity = await this.db.transaction(async (client) => {
      const result = await client.query(
        'SELECT s.*, u.display_name,u.nickname,u.email,u.issuer,u.subject FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=$1 AND expires_at>now() FOR UPDATE OF s',
        [hash(token)],
      );
      const session = result.rows[0];
      if (!session) return null;
      if (session.issuer === 'jjapgma:development' && !config.bypass) {
        await client.query('DELETE FROM sessions WHERE token_hash=$1', [hash(token)]);
        return null;
      }
      if (
        session.access_expires_at &&
        new Date(session.access_expires_at).getTime() < Date.now() + 30000
      ) {
        try {
          if (!session.refresh_token) throw new Error('No refresh token');
          const tokens = await this.oidc.exchange({
            grant_type: 'refresh_token',
            refresh_token: decrypt(session.refresh_token),
          });
          let emailClaims: { sub: string; [key: string]: unknown } = { sub: session.subject };
          if (tokens.id_token) {
            const claims = await this.oidc.identity(tokens.id_token);
            if (claims.sub !== session.subject) throw new Error('Subject mismatch');
            emailClaims = { ...claims, sub: claims.sub! };
          }
          const email = await this.oidc.email(tokens, emailClaims);
          if (email) await lockEmail(client, email);
          await client.query(
            'UPDATE users SET email=$2,display_name=COALESCE($3,display_name) WHERE id=$1',
            [session.user_id, email, email ? email.split('@')[0] : null],
          );
          session.email = email;
          if (email) session.display_name = email.split('@')[0];
          await client.query(
            'UPDATE sessions SET refresh_token=$2,access_expires_at=$3 WHERE token_hash=$1',
            [
              hash(token),
              tokens.refresh_token ? encrypt(tokens.refresh_token) : session.refresh_token,
              new Date(Date.now() + tokens.expires_in * 1000),
            ],
          );
        } catch {
          await client.query('DELETE FROM sessions WHERE token_hash=$1', [hash(token)]);
          return null;
        }
      }
      return {
        id: session.user_id,
        displayName: session.nickname ?? session.display_name,
        nickname: session.nickname,
        email: session.email,
        csrfToken: session.csrf_token,
      };
    });
    if (!identity) throw new UnauthorizedException('세션이 만료되었습니다. 다시 로그인해 주세요.');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      this.checkOrigin(request);
      if (request.headers['x-csrf-token'] !== identity.csrfToken)
        throw new ForbiddenException('요청을 확인할 수 없습니다. 새로고침 후 다시 시도해 주세요.');
    }
    return identity;
  }
  async updateNickname(userId: string, nickname: string | null) {
    const result = await this.db.pool.query(
      'UPDATE users SET nickname=$2 WHERE id=$1 RETURNING nickname,COALESCE(nickname,display_name) AS "displayName"',
      [userId, nickname],
    );
    return result.rows[0];
  }
  async logout(request: Request, response: Response) {
    const removed = await this.db.pool.query(
      'DELETE FROM sessions WHERE token_hash=$1 RETURNING refresh_token',
      [hash(cookie(request, 'jjapgma_session'))],
    );
    response.clearCookie('jjapgma_session', cookieOptions);
    if (removed.rows[0]?.refresh_token)
      await this.oidc.revoke(decrypt(removed.rows[0].refresh_token));
    const url = new URL('/logout', config.issuer);
    url.searchParams.set('redirect', `${config.APP_URL}/logout-callback`);
    response.json({ redirect: config.bypass ? '/' : url.toString() });
  }
}
