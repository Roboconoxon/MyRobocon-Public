
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, FileText, Megaphone, CheckCircle, ArrowRight, ExternalLink, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { type Team, type Resource, type Announcement } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";
import { formatDistanceToNow } from 'date-fns';
import { loadTeams } from "@/actions/teamActions";
import { loadResources } from "@/actions/resourceActions";
import { loadAnnouncements } from "@/actions/announcementActions";


export default function AdminDashboardPage() {
  const [totalTeams, setTotalTeams] = useState(0);
  const [totalResources, setTotalResources] = useState(0);
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);
  const [timeSinceAnnouncement, setTimeSinceAnnouncement] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [teams, resources, announcements] = await Promise.all([
        loadTeams(),
        loadResources(),
        loadAnnouncements()
      ]);
      setTotalTeams(teams.length);
      setTotalResources(resources.length);
      
      const mostRecentActiveAnnouncement = announcements
        .filter(ann => ann.isActive)
        .sort((a, b) => new Date(b.activeSince || 0).getTime() - new Date(a.activeSince || 0).getTime())[0];
      
      setActiveAnnouncement(mostRecentActiveAnnouncement || null);

    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      // Handle error (e.g., show toast)
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeAnnouncement && activeAnnouncement.activeSince) {
      setTimeSinceAnnouncement(formatDistanceToNow(new Date(activeAnnouncement.activeSince), { addSuffix: true }));
      const interval = setInterval(() => {
         setTimeSinceAnnouncement(formatDistanceToNow(new Date(activeAnnouncement.activeSince!), { addSuffix: true }));
      }, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [activeAnnouncement]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-lg hover:shadow-xl transition-shadow lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{totalTeams}</div>
            <p className="text-xs text-muted-foreground">Currently registered</p>
          </CardContent>
          <CardFooter>
            <Button asChild size="sm" className="w-full">
              <Link href="/admin/teams">Manage Teams <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{totalResources}</div>
            <p className="text-xs text-muted-foreground">Available resources</p>
          </CardContent>
          <CardFooter>
            <Button asChild size="sm" className="w-full">
              <Link href="/admin/resources">Manage Resources <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow md:col-span-2 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">Operational</div>
            <p className="text-xs text-muted-foreground">All systems functioning</p>
          </CardContent>
           <CardFooter>
             <Button asChild variant="outline" size="sm" className="w-full">
               <a href="https://roboconoxon.instatus.com" target="_blank" rel="noopener noreferrer">
                 View Status Page <ExternalLink className="ml-2 h-4 w-4" />
               </a>
            </Button>
          </CardFooter>
        </Card>
        
        {activeAnnouncement && (
          <Card className="md:col-span-2 lg:col-span-4 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Announcement</CardTitle>
              <Megaphone className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <Alert variant={activeAnnouncement.alertType === "emergency" ? "destructive" : "default"} className="mb-2">
                <AlertTitle className="capitalize">{activeAnnouncement.alertType}</AlertTitle>
                <AlertDescription>{activeAnnouncement.content}</AlertDescription>
              </Alert>
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="mr-1.5 h-3.5 w-3.5" /> Active for: {timeSinceAnnouncement}
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild size="sm" className="w-full">
                <Link href="/admin/announcements">Manage Announcements <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </CardFooter>
          </Card>
        )}
         {!activeAnnouncement && !isLoading && (
           <Card className="md:col-span-2 lg:col-span-4 shadow-lg">
             <CardHeader>
                <CardTitle className="text-sm font-medium">Active Announcement</CardTitle>
             </CardHeader>
             <CardContent>
                <p className="text-muted-foreground">No active announcements at the moment.</p>
             </CardContent>
             <CardFooter>
                <Button asChild size="sm" className="w-full">
                    <Link href="/admin/announcements">Manage Announcements <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
             </CardFooter>
           </Card>
        )}
      </div>
    </div>
  );
}
