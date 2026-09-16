import { z } from 'zod';

// login-service guarantees ownership of supplied email addresses. Explicitly
// unverified claims are never eligible for email-based sharing.
export function identityEmail(claims: { email?: unknown; email_verified?: unknown }) {
  if (claims.email_verified === false || typeof claims.email !== 'string') return null;
  const email = claims.email.trim().toLowerCase();
  return email.length <= 254 && z.email().safeParse(email).success ? email : null;
}
