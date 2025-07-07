
"use client";

import { useState, type FormEvent, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, EyeOff, Loader2, Info, AlertTriangle, CheckCircle, type LucideIcon, X, ShieldAlert, Fingerprint } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import type { Announcement, AnnouncementAlertType } from "@/lib/types";
import { loadAnnouncements } from "@/actions/announcementActions";
import { startAuthentication } from '@simplewebauthn/browser';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Helper for simple markdown display
const SimpleMarkdownDisplay = ({ content }: { content: string }) => {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90">
      {content.split('\n').map((line, index) => {
        let processedLine = line;
        processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        processedLine = processedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
        return (
          <p key={index} dangerouslySetInnerHTML={{ __html: processedLine || "<br />" }} />
        );
      })}
    </div>
  );
};

const getAlertIcon = (type: AnnouncementAlertType): LucideIcon => {
  switch (type) {
    case "emergency": return AlertTriangle;
    case "maintenance": return Info;
    case "info": return CheckCircle;
    default: return Info;
  }
};

const getAlertVariant = (type: AnnouncementAlertType): "default" | "destructive" => {
  return type === "emergency" ? "destructive" : "default";
};


export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);
  const [initialLoadingComplete, setInitialLoadingComplete] = useState(false);
  const [isLockedAccountModalOpen, setIsLockedAccountModalOpen] = useState(false);
  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);
  const [isPasskeyPromptOpen, setIsPasskeyPromptOpen] = useState(false);
  const [passkeyUsername, setPasskeyUsername] = useState("");

  const { login, loginWithPasskey } = useAuth(); 
  const { settings, isLoadingSettings } = useSettings();
  const { toast } = useToast();
  const router = useRouter();

  const fetchLoginAnnouncements = useCallback(async () => {
    try {
      const allAnnouncements = await loadAnnouncements();
      const relevantAnnouncement = allAnnouncements
        .filter(ann => ann.isActive && (ann.displayLocation === "login" || ann.displayLocation === "both"))
        .sort((a, b) => new Date(b.activeSince || 0).getTime() - new Date(a.activeSince || 0).getTime())[0];
      
      if (relevantAnnouncement?.id !== activeAnnouncement?.id) {
          setIsAnnouncementVisible(true);
          setActiveAnnouncement(relevantAnnouncement || null);
      } else if (!relevantAnnouncement) {
          setActiveAnnouncement(null);
      }

    } catch (error) {
      console.error("Failed to load announcements for login page:", error);
    }
  }, [activeAnnouncement?.id]);

  useEffect(() => {
    if (!isLoadingSettings) { 
        fetchLoginAnnouncements();
    }
  }, [isLoadingSettings, fetchLoginAnnouncements]);

  useEffect(() => {
    if (!login.loading && !isLoadingSettings) {
      setInitialLoadingComplete(true);
    }
  }, [login.loading, isLoadingSettings]);


  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoggingIn(true);
    const result = await login(username, password);
    setIsLoggingIn(false);

    if (!result.success && result.reason === 'locked') {
      setIsLockedAccountModalOpen(true);
    }
  };

  const handlePasskeyLogin = async (promptedUsername?: string) => {
    const targetUsername = promptedUsername || username;
    if (!targetUsername) {
      setPasskeyUsername("");
      setIsPasskeyPromptOpen(true);
      return;
    }

    setIsLoggingIn(true);
    // Close the prompt if it was open
    if (isPasskeyPromptOpen) setIsPasskeyPromptOpen(false);

    try {
      const resp = await fetch('/api/passkeys/generate-authentication-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetUsername }),
      });
      const options = await resp.json();

      if (!resp.ok) {
        throw new Error(options.error || 'Failed to get authentication options.');
      }
      
      const authResult = await startAuthentication(options);

      const verificationResp = await fetch('/api/passkeys/verify-authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...authResult, username: targetUsername }),
      });

      const verificationJSON = await verificationResp.json();
      if (verificationJSON.verified) {
        await loginWithPasskey(verificationJSON.user);
      } else {
        throw new Error(verificationJSON.error || 'Passkey verification failed.');
      }
    } catch (error: any) {
      console.error("Passkey login error:", error);
      toast({ title: 'Passkey Login Failed', description: error.message || 'An unknown error occurred.', variant: 'destructive' });
    } finally {
      setIsLoggingIn(false);
    }
  };


  if (!initialLoadingComplete) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const AlertIconComponent = activeAnnouncement ? getAlertIcon(activeAnnouncement.alertType) : null;


  return (
    <>
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <Image
            src={settings.logoUrl}
            alt="Robocon Logo"
            width={120}
            height={120}
            className="mx-auto mb-4 rounded-md"
            data-ai-hint="logo"
          />
          <CardTitle className="text-3xl font-headline">{settings.siteTitle}</CardTitle>
          <CardDescription>Login to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          {settings.maintenanceMode && (
            <Alert variant="destructive" className="mb-4">
              <ShieldAlert className="h-5 w-5" />
              <AlertTitle>Portal in Maintenance Mode</AlertTitle>
              <AlertDescription>
                The portal is currently undergoing maintenance. Logins for participants are temporarily disabled. Admins can still log in.
              </AlertDescription>
            </Alert>
          )}
          {activeAnnouncement && AlertIconComponent && (
             <div className={cn(
                "grid transition-all duration-300 ease-in-out mb-4",
                isAnnouncementVisible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}>
               <div className="overflow-hidden">
                  <Alert 
                    variant={getAlertVariant(activeAnnouncement.alertType)} 
                    className="animate-in fade-in-0 slide-in-from-top-4 duration-500 relative"
                  >
                    {activeAnnouncement.isDismissible && (
                      <button
                        onClick={() => setIsAnnouncementVisible(false)}
                        className="absolute top-2 right-2 p-1 rounded-md text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors"
                        aria-label="Dismiss announcement"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <AlertIconComponent className="h-5 w-5" />
                    <AlertTitle className="font-semibold">{activeAnnouncement.alertType.toUpperCase()}</AlertTitle>
                    <AlertDescription>
                      <SimpleMarkdownDisplay content={activeAnnouncement.content} />
                    </AlertDescription>
                  </Alert>
               </div>
            </div>
          )}
          {settings.demoMode && (
            <div className="mb-4 rounded-md border border-accent bg-accent/10 p-3 text-sm text-foreground animate-in fade-in-0 slide-in-from-top-4 duration-500 delay-100">
              <p className="font-semibold">Demo Mode Active</p>
              <p>Default credentials:</p>
              <ul className="list-disc pl-5">
                <li>Admin: admin / admin</li>
                <li>Participant: participant / participant</li>
              </ul>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username webauthn"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    <span className="sr-only">
                      {showPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                  />
                  <Label htmlFor="remember-me" className="text-sm font-normal">
                    Remember me
                  </Label>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoggingIn || login.loading || isLoadingSettings}>
                {(isLoggingIn || login.loading || isLoadingSettings) ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Login with Password"
                )}
              </Button>
            </div>
          </form>
           <div className="relative my-4">
              <Separator />
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>
             <Button variant="outline" className="w-full" onClick={() => handlePasskeyLogin()} disabled={isLoggingIn}>
                <Fingerprint className="mr-2 h-4 w-4" />
                Sign in with a passkey
            </Button>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 pt-4">
          <p className="px-4 text-center text-xs text-muted-foreground">
            {settings.loginHint}
          </p>
          <p className="text-xs text-muted-foreground">{settings.footerText}</p>
        </CardFooter>
      </Card>
    </div>

      <Dialog open={isPasskeyPromptOpen} onOpenChange={setIsPasskeyPromptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in with a passkey</DialogTitle>
            <DialogDescription>
              To find your passkey, please enter the username associated with it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="passkey-username">Username</Label>
              <Input
                id="passkey-username"
                placeholder="Enter your username"
                value={passkeyUsername}
                onChange={(e) => setPasskeyUsername(e.target.value)}
                autoComplete="username webauthn"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={() => handlePasskeyLogin(passkeyUsername)} disabled={!passkeyUsername}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isLockedAccountModalOpen} onOpenChange={setIsLockedAccountModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Account Locked</AlertDialogTitle>
            <AlertDialogDescription>
              Your account is currently suspended. Please contact support for assistance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsLockedAccountModalOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
