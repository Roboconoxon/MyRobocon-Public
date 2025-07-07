
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { VerifiedAuthenticationResponse } from '@simplewebauthn/server';
import { loadUsers, saveUsers } from '@/actions/userActions';
import { rpID, expectedOrigin } from '@/lib/auth-utils';
import base64url from 'base64url';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
        return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const allUsers = await loadUsers();
    const user = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user || !user.authenticators || user.authenticators.length === 0) {
      return NextResponse.json({ error: 'User not found or has no registered passkeys.' }, { status: 404 });
    }

    // Find the authenticator that the user is trying to use
    const authenticator = user.authenticators.find(
      // body.id is a base64url string from the client
      (auth) => auth.credentialID === body.id
    );

    if (!authenticator) {
      return NextResponse.json({ error: `Could not find authenticator with ID ${body.id} for user ${user.username}`}, { status: 404 });
    }

    const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: (challenge) => true, // In a real app, verify against a stored challenge
      expectedOrigin,
      expectedRPID: rpID,
      authenticator: {
        ...authenticator,
        // Convert the stored base64url string credential ID to a Buffer for the library
        credentialID: base64url.toBuffer(authenticator.credentialID),
        // Convert the stored base64 public key string to a Buffer
        credentialPublicKey: Buffer.from(authenticator.credentialPublicKey, 'base64'),
      },
      requireUserVerification: true,
    });

    const { verified, authenticationInfo } = verification;

    if (verified) {
      // Update the authenticator's counter
      const updatedAuthenticator = { ...authenticator, counter: authenticationInfo.newCounter };
      const updatedAuthenticators = user.authenticators.map(auth =>
        auth.credentialID === authenticator.credentialID ? updatedAuthenticator : auth
      );
      const updatedUser = { ...user, authenticators: updatedAuthenticators };
      
      const newAllUsers = allUsers.map(u => u.id === user.id ? updatedUser : u);
      await saveUsers(newAllUsers);

      const { password, ...userToReturn } = updatedUser;
      return NextResponse.json({ verified: true, user: userToReturn });
    }

    return NextResponse.json({ verified: false, error: 'Verification failed' }, { status: 401 });
  } catch (error: any) {
    console.error('Error verifying authentication:', error);
    return NextResponse.json({ verified: false, error: error.message }, { status: 500 });
  }
}
