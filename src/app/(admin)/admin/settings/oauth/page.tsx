
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import type { OidcClient } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Trash2, Copy, BookLock, Info, Eye, Server } from "lucide-react";

const defaultOidcClient: Omit<OidcClient, "client_id" | "client_secret"> = {
  client_name: "",
  redirect_uris: [],
  grant_types: ["authorization_code"],
  response_types: ["code"],
};

export default function OAuthSettingsPage() {
  const { settings, setSettings } = useSettings();
  const { toast } = useToast();

  const [isOidcModalOpen, setIsOidcModalOpen] = useState(false);
  const [currentOidcClient, setCurrentOidcClient] =
    useState(defaultOidcClient);
  const [redirectUrisInput, setRedirectUrisInput] = useState("");
  const [newOidcClientDetails, setNewOidcClientDetails] =
    useState<OidcClient | null>(null);
  const [isRevealOidcModalOpen, setIsRevealOidcModalOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<OidcClient | null>(null);

  useEffect(() => {
    // This runs on the client, so window is available
    setOrigin(window.location.origin);
  }, []);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({ title: "Copied!", description: "Value copied to clipboard." });
      })
      .catch((err) => {
        toast({
          title: "Error",
          description: "Failed to copy value.",
          variant: "destructive",
        });
      });
  };

  const handleGenerateOidcClient = async () => {
    if (!currentOidcClient.client_name.trim()) {
      toast({
        title: "Error",
        description: "Client name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    const uris = redirectUrisInput.split(",").map((uri) => uri.trim()).filter(Boolean);
    if (uris.length === 0) {
      toast({
        title: "Error",
        description: "At least one Redirect URI is required.",
        variant: "destructive",
      });
      return;
    }

    const randomPart = () => Math.random().toString(36).substring(2);
    const newClient: OidcClient = {
      client_id: `oidc_client_${randomPart()}`,
      client_secret: `oidc_secret_${randomPart()}${randomPart()}`,
      client_name: currentOidcClient.client_name,
      redirect_uris: uris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    };

    const updatedClients = [...(settings.oidcClients || []), newClient];
    await setSettings({ oidcClients: updatedClients });

    setNewOidcClientDetails(newClient);
    setIsRevealOidcModalOpen(true);
    setCurrentOidcClient(defaultOidcClient);
    setRedirectUrisInput("");
    setIsOidcModalOpen(false);
    toast({
      title: "OAuth Client Registered",
      description: `Client "${newClient.client_name}" created.`,
    });
  };

  const handleDeleteOidcClient = async (clientId: string) => {
    const updatedClients = (settings.oidcClients || []).filter(
      (client) => client.client_id !== clientId
    );
    await setSettings({ oidcClients: updatedClients });
    toast({
      title: "OAuth Client Deleted",
      description: "The client application has been deleted.",
    });
  };

  const handleViewDetails = (client: OidcClient) => {
    setSelectedClientForDetails(client);
  };

  return (
    <>
       <Card className="shadow-lg mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Server className="mr-2 h-5 w-5 text-primary" /> SSO Provider Endpoints
          </CardTitle>
          <CardDescription>
            Use these endpoints in your external application's OAuth 2.0 / OIDC client configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Authorization URL</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={origin ? `${origin}/oauth/auth` : 'Loading...'} className="font-mono" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(`${origin}/oauth/auth`)} disabled={!origin}><Copy className="h-4 w-4"/></Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Token URL</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={origin ? `${origin}/oauth/token` : 'Loading...'} className="font-mono" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(`${origin}/oauth/token`)} disabled={!origin}><Copy className="h-4 w-4"/></Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label>User Info URL (OIDC)</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={origin ? `${origin}/oauth/me` : 'Loading...'} className="font-mono" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(`${origin}/oauth/me`)} disabled={!origin}><Copy className="h-4 w-4"/></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <Dialog
          open={isOidcModalOpen}
          onOpenChange={(open) => {
            setIsOidcModalOpen(open);
            if (!open) {
              setCurrentOidcClient(defaultOidcClient);
              setRedirectUrisInput("");
            }
          }}
        >
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                <BookLock className="mr-2 h-5 w-5 text-primary" /> OAuth
                Application Management
              </CardTitle>
              <CardDescription>
                Register external applications that can use this portal for
                login (SSO).
              </CardDescription>
            </div>
            <DialogTrigger asChild>
              <Button onClick={() => setIsOidcModalOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Register New App
              </Button>
            </DialogTrigger>
          </CardHeader>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register New OAuth Application</DialogTitle>
              <UiDialogDescription>
                Enter details for the external application that will use this
                portal for authentication.
              </UiDialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="oidcClientName">Application Name</Label>
                <Input
                  id="oidcClientName"
                  value={currentOidcClient.client_name}
                  onChange={(e) =>
                    setCurrentOidcClient((prev) => ({
                      ...prev,
                      client_name: e.target.value,
                    }))
                  }
                  placeholder="e.g., External Judging App"
                />
              </div>
              <div>
                <Label htmlFor="oidcRedirectUris">
                  Redirect URIs (comma-separated)
                </Label>
                <Textarea
                  id="oidcRedirectUris"
                  value={redirectUrisInput}
                  onChange={(e) => setRedirectUrisInput(e.target.value)}
                  placeholder="e.g., https://judging.example.com/callback,http://localhost:3001/api/auth/callback"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleGenerateOidcClient}>
                Register Application
              </Button>
            </DialogFooter>
          </DialogContent>

          <CardContent className="pt-6">
            {settings.oidcClients && settings.oidcClients.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application Name</TableHead>
                    <TableHead>Client ID</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.oidcClients.map((client) => (
                    <TableRow key={client.client_id}>
                      <TableCell className="font-medium">
                        {client.client_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {client.client_id}
                      </TableCell>
                      <TableCell className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(client)}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete OAuth Application?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the application "
                                {client.client_name}"? This will prevent it from
                                using the portal for login. This action cannot
                                be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteOidcClient(client.client_id)
                                }
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Delete Application
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
              <p className="text-sm text-center py-4 text-muted-foreground">
                No OAuth applications registered yet.
              </p>
            )}
          </CardContent>
        </Dialog>
      </Card>

      {/* View Details Modal */}
      <Dialog open={!!selectedClientForDetails} onOpenChange={(open) => !open && setSelectedClientForDetails(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Details for: {selectedClientForDetails?.client_name}</DialogTitle>
                <UiDialogDescription>
                    Client-specific details for your external application's configuration.
                </UiDialogDescription>
            </DialogHeader>
            <div className="space-y-4 my-4">
                <div className="space-y-1">
                    <Label>Client ID</Label>
                    <div className="p-3 bg-muted rounded-md font-mono text-sm break-all relative">
                        {selectedClientForDetails?.client_id}
                        <Button variant="ghost" size="icon" className="absolute top-1/2 -translate-y-1/2 right-2 h-7 w-7" onClick={() => copyToClipboard(selectedClientForDetails?.client_id || '')}>
                            <Copy className="h-4 w-4"/>
                        </Button>
                    </div>
                </div>
                <div className="space-y-1">
                    <Label>Redirect URIs</Label>
                    <div className="p-3 bg-muted rounded-md text-sm break-all">
                        <ul className="list-disc list-inside">
                           {selectedClientForDetails?.redirect_uris.map(uri => <li key={uri} className="font-mono">{uri}</li>)}
                        </ul>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={() => setSelectedClientForDetails(null)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Reveal New Client Details Modal */}
      {newOidcClientDetails && (
        <Dialog
          open={isRevealOidcModalOpen}
          onOpenChange={(open) => {
            if (!open) setNewOidcClientDetails(null);
            setIsRevealOidcModalOpen(open);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                OAuth Application Registered: {newOidcClientDetails.client_name}
              </DialogTitle>
              <UiDialogDescription>
                These are the credentials for your new application.{" "}
                <strong className="text-destructive">
                  Copy the Client Secret now and store it securely.
                </strong>{" "}
                You will not be able to see the full secret again.
              </UiDialogDescription>
            </DialogHeader>
            <div className="space-y-4 my-4">
              <div>
                <Label>Client ID</Label>
                <div className="p-3 bg-muted rounded-md font-mono text-sm break-all relative">
                  {newOidcClientDetails.client_id}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() =>
                      copyToClipboard(newOidcClientDetails.client_id)
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>Client Secret</Label>
                <div className="p-3 bg-muted rounded-md font-mono text-sm break-all relative">
                  {newOidcClientDetails.client_secret}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() =>
                      copyToClipboard(newOidcClientDetails.client_secret)
                    }
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setNewOidcClientDetails(null);
                  setIsRevealOidcModalOpen(false);
                }}
              >
                I have copied the secret. Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
