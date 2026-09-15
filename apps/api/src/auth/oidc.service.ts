import { Injectable, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { createRemoteJWKSet } from 'jose';
import { verifyIdToken } from './id-token.js';
import { config } from '../config.js';
export type Tokens = {
  id_token?: string;
  refresh_token?: string;
  access_token: string;
  expires_in: number;
};
@Injectable()
export class OidcService {
  private readonly keys = createRemoteJWKSet(new URL('/jwks', config.issuer), {
    timeoutDuration: 8000,
  });
  async exchange(parameters: Record<string, string>): Promise<Tokens> {
    let response: Response;
    try {
      response = await fetch(`${config.issuer}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parameters,
          client_id: config.OIDC_CLIENT_ID,
          client_secret: config.OIDC_CLIENT_SECRET,
        }),
        signal: AbortSignal.timeout(10000),
        redirect: 'error',
      });
    } catch {
      throw new ServiceUnavailableException('인증 서비스에 연결할 수 없습니다.');
    }
    if (!response.ok)
      throw new UnauthorizedException('로그인이 만료되었습니다. 다시 로그인해 주세요.');
    const data = (await response.json()) as Tokens;
    if (!data.access_token || !Number.isFinite(data.expires_in) || data.expires_in <= 0)
      throw new UnauthorizedException('인증 응답을 확인할 수 없습니다.');
    return data;
  }
  async identity(token: string, nonce?: string) {
    try {
      return await verifyIdToken(token, this.keys, config.issuer, config.OIDC_CLIENT_ID, nonce);
    } catch {
      throw new UnauthorizedException('인증 정보를 확인할 수 없습니다.');
    }
  }
  async revoke(refreshToken: string) {
    try {
      await fetch(`${config.issuer}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: refreshToken,
          token_type_hint: 'refresh_token',
          client_id: config.OIDC_CLIENT_ID,
          client_secret: config.OIDC_CLIENT_SECRET,
        }),
        signal: AbortSignal.timeout(8000),
        redirect: 'error',
      });
    } catch {
      console.warn(JSON.stringify({ event: 'oidc_revocation_unavailable' }));
    }
  }
}
