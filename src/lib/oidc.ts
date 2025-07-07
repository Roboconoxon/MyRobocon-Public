
import Provider from 'oidc-provider';
import { loadUsers } from '@/actions/userActions';
import { loadSettings } from '@/actions/settingsActions';
import { expectedOrigin } from './auth-utils';
import type { User } from './types';

let oidcProvider: Provider | null = null;

async function findAccount(ctx: any, id: string): Promise<any> {
  const allUsers = await loadUsers();
  const account = allUsers.find(u => u.id === id);

  if (!account) {
    return undefined;
  }

  return {
    accountId: id,
    async claims(use, scope) {
      // 'scope' can be 'openid profile email'
      // 'use' can be 'id_token' or 'userinfo'
      return {
        sub: id,
        name: account.name,
        email: account.email,
        // Add other claims based on scope
      };
    },
  };
}


export async function getOidcProvider(): Promise<Provider> {
  if (oidcProvider) {
    // In dev, we might want to reload clients on every request.
    if (process.env.NODE_ENV !== 'production') {
       const settings = await loadSettings();
       // @ts-ignore
       await oidcProvider.initialize({ clients: settings.oidcClients || [] });
    }
    return oidcProvider;
  }
  
  const settings = await loadSettings();

  const configuration = {
    clients: settings.oidcClients || [],
    pkce: {
      required: () => false, // Set to true for higher security in public clients
    },
    findAccount,
    claims: {
      openid: ['sub'],
      profile: ['name'],
      email: ['email'],
    },
    features: {
      devInteractions: { enabled: false }, // Disable dev-only routes
      introspection: { enabled: true },
      revocation: { enabled: true },
    },
    // By removing the hardcoded 'jwks' property, oidc-provider will
    // automatically generate a valid in-memory keystore upon initialization.
    // This is suitable for single-instance deployments and development.
    
    // This function is required by oidc-provider to handle its own rendering.
    // For a Next.js app, we will handle login UI ourselves and just point to it.
    interactions: {
        url(ctx: any, interaction: any) {
            return `/login?uid=${interaction.uid}`; // Redirect to our login page
        },
    },
    cookies: {
        keys: [process.env.ENCRYPTION_SECRET || 'a-very-secret-and-long-key-for-oidc-cookies'], // Use a secret from env vars
    },
  };

  const issuer = expectedOrigin;
  // @ts-ignore
  oidcProvider = new Provider(issuer, configuration);

  return oidcProvider;
}
