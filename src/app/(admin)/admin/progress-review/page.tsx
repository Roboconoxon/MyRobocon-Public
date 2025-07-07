
"use client";

import { useState, useEffect, useCallback, ChangeEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Edit, Save, CheckCircle, Clock, FileImage, XCircle, Download, Trash2, BadgeCheck, AlertTriangle, ThumbsDown, HelpCircle } from "lucide-react";
import type { ProgressSubmission, ProgressSubmissionStatus } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription as UiCardDescription } from "@/components/ui/card";
import { loadProgressSubmissions, reviewProgress, approveProgressSubmission, clearProgressImage, rejectProgressSubmission, deleteProgressSubmission } from "@/actions/progressActions";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as UiAlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { loadSettings } from "@/actions/settingsActions";

export default function ProgressReviewPage() {
  const [submissions, setSubmissions] = useState<ProgressSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState<ProgressSubmission | null>(null);
  const [reviewPoints, setReviewPoints] = useState<number | string>("");
  const [reviewerComments, setReviewerComments] = useState("");
  const { toast } = useToast();
  const { user: adminUser } = useAuth();
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isImagePreviewModalOpen, setIsImagePreviewModalOpen] = useState(false);
  const [maxPointsPerTeam, setMaxPointsPerTeam] = useState<number | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [loadedSubmissions, siteSettings] = await Promise.all([
        loadProgressSubmissions(),
        loadSettings()
      ]);
      setSubmissions(loadedSubmissions.sort((a,b) => parseISO(b.submittedAt).getTime() - parseISO(a.submittedAt).getTime() ));
      setMaxPointsPerTeam(siteSettings.maxProgressPointsPerTeam);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load initial data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleOpenReviewModal = (submission: ProgressSubmission) => {
    setCurrentSubmission(submission);
    setReviewPoints(submission.points === null ? "" : String(submission.points));
    setReviewerComments(submission.reviewerComments ?? "");
    setIsReviewModalOpen(true);
  };

  const updateLocalSubmissions = (updatedSubmission: ProgressSubmission) => {
     setSubmissions(prev =>
        prev.map(s => s.id === updatedSubmission.id ? updatedSubmission : s)
          .sort((a,b) => parseISO(b.submittedAt).getTime() - parseISO(a.submittedAt).getTime() )
      );
      setCurrentSubmission(updatedSubmission); // Keep the modal updated if it's open
  };

  const handleSaveReview = async () => {
    if (!currentSubmission || !adminUser) return;

    const pointsValue = reviewPoints === "" ? null : Number(reviewPoints);
    if (reviewPoints !== "" && isNaN(Number(reviewPoints))) {
        toast({ title: "Error", description: "Points must be a number or empty.", variant: "destructive" });
        return;
    }
    if (pointsValue !== null && pointsValue < 0) {
         toast({ title: "Error", description: "Points cannot be negative.", variant: "destructive" });
        return;
    }

    setIsSubmittingReview(true);
    const result = await reviewProgress(currentSubmission.id, pointsValue, reviewerComments, adminUser.id);
    if (result.success && result.submission) {
      updateLocalSubmissions(result.submission);
      toast({ title: "Review Saved", description: `Submission from ${result.submission.teamName} has been reviewed.` });
    } else {
      toast({ title: "Error", description: result.error || "Failed to save review.", variant: "destructive" });
    }
    setIsSubmittingReview(false);
  };

  const handleApproveSubmission = async () => {
    if (!currentSubmission || !adminUser) return;
    setIsSubmittingReview(true);
    const result = await approveProgressSubmission(currentSubmission.id, adminUser.id);
    if (result.success && result.submission) {
      updateLocalSubmissions(result.submission);
      toast({ title: "Submission Approved", description: `${result.submission.teamName}'s update approved.` });
    } else {
      toast({ title: "Approval Failed", description: result.error || "Could not approve submission.", variant: "destructive" });
    }
    setIsSubmittingReview(false);
  };

  const handleRejectSubmission = async () => {
    if (!currentSubmission || !adminUser) return;
    if (!reviewerComments.trim()) {
        toast({ title: "Comments Required", description: "Please provide comments when rejecting a submission.", variant: "destructive" });
        return;
    }
    setIsSubmittingReview(true);
    const result = await rejectProgressSubmission(currentSubmission.id, reviewerComments, adminUser.id);
    if (result.success && result.submission) {
        updateLocalSubmissions(result.submission);
        toast({ title: "Submission Rejected", description: `${result.submission.teamName}'s update has been rejected.` });
    } else {
        toast({ title: "Rejection Failed", description: result.error || "Could not reject submission.", variant: "destructive" });
    }
    setIsSubmittingReview(false);
  };

  const handleDeletePermanently = async () => {
    if (!currentSubmission) return;
    setIsSubmittingReview(true);
    const result = await deleteProgressSubmission(currentSubmission.id);
    if (result.success) {
        setSubmissions(prev => prev.filter(s => s.id !== currentSubmission.id));
        toast({ title: "Submission Deleted", description: "The submission has been permanently deleted." });
        setIsReviewModalOpen(false);
        setCurrentSubmission(null);
    } else {
        toast({ title: "Deletion Failed", description: result.error || "Could not delete submission.", variant: "destructive" });
    }
    setIsSubmittingReview(false);
    setIsDeleteConfirmOpen(false);
  };


  const handleClearImage = async () => {
    if (!currentSubmission) return;
    setIsSubmittingReview(true);
    const result = await clearProgressImage(currentSubmission.id);
    if (result.success && result.submission) {
      updateLocalSubmissions(result.submission);
      toast({ title: "Image Data Cleared", description: "The image data for this submission has been cleared." });
    } else {
      toast({ title: "Error", description: result.error || "Failed to clear image data.", variant: "destructive" });
    }
    setIsSubmittingReview(false);
  };

  const handleDownloadImage = () => {
    if (currentSubmission && currentSubmission.imageUrl) {
        const link = document.createElement('a');
        link.href = currentSubmission.imageUrl;

        const mimeTypeMatch = currentSubmission.imageUrl.match(/^data:(image\/[a-z]+);/);
        const extension = mimeTypeMatch ? `.${mimeTypeMatch[1].split('/')[1]}` : '.png';

        link.download = `progress_${currentSubmission.teamName}_${currentSubmission.id}${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({title: "Image Download Started"});
    } else {
        toast({title: "Error", description: "No image URL found for this submission.", variant: "destructive"});
    }
  };

  const getStatusBadge = (status: ProgressSubmissionStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3"/>Pending</Badge>;
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

  const getTableRowButtonText = (status: ProgressSubmissionStatus) => {
    switch (status) {
      case "pending": return "Review";
      case "reviewed":
      case "approved":
      case "rejected":
        return "Manage";
      default: return "View";
    }
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const canEditPoints = currentSubmission?.status !== 'approved' && currentSubmission?.status !== 'rejected';
  const canEditComments = true;
  const canApprove = currentSubmission?.status === 'reviewed' && currentSubmission?.points !== null;
  const canReject = currentSubmission?.status === 'pending' || currentSubmission?.status === 'reviewed';


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Progress Review</h1>
       {maxPointsPerTeam !== null && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
          <p className="text-sm flex items-center">
            <CheckCircle className="h-4 w-4 mr-2" />
            Teams can earn a maximum of <strong className="mx-1">{maxPointsPerTeam} points</strong> from approved progress submissions.
          </p>
        </div>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Team Submissions</CardTitle>
          <UiCardDescription>Review progress updates submitted by teams.</UiCardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead className="max-w-xs">Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">{submission.teamName}</TableCell>
                    <TableCell>
                      {submission.imageUrl ? (
                        <button className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => {setCurrentSubmission(submission); setIsImagePreviewModalOpen(true);}}>
                            <Image src={submission.imageUrl} alt={`Preview for ${submission.teamName}`} width={80} height={60} className="rounded-md object-cover border" data-ai-hint="team progress image"/>
                        </button>
                      ) : (
                         <div className="w-[80px] h-[60px] flex items-center justify-center bg-muted rounded-md border text-muted-foreground text-xs">
                           No Image
                         </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={submission.description}>{submission.description}</TableCell>
                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
                    <TableCell>{submission.points ?? '-'}</TableCell>
                    <TableCell title={parseISO(submission.submittedAt).toLocaleString()}>
                      {formatDistanceToNow(parseISO(submission.submittedAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleOpenReviewModal(submission)}>
                        <Edit className="mr-2 h-4 w-4" /> {getTableRowButtonText(submission.status)}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">No progress submissions yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Main Review Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Submission: {currentSubmission?.teamName}</DialogTitle>
            <DialogDescription asChild>
              <div> {/* Changed from p to div */}
                Current Status: {currentSubmission ? getStatusBadge(currentSubmission.status) : 'N/A'}.
                Assign points and provide feedback.
              </div>
            </DialogDescription>
          </DialogHeader>
          {currentSubmission && (
            <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <Label>Submitted Image</Label>
                {currentSubmission.imageUrl ? (
                  <div className="mt-1 relative">
                    <Image src={currentSubmission.imageUrl} alt={`Image from ${currentSubmission.teamName}`} width={400} height={300} className="rounded-md border object-contain mx-auto" data-ai-hint="team progress image"/>
                    <div className="flex flex-wrap gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={handleDownloadImage}>
                            <Download className="mr-2 h-4 w-4" /> Download Image
                        </Button>
                        {(currentSubmission.status === 'approved' || currentSubmission.status === 'rejected') && currentSubmission.imageUrl && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={isSubmittingReview}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Clear Image Data
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Clear Image Data</AlertDialogTitle>
                                    <UiAlertDialogDescription>
                                    Are you sure you want to permanently clear the image data for this submission? This cannot be undone. The submission details (description, points, comments) will remain.
                                    </UiAlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleClearImage} disabled={isSubmittingReview} className="bg-destructive hover:bg-destructive/90">
                                    {isSubmittingReview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Clear Image Data
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                    </div>
                  </div>
                ) : (
                   <p className="mt-1 text-sm p-3 bg-muted rounded-md border text-muted-foreground">No image data for this submission.</p>
                )}
              </div>
              <div>
                <Label>Description</Label>
                <p className="mt-1 text-sm p-3 bg-muted rounded-md border whitespace-pre-wrap">{currentSubmission.description}</p>
              </div>
              <div>
                <Label htmlFor="reviewPoints">Points Awarded</Label>
                <Input
                  id="reviewPoints"
                  type="number"
                  value={reviewPoints}
                  onChange={(e) => setReviewPoints(e.target.value)}
                  placeholder="Enter points (e.g., 10)"
                  disabled={isSubmittingReview || !canEditPoints}
                />
                 {!canEditPoints && <p className="text-xs text-muted-foreground mt-1">Points cannot be changed for {currentSubmission.status} submissions.</p>}
              </div>
              <div>
                <Label htmlFor="reviewerComments">Reviewer Comments</Label>
                <Textarea
                  id="reviewerComments"
                  value={reviewerComments}
                  onChange={(e) => setReviewerComments(e.target.value)}
                  placeholder="Provide feedback here..."
                  rows={4}
                  disabled={isSubmittingReview || !canEditComments}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Submitted: {formatDistanceToNow(parseISO(currentSubmission.submittedAt), { addSuffix: true })}
              </p>
              {currentSubmission.reviewedAt && (
                <p className="text-xs text-muted-foreground">
                  Last review activity: {formatDistanceToNow(parseISO(currentSubmission.reviewedAt), { addSuffix: true })} by {currentSubmission.reviewedBy}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="sm:justify-between flex-wrap gap-2">
            <div className="flex flex-wrap gap-2">
                <Button
                    onClick={handleSaveReview}
                    disabled={isSubmittingReview || (!canEditPoints && !canEditComments)}
                    variant="secondary"
                >
                    {isSubmittingReview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {currentSubmission?.status === 'approved' || currentSubmission?.status === 'rejected' ? 'Update Comments' : 'Save Review Details'}
                </Button>

                {canApprove && (
                    <Button onClick={handleApproveSubmission} disabled={isSubmittingReview || currentSubmission?.points === null}>
                        {isSubmittingReview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Finalize & Approve
                    </Button>
                )}

                 {currentSubmission?.status === 'pending' && reviewPoints !== "" && Number(reviewPoints) >= 0 && (
                    <Button onClick={handleApproveSubmission} disabled={isSubmittingReview}>
                        {isSubmittingReview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save & Approve
                    </Button>
                )}
                {canReject && (
                     <Button variant="outline" onClick={handleRejectSubmission} disabled={isSubmittingReview || !reviewerComments.trim()} className="text-amber-600 border-amber-500 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:border-amber-600 dark:hover:bg-amber-900/50 dark:hover:text-amber-300">
                        {isSubmittingReview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <ThumbsDown className="mr-2 h-4 w-4"/> Reject Submission
                    </Button>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isSubmittingReview}>
                            <Trash2 className="mr-2 h-4 w-4"/> Delete Permanently
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Permanent Deletion</AlertDialogTitle>
                            <UiAlertDialogDescription>
                            Are you absolutely sure you want to permanently delete this submission from "{currentSubmission?.teamName}"? This action cannot be undone and will remove all traces of this submission.
                            </UiAlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeletePermanently} disabled={isSubmittingReview} className="bg-destructive hover:bg-destructive/90">
                            {isSubmittingReview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete Permanently
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <DialogClose asChild><Button variant="outline" disabled={isSubmittingReview}>Close</Button></DialogClose>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal (for table row click) */}
      <Dialog open={isImagePreviewModalOpen} onOpenChange={setIsImagePreviewModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Image Preview: {currentSubmission?.teamName}</DialogTitle>
             <DialogDescription>Submitted: {currentSubmission ? formatDistanceToNow(parseISO(currentSubmission.submittedAt), { addSuffix: true }) : 'N/A'}</DialogDescription>
          </DialogHeader>
          {currentSubmission?.imageUrl && (
            <div className="py-4 flex justify-center items-center max-h-[80vh] overflow-auto">
              <Image src={currentSubmission.imageUrl} alt={`Full image from ${currentSubmission.teamName}`} width={800} height={600} className="rounded-md border object-contain" data-ai-hint="team progress large image"/>
            </div>
          )}
           {!currentSubmission?.imageUrl && (
                <p className="py-4 text-center text-muted-foreground">No image available for this submission.</p>
            )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImagePreviewModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
    

    