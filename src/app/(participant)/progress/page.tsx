
"use client";

import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, UploadCloud, ClipboardList, CheckCircle, Clock, Image as ImageIconLucide, FileImage, BadgeCheck, ThumbsDown, HelpCircle } from "lucide-react";
import type { ProgressSubmission, ProgressSubmissionStatus, SiteSettings } from "@/lib/types";
import { useEffect, useState, useCallback, FormEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { loadProgressSubmissions, submitProgress } from "@/actions/progressActions";
import { loadSettings } from "@/actions/settingsActions";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow, parseISO } from 'date-fns';

const getProgressStatusBadge = (status: ProgressSubmissionStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3"/>Pending Review</Badge>;
      case "reviewed":
        return <Badge variant="outline" className="border-blue-500 text-blue-600"><CheckCircle className="mr-1 h-3 w-3"/>Reviewed</Badge>;
      case "approved":
        return <Badge className="bg-green-600 hover:bg-green-700"><BadgeCheck className="mr-1 h-3 w-3"/>Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><ThumbsDown className="mr-1 h-3 w-3"/>Rejected</Badge>;
      default:
        return <Badge variant="outline"><HelpCircle className="mr-1 h-3 w-3"/>Unknown</Badge>;
    }
};

export default function TeamProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const [teamProgressSubmissions, setTeamProgressSubmissions] = useState<ProgressSubmission[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { toast } = useToast();

  const [newProgressImageFile, setNewProgressImageFile] = useState<File | null>(null);
  const [newProgressImageDataUri, setNewProgressImageDataUri] = useState<string | null>(null);
  const [newProgressDescription, setNewProgressDescription] = useState("");
  const [isSubmittingProgress, setIsSubmittingProgress] = useState(false);
  const [isPreviewError, setIsPreviewError] = useState(false);
  
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [totalApprovedPoints, setTotalApprovedPoints] = useState(0);


  const fetchProgressData = useCallback(async () => {
    if (!user || !user.teamId) {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      const [allProgress, currentSettings] = await Promise.all([
        loadProgressSubmissions(),
        loadSettings()
      ]);
      
      setSiteSettings(currentSettings);

      const teamSubmissions = allProgress
        .filter(p => p.teamId === user.teamId)
        .sort((a,b) => parseISO(b.submittedAt).getTime() - parseISO(a.submittedAt).getTime() );
      setTeamProgressSubmissions(teamSubmissions);

      const approvedPoints = teamSubmissions
        .filter(s => s.status === 'approved' && s.points !== null)
        .reduce((sum, s) => sum + (s.points || 0), 0);
      setTotalApprovedPoints(approvedPoints);

    } catch (error) {
      console.error("Failed to load team progress data:", error);
      toast({title: "Error", description: "Could not load progress submissions or settings.", variant: "destructive"});
    } finally {
      setIsLoadingData(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      fetchProgressData();
    }
  }, [authLoading, fetchProgressData]);

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "File Too Large", description: "Please upload an image smaller than 5MB.", variant: "destructive"});
        setNewProgressImageFile(null);
        setNewProgressImageDataUri(null);
        event.target.value = ""; 
        return;
      }
      setNewProgressImageFile(file);
      setIsPreviewError(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProgressImageDataUri(reader.result as string);
      };
      reader.onerror = () => {
        setIsPreviewError(true);
        setNewProgressImageDataUri(null);
        toast({title: "Error", description: "Could not read image file.", variant: "destructive"});
      }
      reader.readAsDataURL(file);
    } else {
      setNewProgressImageFile(null);
      setNewProgressImageDataUri(null);
    }
  };

  const handleProgressSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !user.teamId) {
        toast({ title: "Error", description: "User or team ID missing.", variant: "destructive" });
        return;
    }
    
    const imageUriToSubmit = newProgressImageDataUri;
    if (!imageUriToSubmit && !newProgressDescription.trim()) {
        toast({ title: "Missing Information", description: "Please upload an image or provide a description.", variant: "destructive" });
        return;
    }
     if (!newProgressDescription.trim()) {
        toast({ title: "Missing Information", description: "Please provide a description.", variant: "destructive" });
        return;
    }

    setIsSubmittingProgress(true);
    const result = await submitProgress(user.teamId, imageUriToSubmit, newProgressDescription);
    if (result.success && result.submission) {
        setTeamProgressSubmissions(prev => [result.submission!, ...prev].sort((a,b) => parseISO(b.submittedAt).getTime() - parseISO(a.submittedAt).getTime() ));
        setNewProgressImageFile(null);
        setNewProgressImageDataUri(null);
        setNewProgressDescription("");
        setIsPreviewError(false);
        const fileInput = document.getElementById('progressImageFile') as HTMLInputElement;
        if (fileInput) fileInput.value = "";

        toast({ title: "Progress Submitted!", description: "Your update has been sent for review." });
    } else {
        toast({ title: "Submission Failed", description: result.error || "Could not submit your progress.", variant: "destructive" });
    }
    setIsSubmittingProgress(false);
  };

  useEffect(() => {
    if (!newProgressImageDataUri) {
      setIsPreviewError(false);
    }
  }, [newProgressImageDataUri]);

  if (authLoading || isLoadingData) {
    return (
      <div className="container mx-auto p-4 text-center flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user || !user.teamId) {
     return <div className="container mx-auto p-4 text-center">User not authenticated or not assigned to a team.</div>;
  }
  
  const maxPoints = siteSettings?.maxProgressPointsPerTeam;
  const progressPercentage = (maxPoints && maxPoints > 0) ? (totalApprovedPoints / maxPoints) * 100 : 0;


  return (
    <div className="container mx-auto p-4 md:p-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold font-headline text-center md:text-left">Team Progress</h1>
        {maxPoints !== null && (
          <Card className="w-full md:w-auto md:min-w-[300px] shadow-sm">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm font-medium">Progress Points Quota</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <Progress value={progressPercentage} className="w-full h-3 mb-1" />
              <p className="text-xs text-muted-foreground text-center">
                {totalApprovedPoints} / {maxPoints} points earned
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center"><UploadCloud className="mr-2 h-6 w-6 text-primary"/>Submit Progress Update</CardTitle>
          <CardDescription>Upload an image and provide a description of your team's progress. Admins will review it.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProgressSubmit} className="space-y-4">
            <div>
              <Label htmlFor="progressImageFile">Upload Image (Optional, Max 5MB)</Label>
              <Input 
                id="progressImageFile" 
                type="file" 
                accept="image/png, image/jpeg, image/gif, image/webp"
                onChange={handleImageFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {newProgressImageDataUri && !isPreviewError && (
                  <div className="mt-3 p-2 border rounded-md inline-block">
                      <Image 
                        src={newProgressImageDataUri} 
                        alt="Image preview" 
                        width={200} 
                        height={150} 
                        className="rounded-md object-contain" 
                        data-ai-hint="progress image preview" 
                        onError={() => {
                            setIsPreviewError(true);
                            toast({title: "Preview Error", description: "Could not load image preview from selected file.", variant: "destructive"})
                        }}
                      />
                      {newProgressImageFile && <p className="text-xs text-muted-foreground mt-1 text-center">{newProgressImageFile.name}</p>}
                  </div>
              )}
              {isPreviewError && (
                 <p className="text-sm text-destructive mt-1">Could not load image preview. Please try a different image or check the file type.</p>
              )}
            </div>
            <div>
              <Label htmlFor="progressDescription">Description (Required)</Label>
              <Textarea 
                id="progressDescription" 
                value={newProgressDescription}
                onChange={(e) => setNewProgressDescription(e.target.value)}
                placeholder="Describe your progress, what you've built, or challenges overcome." 
                rows={4} 
                required 
              />
            </div>
            <Button type="submit" disabled={isSubmittingProgress} className="w-full sm:w-auto">
              {isSubmittingProgress ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Submit Progress
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
          <CardHeader>
              <CardTitle className="text-xl font-headline flex items-center"><ClipboardList className="mr-2 h-6 w-6 text-primary"/>Your Submissions</CardTitle>
              <CardDescription>Review your past progress updates and any feedback from administrators.</CardDescription>
          </CardHeader>
          <CardContent>
              {teamProgressSubmissions.length > 0 ? (
                  <div className="space-y-6">
                      {teamProgressSubmissions.map(submission => (
                          <Card key={submission.id} className="bg-muted/30 border-border/70">
                              <CardHeader className="pb-3">
                                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                                      <div>
                                          <CardTitle className="text-lg flex items-center">
                                              <FileImage className="mr-2 h-5 w-5 text-primary/80" /> 
                                              Update: {formatDistanceToNow(parseISO(submission.submittedAt), { addSuffix: true })}
                                          </CardTitle>
                                          <CardDescription className="text-xs mt-1">Status: {getProgressStatusBadge(submission.status)}</CardDescription>
                                      </div>
                                      {(submission.status === 'reviewed' || submission.status === 'approved') && submission.points !== null && (
                                          <Badge className="text-lg px-3 py-1" variant={submission.status === 'approved' ? 'default' : 'secondary'}>
                                            {submission.points} pts
                                          </Badge>
                                      )}
                                       {submission.status === 'rejected' && (
                                          <Badge className="text-lg px-3 py-1" variant="destructive">
                                            0 pts
                                          </Badge>
                                      )}
                                  </div>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                  {submission.imageUrl && submission.status !== 'approved' && submission.status !== 'rejected' ? (
                                    <div className="mx-auto w-full max-w-md">
                                        <Image src={submission.imageUrl} alt="Submitted progress" width={400} height={300} className="rounded-md border object-contain mx-auto" data-ai-hint="team progress submission"/>
                                    </div>
                                  ) : (submission.status === 'approved' || submission.status === 'rejected') && submission.imageUrl ? (
                                    <p className="text-sm text-muted-foreground italic p-3 bg-background/50 border rounded-md">Image no longer displayed for {submission.status} submissions.</p>
                                  ) : !submission.imageUrl ? (
                                    <p className="text-sm text-muted-foreground">No image submitted.</p>
                                  ) : null}
                                  <p className="text-sm"><span className="font-semibold">Your Description:</span> {submission.description}</p>
                                  {(submission.status === 'reviewed' || submission.status === 'approved' || submission.status === 'rejected') && (
                                      <div className="p-3 bg-background/70 border rounded-md mt-2 shadow-sm">
                                          <p className="text-sm font-semibold text-primary">Admin Feedback:</p>
                                          <p className="text-sm text-muted-foreground italic whitespace-pre-wrap">
                                              {submission.reviewerComments || (submission.status === 'rejected' ? "No specific comments provided for rejection." : "No comments provided.") }
                                          </p>
                                          {submission.reviewedAt && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                              Feedback from {formatDistanceToNow(parseISO(submission.reviewedAt), { addSuffix: true })} by admin.
                                          </p>
                                          )}
                                      </div>
                                  )}
                              </CardContent>
                          </Card>
                      ))}
                  </div>
              ) : (
                  <p className="text-muted-foreground text-center py-6">You haven't submitted any progress updates yet. Use the form above to share your first one!</p>
              )}
          </CardContent>
      </Card>
    </div>
  );
}

    
