import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import { verifyIdToken } from '../../apps/api/dist/auth/id-token.js';
test('OIDC signature and identity validation reject forged, expired and mismatched claims', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const key = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256' };
  const keys = createLocalJWKSet({ keys: [key] });
  const sign = (changes = {}, signer = privateKey) => new SignJWT({ sub: 'user-1', nonce: 'expected-nonce', iss: 'https://login.shnea.kr', aud: 'jjapgma-web', iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + 300, ...changes }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).sign(signer);
  const verify = token => verifyIdToken(token, keys, 'https://login.shnea.kr', 'jjapgma-web', 'expected-nonce');
  assert.equal((await verify(await sign())).sub, 'user-1');
  for (const changes of [{ nonce: 'wrong' }, { iss: 'https://attacker.invalid' }, { aud: 'other-app' }, { exp: 1 }, { sub: '' }, { iat: Math.floor(Date.now()/1000) + 3600 }]) await assert.rejects(() => sign(changes).then(verify));
  const attacker = await generateKeyPair('RS256');
  await assert.rejects(() => sign({}, attacker.privateKey).then(verify));
});
