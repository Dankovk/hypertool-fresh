// Use CLERK_FRONTEND_API_URL as the JWT issuer (or CLERK_JWT_ISSUER if explicitly set)
// Clerk's JWT issuer is the same as the frontend API URL
const rawIssuer = process.env.CLERK_FRONTEND_API_URL 

if (!rawIssuer) {
  throw new Error('Missing CLERK_FRONTEND_API_URL environment variable required for Convex authentication.');
}

const issuer = rawIssuer.replace(/\/$/, '');
// Use CLERK_JWKS_URL if provided, otherwise construct from issuer
const jwksUrl = process.env.CLERK_JWKS_URL ?? `${issuer}/.well-known/jwks.json`;

export default {
  providers: [
    {
      type: 'customJwt',
      issuer,
      algorithm: 'RS256',
      jwks: jwksUrl,
    },
  ],
};