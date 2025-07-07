
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Team, User, NotificationTargetType, NotificationCategory, LucideIconName } from "@/lib/types";
import { loadTeams } from "@/actions/teamActions";
import { loadUsers } from "@/actions/userActions";
import { createNotificationsForUserIds } from "@/actions/notificationActions";
import { Send, Loader2, Info, AlertTriangle, FileText, Users as UsersIcon, ClipboardCheck, Megaphone as MegaphoneIcon } from "lucide-react"; // Added ClipboardCheck, MegaphoneIcon

// Define LucideIcons map and NotificationIcon component locally for this page
const LocalLucideIcons: Partial<Record<LucideIconName, React.ElementType>> = {
  Info,
  Megaphone: MegaphoneIcon,
  FileText,
  Users: UsersIcon,
  ClipboardCheck,
};

const NotificationIconDisplay = ({ iconName, ...props }: { iconName?: LucideIconName } & React.ComponentProps<typeof Info>) => {
  if (!iconName) return <Info {...props} />;
  const IconComponent = LocalLucideIcons[iconName] || Info;
  return <IconComponent {...props} />;
};


const iconOptions: { value: LucideIconName; label: string; icon: React.ElementType }[] = [
  { value: "Info", label: "Info", icon: Info },
  { value: "Megaphone", label: "Announcement", icon: MegaphoneIcon },
  { value: "FileText", label: "Document/Resource", icon: FileText },
  { value: "Users", label: "User/Team", icon: UsersIcon },
  { value: "ClipboardCheck", label: "Task/Progress", icon: ClipboardCheck },
];


export default function AdminSendNotificationPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [targetType, setTargetType] = useState<NotificationTargetType>("all_participants");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationLink, setNotificationLink] = useState("");
  const [notificationIcon, setNotificationIcon] = useState<LucideIconName>("Info");

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedTeams, loadedUsers] = await Promise.all([loadTeams(), loadUsers()]);
      setTeams(loadedTeams);
      setUsers(loadedUsers);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load teams or users.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast({ title: "Missing Fields", description: "Title and Message are required.", variant: "destructive" });
      return;
    }

    setIsSending(true);
    let userIdsToNotify: string[] = [];
    let category: NotificationCategory = 'admin_manual';

    switch (targetType) {
      case 'all_users':
        userIdsToNotify = users.map(u => u.id);
        break;
      case 'all_participants':
        userIdsToNotify = users.filter(u => u.role === 'participant').map(u => u.id);
        break;
      case 'all_admins':
        userIdsToNotify = users.filter(u => u.role === 'admin').map(u => u.id);
        break;
      case 'team':
        if (!selectedTeamId) {
          toast({ title: "No Team Selected", description: "Please select a team.", variant: "destructive" });
          setIsSending(false);
          return;
        }
        userIdsToNotify = users.filter(u => u.teamId === selectedTeamId).map(u => u.id);
        break;
      case 'user':
        if (!selectedUserId) {
          toast({ title: "No User Selected", description: "Please select a user.", variant: "destructive" });
          setIsSending(false);
          return;
        }
        userIdsToNotify = [selectedUserId];
        break;
    }

    if (userIdsToNotify.length === 0) {
      toast({ title: "No Recipients", description: "No users found for the selected target.", variant: "default" });
      setIsSending(false);
      return;
    }

    try {
      await createNotificationsForUserIds(
        userIdsToNotify,
        notificationTitle,
        notificationMessage,
        category,
        notificationLink || undefined,
        notificationIcon
      );
      toast({ title: "Notification Sent", description: `Sent to ${userIdsToNotify.length} user(s).` });
      // Reset form
      setNotificationTitle("");
      setNotificationMessage("");
      setNotificationLink("");
      setSelectedTeamId("");
      setSelectedUserId("");
      setTargetType("all_participants");
    } catch (error) {
      toast({ title: "Error Sending Notification", description: "An error occurred.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Send Custom Notification</h1>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Compose Notification</CardTitle>
          <CardDescription>Send a targeted message to users or teams.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="targetType">Target</Label>
            <Select value={targetType} onValueChange={(value) => {
              setTargetType(value as NotificationTargetType);
              setSelectedTeamId("");
              setSelectedUserId("");
            }}>
              <SelectTrigger id="targetType">
                <SelectValue placeholder="Select target audience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_participants">All Participants</SelectItem>
                <SelectItem value="all_admins">All Admins</SelectItem>
                <SelectItem value="all_users">All Users (Participants & Admins)</SelectItem>
                <SelectItem value="team">Specific Team</SelectItem>
                <SelectItem value="user">Specific User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {targetType === 'team' && (
            <div>
              <Label htmlFor="selectedTeamId">Select Team</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger id="selectedTeamId">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name} ({team.schoolName})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {targetType === 'user' && (
            <div>
              <Label htmlFor="selectedUserId">Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="selectedUserId">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectGroup>
                    <SelectLabel>Admins</SelectLabel>
                    {users.filter(u=>u.role === 'admin').map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name} ({user.username}) - Admin</SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Participants</SelectLabel>
                     {users.filter(u=>u.role === 'participant').map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.username}) - Team: {teams.find(t=>t.id === user.teamId)?.name || 'N/A'}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="notificationTitle">Title</Label>
            <Input id="notificationTitle" value={notificationTitle} onChange={(e) => setNotificationTitle(e.target.value)} placeholder="Notification Title" />
          </div>

          <div>
            <Label htmlFor="notificationMessage">Message</Label>
            <Textarea id="notificationMessage" value={notificationMessage} onChange={(e) => setNotificationMessage(e.target.value)} placeholder="Notification content..." rows={4} />
          </div>

          <div>
            <Label htmlFor="notificationLink">Link (Optional)</Label>
            <Input id="notificationLink" value={notificationLink} onChange={(e) => setNotificationLink(e.target.value)} placeholder="e.g., /my-team or https://example.com" />
          </div>

          <div>
            <Label htmlFor="notificationIcon">Icon (Optional)</Label>
            <Select value={notificationIcon} onValueChange={(value) => setNotificationIcon(value as LucideIconName)}>
                <SelectTrigger id="notificationIcon">
                    <div className="flex items-center gap-2">
                        <NotificationIconDisplay iconName={notificationIcon} className="h-4 w-4" />
                        <SelectValue placeholder="Select an icon" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    {iconOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                                <opt.icon className="h-4 w-4" />
                                {opt.label}
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>


          <Button onClick={handleSubmitNotification} disabled={isSending} className="w-full sm:w-auto">
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Notification
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

