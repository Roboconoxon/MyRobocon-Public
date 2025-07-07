
import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import type { GenerateRegistrationOptionsOpts, AuthenticatorTransport } from '@simplewebauthn/server';
import { loadUsers } from '@/actions/userActions';
import { rpID } from '@/lib/auth-utils';
import base64url from 'base64url';

export async function POST(request: NextRequest) {
  try {
    const { userId, username } = await request.json();
    
    if (!userId || !username) {
        return NextResponse.json({ error: 'User ID and username are required' }, { status: 400 });
    }

    const allUsers = await loadUsers();
    const user = allUsers.find(u => u.id === userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Using .reduce for a more robust transformation that can handle bad data.
    const excludeCredentials = (user.authenticators || []).reduce((acc, auth) => {
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

    const opts: GenerateRegistrationOptionsOpts = {
      rpName: 'MyRobocon Portal',
      rpID,
      userID: Buffer.from(user.id, 'utf-8'),
      userName: user.username,
      // Prevent users from re-registering existing authenticators
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    };

    const options = await generateRegistrationOptions(opts);

    return NextResponse.json(options);
  } catch (error: any) {
    console.error('Error generating registration options:', error);
    return NextResponse.json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
}
