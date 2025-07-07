// This file contains shared server-side utilities for passkey authentication.

// The OIDC_ISSUER environment variable is the single source of truth for the application's public URL.
// In local development, it can be omitted and will default to http://localhost:9002.
// In production or cloud IDEs, it MUST be set to the public URL (e.g., https://myapp.com).
const issuer = process.env.OIDC_ISSUER || 'http://localhost:9002';

const url = new URL(issuer);

// The Relying Party ID is your website's domain name.
// It must not include a scheme or port.
export const rpID = url.hostname;

// The origin is where the passkey ceremony is initiated from.
// It must include the scheme and port.
export const expectedOrigin = url.origin;
