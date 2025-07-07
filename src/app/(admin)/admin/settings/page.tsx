
"use client";

import { useState, useEffect, useCallback, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import type { SiteSettings, ApiToken, ThemeName, SmtpSettings } from "@/lib/types";
import Image from "next/image";
import { Save, Image as ImageIcon, Palette, Terminal, Copy, Trash2, PlusCircle, RotateCcw, Loader2, Trophy, KeyRound, Mail, ShieldAlert } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription as UiDialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";


const themeOptions: { value: ThemeName; label: string }[] = [
  { value: "normal", label: "Normal (supports Light/Dark)" },
  { value: "highContrast", label: "High Contrast" },
  { value: "cyberGreen", label: "Cyber Green" },
  { value: "cyberRed", label: "Cyber Red" },
];

export default function SettingsPage() {
  const { settings: contextSettings, setSettings: setContextSettings, isLoadingSettings, applyThemeByName, switchToNormalTheme } = useSettings();
  const [localSettings, setLocalSettings] = useState<Partial<SiteSettings>>(contextSettings);
  
  const [smtpPasswordInput, setSmtpPasswordInput] = useState("");

  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [generatedTokenDetails, setGeneratedTokenDetails] = useState<{name: string, token: string} | null>(null);
  const [isRevealTokenModalOpen, setIsRevealTokenModalOpen] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoadingSettings) {
      setLocalSettings({
        ...contextSettings,
        apiTokens: contextSettings.apiTokens || [], 
        smtpSettings: contextSettings.smtpSettings || {},
        oidcClients: contextSettings.oidcClients || [],
      });
    }
  }, [contextSettings, isLoadingSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSmtpInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalSettings(prev => ({ 
      ...prev, 
      smtpSettings: {
        ...prev.smtpSettings,
        [name]: name === 'port' ? Number(value) : value,
      }
    }));
  };

  const handleSwitchChange = (name: keyof SiteSettings, checked: boolean) => {
    setLocalSettings(prev => ({ ...prev, [name]: checked as any }));
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          setLocalSettings(prev => ({ ...prev, logoUrl: event.target.result as string }));
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleThemeChange = (themeName: ThemeName) => {
    setLocalSettings(prev => ({ ...prev, activeThemeName: themeName }));
    applyThemeByName(themeName); 
  };

  const handleSaveChanges = async () => {
    try {
      const settingsToSave: Partial<SiteSettings> = { ...localSettings };

      if (smtpPasswordInput) {
        settingsToSave.smtpSettings = {
          ...settingsToSave.smtpSettings,
          pass: smtpPasswordInput,
        };
      } else {
        if (settingsToSave.smtpSettings) {
          delete (settingsToSave.smtpSettings as any).pass;
        }
      }
      
      await setContextSettings(settingsToSave);
      setSmtpPasswordInput("");
      toast({ title: "Settings Saved", description: "Site settings have been updated." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    }
  };
  
  const handleResetToNormalTheme = async () => {
    try {
      await switchToNormalTheme();
      toast({ title: "Theme Reset", description: "Theme set to Normal." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to reset theme.", variant: "destructive" });
    }
  };

  // API Token Handlers
  const handleGenerateToken = () => {
    if (!newTokenName.trim()) {
        toast({ title: "Error", description: "Token name cannot be empty.", variant: "destructive" });
        return;
    }
    const randomPart = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const newActualToken = `robocon_sk_${randomPart}`;
    
    const newTokenItem: ApiToken = {
        id: `token_${Date.now()}`,
        name: newTokenName,
        token: newActualToken, 
        createdAt: new Date().toISOString(),
    };

    setLocalSettings(prev => ({
        ...prev,
        apiTokens: [...(prev.apiTokens || []), newTokenItem]
    }));
    
    setGeneratedTokenDetails({name: newTokenName, token: newActualToken}); 
    setIsRevealTokenModalOpen(true);
    setNewTokenName("");
    setIsTokenModalOpen(false);
    toast({ title: "API Token Generated", description: `Token "${newTokenName}" created. Save it securely.` });
  };

  const handleDeleteToken = (tokenId: string) => {
    setLocalSettings(prev => ({
        ...prev,
        apiTokens: (prev.apiTokens || []).filter(token => token.id !== tokenId)
    }));
    toast({ title: "API Token Marked for Deletion", description: "Save settings to confirm." });
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
        toast({ title: "Copied!", description: "Value copied to clipboard." });
    }).catch(err => {
        toast({ title: "Error", description: "Failed to copy value.", variant: "destructive" });
    });
  };
  
  const maskToken = (token: string) => {
    if (!token || token.length < 8) return token;
    const prefix = token.substring(0, token.indexOf('_') + 1);
    const suffix = token.slice(-6);
    return `${prefix}...${suffix}`;
  };


  if (isLoadingSettings) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      
      {/* --- Branding Card --- */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><ImageIcon className="mr-2 h-5 w-5 text-primary" /> Branding</CardTitle>
          <CardDescription>Customize the look and feel of your portal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteTitle">Site Title</Label>
            <Input id="siteTitle" name="siteTitle" value={localSettings.siteTitle || ''} onChange={handleInputChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo (Upload or URL)</Label>
             <div className="flex items-center gap-4">
                <Input id="logoUrlFile" name="logoUrlFile" type="file" accept="image/*" onChange={handleLogoChange} className="flex-1"/>
                 {localSettings.logoUrl && <Image src={localSettings.logoUrl} alt="Current Logo" width={40} height={40} className="rounded border p-1" data-ai-hint="logo"/>}
            </div>
            <Input 
                id="logoUrlText"
                name="logoUrl"
                type="text" 
                placeholder="Or paste image URL here" 
                value={localSettings.logoUrl && localSettings.logoUrl.startsWith('data:') ? '(Local image uploaded)' : (localSettings.logoUrl || '')}
                onChange={(e) => setLocalSettings(prev => ({...prev, logoUrl: e.target.value}))} 
                className="mt-2"
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="loginHint">Login Page Hint</Label>
            <Textarea id="loginHint" name="loginHint" value={localSettings.loginHint || ''} onChange={handleInputChange} placeholder="e.g. If you have lost your account..."/>
          </div>
          <div className="space-y-2">
            <Label htmlFor="footerText">Footer Text</Label>
            <Input id="footerText" name="footerText" value={localSettings.footerText || ''} onChange={handleInputChange} placeholder="e.g. © 2025 Robocon Oxfordshire"/>
          </div>
        </CardContent>
      </Card>

      {/* --- SMTP Email Card --- */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Mail className="mr-2 h-5 w-5 text-primary" /> SMTP Email Settings</CardTitle>
          <CardDescription>Configure your external SMTP service for sending emails (e.g., from Outlook, Gmail).</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtpHost">SMTP Host</Label>
            <Input id="smtpHost" name="host" value={localSettings.smtpSettings?.host || ''} onChange={handleSmtpInputChange} placeholder="e.g., smtp.office365.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpPort">SMTP Port</Label>
            <Input id="smtpPort" name="port" type="number" value={localSettings.smtpSettings?.port || ''} onChange={handleSmtpInputChange} placeholder="e.g., 587" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpUser">SMTP Username</Label>
            <Input id="smtpUser" name="user" value={localSettings.smtpSettings?.user || ''} onChange={handleSmtpInputChange} placeholder="your-email@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpPass">SMTP Password (or App Password)</Label>
            <Input id="smtpPass" name="pass" type="password" value={smtpPasswordInput} onChange={(e) => setSmtpPasswordInput(e.target.value)} placeholder="Leave blank to keep existing password" />
            <p className="text-xs text-muted-foreground">For services like Outlook/Gmail, use an "App Password".</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpFromName">Sender Name</Label>
            <Input id="smtpFromName" name="fromName" value={localSettings.smtpSettings?.fromName || ''} onChange={handleSmtpInputChange} placeholder="e.g., MyRobocon Portal Admin" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpFromEmail">Sender Email</Label>
            <Input id="smtpFromEmail" name="fromEmail" value={localSettings.smtpSettings?.fromEmail || ''} onChange={handleSmtpInputChange} placeholder="The email address emails will be sent from" />
          </div>
        </CardContent>
      </Card>

      {/* --- Theme Card --- */}
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5 text-primary" /> Site Theme</CardTitle>
            <CardDescription>Select a predefined theme for the site. "Normal" theme supports light/dark mode.</CardDescription>
          </div>
          <Button variant="outline" onClick={handleResetToNormalTheme} size="sm">
            <RotateCcw className="mr-2 h-4 w-4" /> Set to Normal Theme
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="activeThemeName">Active Theme</Label>
            <Select value={localSettings.activeThemeName} onValueChange={(value) => handleThemeChange(value as ThemeName)}>
              <SelectTrigger id="activeThemeName" className="w-full md:w-1/2">
                <SelectValue placeholder="Select a theme" />
              </SelectTrigger>
              <SelectContent>
                {themeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* --- Quotas Card --- */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Trophy className="mr-2 h-5 w-5 text-primary" /> Progress Quotas</CardTitle>
          <CardDescription>Set limits for team progress submissions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxProgressPointsPerTeam">Max Progress Points Per Team</Label>
            <Input 
              id="maxProgressPointsPerTeam" 
              name="maxProgressPointsPerTeam" 
              type="number" 
              value={localSettings.maxProgressPointsPerTeam === null ? '' : String(localSettings.maxProgressPointsPerTeam)} 
              onChange={(e) => setLocalSettings(prev => ({...prev, maxProgressPointsPerTeam: e.target.value === '' ? null : Number(e.target.value) }))} 
              placeholder="Enter max points (e.g., 100) or leave blank for no limit" 
            />
            <p className="text-xs text-muted-foreground">
              Set the maximum total points a team can earn from all progress submissions.
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* --- Access Modes Card --- */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Terminal className="mr-2 h-5 w-5 text-primary" /> Site Access Modes</CardTitle>
          <CardDescription>Control site access for demo and maintenance purposes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="demoMode"
              checked={localSettings.demoMode}
              onCheckedChange={(checked) => handleSwitchChange("demoMode", checked)}
            />
            <Label htmlFor="demoMode" className="cursor-pointer">Enable Demo Mode (shows default credentials on login)</Label>
          </div>
          <Separator />
          <div className="flex items-center space-x-2">
            <Switch
              id="maintenanceMode"
              checked={!!localSettings.maintenanceMode}
              onCheckedChange={(checked) => handleSwitchChange("maintenanceMode", checked)}
            />
            <Label htmlFor="maintenanceMode" className="cursor-pointer flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              Enable Maintenance Mode (prevents participant logins)
            </Label>
          </div>
        </CardContent>
      </Card>
      
      {/* --- API Token Card --- */}
      <Card className="shadow-lg">
        <Dialog open={isTokenModalOpen} onOpenChange={(open) => { setIsTokenModalOpen(open); if (!open) setNewTokenName(''); }}>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                  <CardTitle className="flex items-center"><KeyRound className="mr-2 h-5 w-5 text-primary" /> API Token Management</CardTitle>
                  <CardDescription>Manage API tokens for external integrations.</CardDescription>
              </div>
              <DialogTrigger asChild>
                  <Button onClick={() => { setNewTokenName(''); setIsTokenModalOpen(true); } }>
                      <PlusCircle className="mr-2 h-4 w-4"/> Generate New Token
                  </Button>
              </DialogTrigger>
            </CardHeader>
             <DialogContent>
                <DialogHeader>
                    <DialogTitle>Generate New API Token</DialogTitle>
                    <UiDialogDescription>Enter a descriptive name for your new token.</UiDialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <Label htmlFor="newTokenName">Token Name</Label>
                    <Input 
                        id="newTokenName" 
                        value={newTokenName} 
                        onChange={(e) => setNewTokenName(e.target.value)}
                        placeholder="e.g., Signup System Integration Key"
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleGenerateToken}>Generate Token</Button>
                </DialogFooter>
            </DialogContent>
        
            <CardContent className="pt-6">
                {(localSettings.apiTokens && localSettings.apiTokens.length > 0) ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Token (Masked)</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {localSettings.apiTokens.map(token => (
                                <TableRow key={token.id}>
                                    <TableCell className="font-medium">{token.name}</TableCell>
                                    <TableCell className="font-mono text-sm">{maskToken(token.token)}</TableCell>
                                    <TableCell>{new Date(token.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Delete API Token?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to delete the token "{token.name}"? This action cannot be undone after saving settings.
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteToken(token.id)} className="bg-destructive hover:bg-destructive/90">
                                                    Delete Token
                                                </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-sm text-muted-foreground">No API tokens generated yet. Click "Generate New Token" to create one.</p>
                )}
            </CardContent>
        </Dialog>
      </Card>
      
      {/* --- Save Button --- */}
      <div className="pt-4">
        <Button onClick={handleSaveChanges} size="lg"><Save className="mr-2 h-5 w-5" /> Save All Settings</Button>
      </div>

      {/* --- Reveal Modals --- */}
      {generatedTokenDetails && (
           <Dialog open={isRevealTokenModalOpen} onOpenChange={(open) => { if(!open) setGeneratedTokenDetails(null); setIsRevealTokenModalOpen(open); }}>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>API Token Generated: {generatedTokenDetails.name}</DialogTitle>
                      <UiDialogDescription>
                          This is your new API token. **Copy it now and store it securely.** You will not be able to see the full token again after closing this dialog.
                      </UiDialogDescription>
                  </DialogHeader>
                  <div className="my-4 p-3 bg-muted rounded-md font-mono text-sm break-all relative">
                      {generatedTokenDetails.token}
                      <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute top-2 right-2 h-7 w-7"
                          onClick={() => copyToClipboard(generatedTokenDetails.token)}
                      >
                          <Copy className="h-4 w-4"/>
                      </Button>
                  </div>
                  <DialogFooter>
                      <Button onClick={() => {setGeneratedTokenDetails(null); setIsRevealTokenModalOpen(false);}}>Close</Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
      )}
    </div>
  );
}
