
"use client";

import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Info, AlertTriangle, CheckCircle, LucideIcon, FileText, Wifi, User, Mail, Loader2, Eye, EyeOff, Link as LinkIcon, CheckSquare, Square, X, ShieldCheck } from "lucide-react";
import type { Team, Resource, Announcement, AnnouncementAlertType } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { loadTeams, toggleResourceReadStatus } from "@/actions/teamActions";
import { loadResources } from "@/actions/resourceActions";
import { loadAnnouncements } from "@/actions/announcementActions";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const DEFAULT_BANNER_URL = "https://roboconoxon.org.uk/wp-content/uploads/2024/05/Robocon-Email-Banner-1200x300-1.png";

const SimpleMarkdownDisplay = ({ content }: { content: string }) => {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {content.split('\n').map((line, index) => {
        let processedLine = line;
        processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        processedLine = processedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Basic link handling for [text](url) - note: this is very rudimentary
        processedLine = processedLine.replace(/\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>');
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

// Extends the base Announcement type to include a client-side visibility flag for animations
type DisplayAnnouncement = Announcement & { isVisible: boolean };

export default function MyTeamPage() {
  const { user, loading: authLoading } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [announcements, setAnnouncements] = useState<DisplayAnnouncement[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isBrainPasswordVisible, setIsBrainPasswordVisible] = useState(false);
  const { toast } = useToast();
  const [isPasskeyCardVisible, setIsPasskeyCardVisible] = useState(true);


  const fetchData = useCallback(async () => {
    if (!user || !user.teamId) {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      const [allTeams, allResources, allAnnouncements] = await Promise.all([
        loadTeams(),
        loadResources(),
        loadAnnouncements(),
      ]);

      const userTeam = allTeams.find(t => t.id === user.teamId);
      setTeam(userTeam ? { ...userTeam, dismissedResourceIds: userTeam.dismissedResourceIds || [] } : null);

      const userResources = allResources.filter(res => 
        res.assignedTeamIds === "all" || 
        (Array.isArray(res.assignedTeamIds) && res.assignedTeamIds.includes(user.teamId!))
      );
      setResources(userResources);

      const activeTeamAnnouncements = allAnnouncements.filter(
        ann => ann.isActive && (ann.displayLocation === "teams" || ann.displayLocation === "both")
      ).sort((a, b) => new Date(b.activeSince || 0).getTime() - new Date(a.activeSince || 0).getTime());
      
      setAnnouncements(activeTeamAnnouncements.map(ann => ({ ...ann, isVisible: true })));
      
    } catch (error) {
      console.error("Failed to load team page data:", error);
      setTeam(null);
      toast({title: "Error", description: "Could not load team data.", variant: "destructive"});
    } finally {
      setIsLoadingData(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  const handleToggleResourceRead = async (resourceId: string) => {
    if (!team) return;

    const originalDismissedIds = [...(team.dismissedResourceIds || [])];
    const isCurrentlyRead = originalDismissedIds.includes(resourceId);

    const newDismissedIds = isCurrentlyRead
      ? originalDismissedIds.filter(id => id !== resourceId)
      : [...originalDismissedIds, resourceId];
    setTeam(prevTeam => prevTeam ? { ...prevTeam, dismissedResourceIds: newDismissedIds } : null);

    const result = await toggleResourceReadStatus(team.id, resourceId);

    if (result.success && result.dismissedResourceIds) {
      setTeam(prevTeam => prevTeam ? { ...prevTeam, dismissedResourceIds: result.dismissedResourceIds } : null);
      toast({
        title: "Resource Updated",
        description: `Resource marked as ${isCurrentlyRead ? "unread" : "read"}.`,
      });
    } else {
      setTeam(prevTeam => prevTeam ? { ...prevTeam, dismissedResourceIds: originalDismissedIds } : null);
      toast({
        title: "Error",
        description: "Could not update resource status.",
        variant: "destructive",
      });
    }
  };
  
  const handleDismissAnnouncement = (idToDismiss: string) => {
    setAnnouncements(prev => prev.map(ann => 
      ann.id === idToDismiss ? { ...ann, isVisible: false } : ann
    ));
  };


  if (authLoading || isLoadingData) {
    return (
      <div className="container mx-auto p-4 text-center flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
     return <div className="container mx-auto p-4 text-center">User not authenticated. Please try logging in again.</div>;
  }

  if (!user.teamId) {
    return <div className="container mx-auto p-4 text-center">You are not currently assigned to a team. Please contact an administrator.</div>;
  }
  
  if (!team) {
    return <div className="container mx-auto p-4 text-center">Could not load your team's data (Team ID: {user.teamId}). The team might have been removed or an error occurred. Please contact support.</div>;
  }

  const unreadResources = resources.filter(res => !team?.dismissedResourceIds?.includes(res.id));
  const readResources = resources.filter(res => team?.dismissedResourceIds?.includes(res.id));

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="relative h-48 md:h-64 w-full overflow-hidden rounded-xl shadow-lg">
        <Image
          src={team.bannerImageUrl || DEFAULT_BANNER_URL}
          alt={`${team.name} Banner`}
          layout="fill"
          objectFit="cover"
          data-ai-hint="robotics competition banner"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 p-4 md:p-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white font-headline">{team.name}</h1>
          <p className="text-lg text-gray-200">{team.schoolName}</p>
        </div>
      </div>

      {announcements.map((announcement) => {
        const AlertIconComponent = getAlertIcon(announcement.alertType);
        return (
          <div
            key={announcement.id}
            className={cn(
              "grid transition-all duration-300 ease-in-out",
              announcement.isVisible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <Alert 
                variant={getAlertVariant(announcement.alertType)} 
                className="shadow-md relative"
              >
                {announcement.isDismissible && (
                  <button
                    onClick={() => handleDismissAnnouncement(announcement.id)}
                    className="absolute top-2 right-2 p-1 rounded-md text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-colors"
                    aria-label="Dismiss announcement"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <AlertIconComponent className="h-5 w-5" />
                <AlertTitle className="font-semibold">{announcement.alertType.toUpperCase()}</AlertTitle>
                <AlertDescription>
                  <SimpleMarkdownDisplay content={announcement.content} />
                </AlertDescription>
              </Alert>
            </div>
          </div>
        );
      })}


      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-headline">Team Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center">
              <User className="mr-3 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Contact Person</p>
                <p className="text-muted-foreground">{team.contactPerson}</p>
              </div>
            </div>
             <Separator />
            <div className="flex items-center">
              <Mail className="mr-3 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Contact Email</p>
                <p className="text-muted-foreground">{team.contactEmail}</p>
              </div>
            </div>
             <Separator />
            <div className="flex items-center">
              <FileText className="mr-3 h-5 w-5 text-primary" /> 
              <div>
                <p className="font-medium">Robocon Brain ID</p>
                <p className="text-muted-foreground">{team.roboconBrainId}</p>
              </div>
            </div>
            {team.roboconBrainWifiPassword && (
              <>
              <Separator />
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center">
                  <Wifi className="mr-3 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Brain WiFi Password</p>
                    <p
                      className={`text-muted-foreground font-mono tracking-wider transition-all duration-150 ease-in-out ${
                        !isBrainPasswordVisible ? 'blur-[3px] select-none' : 'select-auto'
                      }`}
                    >
                      {team.roboconBrainWifiPassword}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsBrainPasswordVisible(!isBrainPasswordVisible)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label={isBrainPasswordVisible ? "Hide password" : "Show password"}
                >
                  {isBrainPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
              </div>
              </>
            )}
            {team.notes && (
              <>
              <Separator />
              <div className="mt-4">
                <p className="font-medium mb-1">Notes</p>
                <div className="text-muted-foreground p-3 bg-muted/50 rounded-md border">
                   <SimpleMarkdownDisplay content={team.notes} />
                </div>
              </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <div className={cn(
            "grid transition-all duration-300 ease-in-out",
            isPasskeyCardVisible ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}>
            <div className="overflow-hidden">
              <Card className="shadow-lg">
                <CardHeader className="relative">
                    <CardTitle className="text-xl font-headline flex items-center pr-8"><ShieldCheck className="mr-2 h-5 w-5 text-green-600" /> Secure Your Account with Passkeys</CardTitle>
                    <button
                      onClick={() => setIsPasskeyCardVisible(false)}
                      className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      aria-label="Dismiss passkey setup card"
                    >
                      <X className="h-4 w-4" />
                    </button>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                        For a faster and more secure login, add a passkey to your account. This allows you to sign in using your device's Face ID, fingerprint, or a hardware security key instead of a password.
                    </p>
                    <div className="border-l-4 border-primary pl-4 py-2 bg-muted/50 rounded-r-md">
                        <p className="text-sm font-medium">How to set it up:</p>
                        <ol className="list-decimal list-inside text-sm text-muted-foreground mt-1 space-y-1">
                            <li>Click your name in the top-right corner.</li>
                            <li>Select "Security & Passkeys" from the menu.</li>
                            <li>Click "Add a New Passkey" and follow the prompts.</li>
                        </ol>
                    </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-xl font-headline">Team Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                <h3 className="text-lg font-semibold mb-3 text-primary">New & Unread Resources</h3>
                {unreadResources.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full">
                    {unreadResources.map((resource) => (
                        <AccordionItem value={resource.id} key={resource.id} className="border-b border-border last:border-b-0">
                        <AccordionTrigger className="py-3 text-left hover:no-underline">
                            <div className="flex flex-col">
                            <span className="font-medium">{resource.title}</span>
                            <span className="text-xs text-muted-foreground">By: {resource.author}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="py-2 pl-2 pr-1 space-y-3">
                            <SimpleMarkdownDisplay content={resource.content} />
                            {resource.linkUrl && (
                            <div className="mt-3 pt-2 border-t border-dashed border-border/70">
                                <Button asChild variant="link" className="p-0 h-auto text-base">
                                <a href={resource.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:text-primary/80">
                                    <LinkIcon className="mr-2 h-4 w-4" />
                                    Open Resource Link
                                </a>
                                </Button>
                            </div>
                            )}
                            {resource.tags && resource.tags.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-dashed border-border/70">
                                <p className="text-xs font-medium mb-1">Tags:</p>
                                <div className="flex flex-wrap gap-1">
                                {resource.tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                ))}
                                </div>
                            </div>
                            )}
                            <div className="mt-3 pt-3 border-t border-border">
                            <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleToggleResourceRead(resource.id)}
                                className="w-full sm:w-auto"
                                >
                                <CheckSquare className="mr-2 h-4 w-4 text-green-500" />
                                Mark as Read
                                </Button>
                            </div>
                        </AccordionContent>
                        </AccordionItem>
                    ))}
                    </Accordion>
                ) : (
                    <p className="text-muted-foreground">No new or unread resources.</p>
                )}
                </div>

                <Separator />
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="read-archived-section-outer" className="border-none">
                        <AccordionTrigger className="hover:no-underline py-3 w-full justify-start -ml-0.5">
                            <h3 className="text-lg font-semibold text-muted-foreground text-left flex-1">Read & Archived Resources</h3>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                        {readResources.length > 0 ? (
                            <Accordion type="single" collapsible className="w-full">
                            {readResources.map((resource) => (
                                <AccordionItem value={resource.id} key={resource.id} className="border-b border-border last:border-b-0">
                                <AccordionTrigger className="py-3 text-left hover:no-underline">
                                    <div className="flex flex-col">
                                    <span className={cn("font-medium line-through text-muted-foreground")}>{resource.title}</span>
                                    <span className={cn("text-xs text-muted-foreground line-through")}>By: {resource.author}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="py-2 pl-2 pr-1 space-y-3">
                                    <SimpleMarkdownDisplay content={resource.content} />
                                    {resource.linkUrl && (
                                    <div className="mt-3 pt-2 border-t border-dashed border-border/70">
                                        <Button asChild variant="link" className="p-0 h-auto text-base">
                                        <a href={resource.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-primary hover:text-primary/80">
                                            <LinkIcon className="mr-2 h-4 w-4" />
                                            Open Resource Link
                                        </a>
                                        </Button>
                                    </div>
                                    )}
                                    {resource.tags && resource.tags.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-dashed border-border/70">
                                        <p className="text-xs font-medium mb-1">Tags:</p>
                                        <div className="flex flex-wrap gap-1">
                                        {resource.tags.map(tag => (
                                            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                                        ))}
                                        </div>
                                    </div>
                                    )}
                                    <div className="mt-3 pt-3 border-t border-border">
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleToggleResourceRead(resource.id)}
                                        className="w-full sm:w-auto"
                                        >
                                        <Square className="mr-2 h-4 w-4" />
                                        Mark as Unread
                                        </Button>
                                    </div>
                                </AccordionContent>
                                </AccordionItem>
                            ))}
                            </Accordion>
                        ) : (
                            <p className="text-muted-foreground py-4">No resources have been marked as read yet.</p>
                        )}
                        </AccordionContent>
                        </AccordionItem>
                    </Accordion>
            </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
