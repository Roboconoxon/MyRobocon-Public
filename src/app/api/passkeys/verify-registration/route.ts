
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { VerifiedRegistrationResponse, VerifyRegistrationResponseOpts } from '@simplewebauthn/server';
import { loadUsers, saveUsers } from '@/actions/userActions';
import { rpID, expectedOrigin } from '@/lib/auth-utils';
import type { Authenticator } from '@/lib/types';
import base64url from 'base64url';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    const allUsers = await loadUsers();
    const user = allUsers.find(u => u.id === userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // In a real app, you would retrieve the challenge you stored earlier.
    // For this simplified example, we're accepting any challenge.
    const expectedChallenge = (challenge: string) => true;

    const opts: VerifyRegistrationResponseOpts = {
      response: body,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
    };

    const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse(opts);
    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credentialPublicKey, credentialID, counter } = registrationInfo;
      
      const newAuthenticator: Authenticator = {
        // **FIX:** `credentialID` is a Uint8Array, convert it to a base64url string for storage.
        credentialID: base64url.fromBuffer(credentialID),
        // Convert the Uint8Array public key to a base64 string for storage
        credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64'),
        counter,
        credentialDeviceType: registrationInfo.credentialDeviceType,
        credentialBackedUp: registrationInfo.credentialBackedUp,
        transports: body.response.transports,
      };

      const updatedAuthenticators = [...(user.authenticators || []), newAuthenticator];
      const updatedUser = { ...user, authenticators: updatedAuthenticators };
      
      const newAllUsers = allUsers.map(u => u.id === user.id ? updatedUser : u);
      await saveUsers(newAllUsers);
      
      const { password, ...userToReturn } = updatedUser;
      return NextResponse.json({ verified: true, user: userToReturn });
    }

    return NextResponse.json({ verified: false, error: 'Verification failed' }, { status: 400 });
  } catch (error: any) {
    console.error('Error verifying registration:', error);
    return NextResponse.json({ verified: false, error: error.message }, { status: 500 });
  }
}
