
import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import type { PublicKeyCredentialRequestOptionsJSON, AuthenticatorTransport } from '@simplewebauthn/server/schema';
import { loadUsers } from '@/actions/userActions';
import { rpID } from '@/lib/auth-utils';
import base64url from 'base64url';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
        return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const allUsers = await loadUsers();
    const user = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      return NextResponse.json({ error: 'User not found or has no passkeys' }, { status: 404 });
    }
    
    // Using .reduce for a more robust transformation that can handle bad data.
    const allowCredentials = (user.authenticators || []).reduce((acc, auth) => {
        // Only process authenticators where credentialID is a valid string.
        if (typeof auth.credentialID === 'string' && auth.credentialID.length > 0) {
            try {
                acc.push({
                    id: base64url.toBuffer(auth.credentialID),
                    type: 'public-key',
                    transports: auth.transports,
                });
            } catch (e) {
                // This will catch any errors from base64url.toBuffer if the string is malformed.
                console.warn(`Skipping corrupted credentialID for user ${user.id}. Error: ${(e as Error).message}`);
            }
        } else {
             console.warn(`Skipping authenticator for user ${user.id} due to malformed credentialID (not a string).`);
        }
        return acc;
    }, [] as { id: Buffer; type: 'public-key'; transports?: AuthenticatorTransport[] }[]);


    const options: PublicKeyCredentialRequestOptionsJSON = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });
    
    return NextResponse.json(options);
  } catch (error) {
    console.error('Error generating authentication options:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
