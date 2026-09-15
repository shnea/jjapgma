import { jwtVerify, type JWTVerifyGetKey } from 'jose';
export async function verifyIdToken(token: string, keys: JWTVerifyGetKey, issuer: string, audience: string, nonce?: string) {
  const { payload } = await jwtVerify(token, keys, {
    issuer, audience, algorithms: ['RS256', 'ES256'],
    requiredClaims: ['exp', 'iat', 'sub'], clockTolerance: 5,
  });
  if (!payload.sub || !payload.iat || payload.iat > Date.now() / 1000 + 30 || (nonce && payload.nonce !== nonce)) throw new Error('Invalid identity');
  return payload;
}
