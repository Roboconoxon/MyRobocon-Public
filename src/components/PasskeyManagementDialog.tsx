
"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Trash2, Fingerprint, Monitor, Smartphone } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';
import type { Authenticator } from '@/lib/types';

interface PasskeyManagementDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasskeyManagementDialog({ isOpen, onOpenChange }: PasskeyManagementDialogProps) {
  const { user, updateUserInContext } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleRegisterPasskey = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // 1. Get registration options from the server
      const resp = await fetch('/api/passkeys/generate-registration-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, username: user.username }),
      });
      const options = await resp.json();

      if (!resp.ok) {
        throw new Error(options.error || 'Failed to get registration options.');
      }
      
      // 2. Start the registration process on the client
      const attestation = await startRegistration(options);
      
      // 3. Send the attestation to the server for verification
      const verificationResp = await fetch('/api/passkeys/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...attestation, userId: user.id }),
      });

      const verificationJSON = await verificationResp.json();
      if (verificationJSON.verified && verificationJSON.user) {
        // Update user context with the new authenticator
        await updateUserInContext(verificationJSON.user);
        toast({ title: "Passkey Registered", description: "Your device has been successfully registered." });
      } else {
        throw new Error(verificationJSON.error || 'Passkey verification failed.');
      }
    } catch (error: any) {
      console.error("Passkey registration error:", error);
      toast({ title: 'Registration Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePasskey = async (authenticatorID: string) => {
     if (!user) return;
     setIsLoading(true);

    const updatedAuthenticators = user.authenticators?.filter(auth => auth.credentialID !== authenticatorID) || [];
    const updatedUser = { ...user, authenticators: updatedAuthenticators };

    try {
        await updateUserInContext(updatedUser);
        toast({ title: "Passkey Removed", description: "The passkey has been removed from your account." });
    } catch (error: any) {
        toast({ title: "Error", description: "Failed to remove passkey.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };
  
  const getDeviceIcon = (transports?: Authenticator['transports']) => {
    if (transports?.includes('internal')) {
        return <Smartphone className="h-5 w-5 text-muted-foreground" />;
    }
    if (transports?.includes('usb')) {
        return <Fingerprint className="h-5 w-5 text-muted-foreground" />;
    }
     return <Monitor className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Security &amp; Passkeys</DialogTitle>
          <DialogDescription>
            Manage the passkeys (e.g., Face ID, fingerprint, security keys) used to sign in to your account.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-4 max-h-[60vh] overflow-y-auto">
          {user?.authenticators && user.authenticators.length > 0 ? (
            <ul className="space-y-2">
              {user.authenticators.map((auth) => (
                <li key={auth.credentialID} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(auth.transports)}
                    <span className="text-sm font-medium">
                      Passkey (Device ID ...{auth.credentialID.slice(-4)})
                    </span>
                  </div>
                   <AlertDialog>
                      <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                          </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  This will remove this passkey from your account. You will no longer be able to sign in with this device.
                              </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePasskey(auth.credentialID)} className="bg-destructive hover:bg-destructive/90">
                                  Yes, Remove Passkey
                              </AlertDialogAction>
                          </AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-center text-muted-foreground py-4">
              You have no passkeys registered.
            </p>
          )}

          <Button onClick={handleRegisterPasskey} disabled={isLoading} className="w-full">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            Add a New Passkey
          </Button>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
