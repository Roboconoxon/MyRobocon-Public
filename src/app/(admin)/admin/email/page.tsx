
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Team, User, EmailTargetType, EmailTemplate } from "@/lib/types";
import { loadTeams } from "@/actions/teamActions";
import { loadUsers } from "@/actions/userActions";
import { sendBulkEmail } from "@/actions/emailActions";
import { loadEmailTemplates } from "@/actions/emailTemplateActions";
import { addScheduledEmail } from "@/actions/scheduledEmailActions";
import {
  Send,
  Loader2,
  Eye,
  Mail,
  Users as UsersIcon,
  User as UserIcon,
  Shield,
  Clock,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

export default function EmailCampaignPage() {
  const [isSending, setIsSending] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [targetType, setTargetType] = useState<EmailTargetType>("all_participants");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const [scheduleEmail, setScheduleEmail] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("12:00");


  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedTeams, loadedUsers, loadedTemplates] = await Promise.all([
        loadTeams(),
        loadUsers(),
        loadEmailTemplates(),
      ]);
      setTeams(loadedTeams);
      setUsers(loadedUsers);
      setEmailTemplates(loadedTemplates);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load initial data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSendEmail = async () => {
    if (!subject.trim() || !htmlBody.trim()) {
      toast({ title: "Missing Fields", description: "Subject and HTML Body are required.", variant: "destructive" });
      return;
    }
    if (targetType === "team" && !selectedTeamId) {
      toast({ title: "No Team Selected", description: "Please select a team.", variant: "destructive" });
      return;
    }

    if (scheduleEmail) {
      if (!scheduledDate) {
        toast({ title: "Missing Date", description: "Please select a date for scheduling.", variant: "destructive" });
        return;
      }
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      const finalScheduledAt = new Date(scheduledDate);
      finalScheduledAt.setHours(hours, minutes);

      if (finalScheduledAt < new Date()) {
        toast({ title: "Invalid Date", description: "Scheduled time cannot be in the past.", variant: "destructive" });
        return;
      }
      
      setIsSending(true);
      try {
        await addScheduledEmail({
          targetType,
          subject,
          htmlBody,
          teamId: selectedTeamId || undefined,
          scheduledAt: finalScheduledAt.toISOString(),
        });
        toast({ title: "Email Scheduled!", description: `Your email campaign has been scheduled for ${format(finalScheduledAt, "PPP p")}.`});
        // Reset form
        setSubject("");
        setHtmlBody("");
      } catch (error: any) {
        toast({ title: "Scheduling Failed", description: error.message || "Could not schedule the email.", variant: "destructive" });
      } finally {
        setIsSending(false);
      }
    } else {
      // Send immediately
      setIsSending(true);
      try {
        const result = await sendBulkEmail(targetType, subject, htmlBody, selectedTeamId || undefined);
        if (result.success) {
          toast({ title: "Emails Sent!", description: `Successfully sent emails to ${result.sentCount} recipients.` });
          setSubject("");
          setHtmlBody("");
          setTargetType("all_participants");
          setSelectedTeamId("");
        } else {
          throw new Error(result.error);
        }
      } catch (error: any) {
        toast({ title: "Failed to Send Emails", description: error.message || "An unexpected error occurred.", variant: "destructive" });
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === "none") {
      setSubject("");
      setHtmlBody("");
      return;
    }
    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setHtmlBody(template.htmlBody);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Compose Email</CardTitle>
          <CardDescription>
            Create and send personalized bulk emails. Use placeholders like
            <code className="bg-muted px-1 py-0.5 rounded-sm text-xs mx-1">
              {'{{name}}'}
            </code>,
            <code className="bg-muted px-1 py-0.5 rounded-sm text-xs mx-1">
              {'{{teamName}}'}
            </code>, and
            <code className="bg-muted px-1 py-0.5 rounded-sm text-xs mx-1">
              {'{{schoolName}}'}
            </code>
            in the subject and body.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="template">Load from Template (Optional)</Label>
            <Select onValueChange={handleTemplateSelect}>
              <SelectTrigger id="template">
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                 <SelectItem value="none">-- Start from Scratch --</SelectItem>
                {emailTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="targetType">Recipient Group</Label>
              <Select
                value={targetType}
                onValueChange={(value) => {
                  setTargetType(value as EmailTargetType);
                  setSelectedTeamId("");
                }}
              >
                <SelectTrigger id="targetType">
                  <SelectValue placeholder="Select target audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_participants">
                    <div className="flex items-center">
                      <UsersIcon className="mr-2 h-4 w-4" /> All Participants
                    </div>
                  </SelectItem>
                  <SelectItem value="all_admins">
                    <div className="flex items-center">
                      <Shield className="mr-2 h-4 w-4" /> All Admins
                    </div>
                  </SelectItem>
                  <SelectItem value="all_users">
                    <div className="flex items-center">
                      <Mail className="mr-2 h-4 w-4" /> All Users (Admins &
                      Participants)
                    </div>
                  </SelectItem>
                  <SelectItem value="team">
                    <div className="flex items-center">
                      <UserIcon className="mr-2 h-4 w-4" /> Specific Team
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetType === "team" && (
              <div>
                <Label htmlFor="selectedTeamId">Select Team</Label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger id="selectedTeamId">
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} ({team.schoolName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Your Email Subject"
            />
          </div>

          <div>
            <Label htmlFor="htmlBody">HTML Body</Label>
            <Textarea
              id="htmlBody"
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              placeholder="Paste your email's HTML code here..."
              className="min-h-[300px] font-mono text-xs"
            />
          </div>

          <Card className="p-4 bg-muted/50">
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                id="scheduleEmail"
                checked={scheduleEmail}
                onChange={(e) => setScheduleEmail(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="scheduleEmail">Schedule for later</Label>
            </div>
            {scheduleEmail && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {scheduledDate ? format(scheduledDate, 'PPP') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus />
                  </PopoverContent>
                </Popover>
                <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
              </div>
            )}
          </Card>


          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleSendEmail} disabled={isSending}>
              {isSending ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : 
                scheduleEmail ? <Clock className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />
              }
              {scheduleEmail ? 'Schedule Email' : 'Send Email'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPreviewOpen(true)}
              disabled={!htmlBody.trim()}
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview Email
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
            <DialogDescription>
              This is a preview of how your raw HTML will be rendered.
              Placeholders are not replaced in this view.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 border rounded-md overflow-hidden">
            <iframe
              srcDoc={htmlBody}
              title="Email Preview"
              className="w-full h-full"
              sandbox=""
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
