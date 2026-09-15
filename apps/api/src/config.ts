import { z } from 'zod';
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  APP_URL: z.url(),
  DATABASE_URL: z.string().min(1),
  DEV_AUTH_BYPASS: z.enum(['true', 'false']).default('false'),
  OIDC_CLIENT_ID: z.string().default('jjapgma-web'),
  OIDC_CLIENT_SECRET: z.string().default(''),
  OIDC_SCOPE: z.string().default('openid profile basic offline_access'),
  REFRESH_TOKEN_ENCRYPTION_KEY: z.string().default(''),
  FILE_SERVICE_BASE_URL: z.url().default('https://file.shnea.kr'),
  FILE_SERVICE_BEARER_TOKEN: z.string().default(''),
  UPLOAD_MAX_BYTES: z.coerce.number().int().min(1).max(10485760).default(10485760),
});
export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const c = envSchema.parse(env);
  const url = new URL(c.APP_URL);
  const fileUrl = new URL(c.FILE_SERVICE_BASE_URL);
  if (
    fileUrl.username ||
    fileUrl.password ||
    fileUrl.search ||
    fileUrl.hash ||
    fileUrl.pathname !== '/' ||
    !['http:', 'https:'].includes(fileUrl.protocol) ||
    (c.NODE_ENV === 'production' && fileUrl.origin !== 'https://file.shnea.kr')
  )
    throw new Error('FILE_SERVICE_BASE_URL must be the file-service origin.');
  if (url.pathname !== '/' || url.search || url.hash || url.username || url.password)
    throw new Error('APP_URL must be an origin.');
  if (c.NODE_ENV === 'production' && (c.DEV_AUTH_BYPASS === 'true' || url.protocol !== 'https:'))
    throw new Error('Production requires HTTPS and OIDC.');
  if (
    c.DEV_AUTH_BYPASS === 'false' &&
    (!c.OIDC_CLIENT_SECRET || !/^[0-9a-f]{64}$/i.test(c.REFRESH_TOKEN_ENCRYPTION_KEY))
  )
    throw new Error(
      'OIDC_CLIENT_SECRET and a 32-byte hex REFRESH_TOKEN_ENCRYPTION_KEY are required.',
    );
  return {
    ...c,
    APP_URL: url.origin,
    FILE_SERVICE_BASE_URL: fileUrl.origin,
    issuer: 'https://login.shnea.kr',
    bypass: c.DEV_AUTH_BYPASS === 'true',
  };
}
export const config = readConfig();
