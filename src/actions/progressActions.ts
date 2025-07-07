
'use server';

import { readDataFile, writeDataFile } from '@/lib/file-utils';
import type { ProgressSubmission, ProgressSubmissionStatus, User } from '@/lib/types';
import { loadTeams } from './teamActions'; 
import { loadSettings } from './settingsActions';
import { createNotificationsForUserIds } from './notificationActions';
import { loadUsers } from './userActions';
import { sendEmail } from '@/services/emailService';
import { loadEmailTemplates } from './emailTemplateActions';

const PROGRESS_SUBMISSIONS_FILE = 'progress_submissions.json';

const defaultProgressSubmissions: ProgressSubmission[] = [];

async function notifyTeamMembers(teamId: string, title: string, message: string, link: string) {
  const allUsers = await loadUsers();
  const teamMemberUsers = allUsers.filter(u => u.role === 'participant' && u.teamId === teamId);
  const userIdsToNotify = teamMemberUsers.map(u => u.id);
  if (userIdsToNotify.length > 0) {
    try {
      await createNotificationsForUserIds(userIdsToNotify, title, message, 'progress', link, 'ClipboardCheck');
    } catch (e) {
      console.error(`Failed to create progress notifications for team ${teamId}:`, e);
    }
  }
}

async function sendProgressUpdateEmail(
  templateId: 'progress-approved' | 'progress-rejected',
  submission: ProgressSubmission
) {
  try {
    const templates = await loadEmailTemplates();
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const teamMembers = (await loadUsers()).filter(u => u.teamId === submission.teamId);
    if (teamMembers.length === 0) return;

    for (const member of teamMembers) {
      if (member.email) {
        const personalizedSubject = template.subject
          .replace(/{{teamName}}/g, submission.teamName)
          .replace(/{{name}}/g, member.name);
          
        const personalizedHtmlBody = template.htmlBody
          .replace(/{{teamName}}/g, submission.teamName)
          .replace(/{{name}}/g, member.name)
          .replace(/{{points}}/g, String(submission.points ?? 0))
          .replace(/{{comments}}/g, submission.reviewerComments || 'No comments provided.');

        await sendEmail({
          to: member.email,
          subject: personalizedSubject,
          html: personalizedHtmlBody,
        });
      }
    }
  } catch (error) {
    console.error(`Failed to send ${templateId} email for submission ${submission.id}:`, error);
  }
}

export async function loadProgressSubmissions(): Promise<ProgressSubmission[]> {
  return await readDataFile<ProgressSubmission[]>(PROGRESS_SUBMISSIONS_FILE, defaultProgressSubmissions);
}

export async function saveProgressSubmissions(submissions: ProgressSubmission[]): Promise<void> {
  await writeDataFile<ProgressSubmission[]>(PROGRESS_SUBMISSIONS_FILE, submissions);
}

export async function submitProgress(
  teamId: string, 
  imageUrl: string | null, 
  description: string
): Promise<{ success: boolean; submission?: ProgressSubmission; error?: string }> {
  if (!imageUrl && !description.trim()) {
    return { success: false, error: "Image or description must be provided." };
  }
   if (!description.trim()) {
     return { success: false, error: "Description cannot be empty." };
  }

  try {
    const teams = await loadTeams();
    const team = teams.find(t => t.id === teamId);
    if (!team) {
      return { success: false, error: "Team not found." };
    }

    const newSubmission: ProgressSubmission = {
      id: `prog_${Date.now()}_${teamId}`,
      teamId,
      teamName: team.name,
      imageUrl,
      description,
      status: "pending",
      points: null,
      reviewerComments: null,
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
    };

    const submissions = await loadProgressSubmissions();
    submissions.push(newSubmission);
    await saveProgressSubmissions(submissions);
    
    // Notify admins? For now, no, admins check the review page.
    // await notifyTeamMembers(teamId, "Progress Submitted", `Your team "${team.name}" submitted new progress.`, "/progress");
    
    return { success: true, submission: newSubmission };
  } catch (e) {
    console.error("Error submitting progress:", e);
    return { success: false, error: "Failed to submit progress." };
  }
}

export async function reviewProgress(
  submissionId: string,
  points: number | null,
  reviewerComments: string,
  adminUserId: string
): Promise<{ success: boolean; submission?: ProgressSubmission; error?: string }> {
  if (points !== null && points < 0) { 
     return { success: false, error: "Points cannot be negative." };
  }
  try {
    const submissions = await loadProgressSubmissions();
    const submissionIndex = submissions.findIndex(s => s.id === submissionId);

    if (submissionIndex === -1) {
      return { success: false, error: "Submission not found." };
    }

    const currentSubmission = submissions[submissionIndex];
    
    let newStatus: ProgressSubmissionStatus = currentSubmission.status;
    if (currentSubmission.status === 'pending' && (points !== null || reviewerComments.trim() !== "")) {
        newStatus = 'reviewed';
    }
    const finalPoints = (currentSubmission.status === 'approved' || currentSubmission.status === 'rejected') ? currentSubmission.points : points;

    const updatedSubmission: ProgressSubmission = {
      ...currentSubmission,
      points: finalPoints,
      reviewerComments,
      status: (currentSubmission.status === 'approved' || currentSubmission.status === 'rejected') ? currentSubmission.status : newStatus,
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminUserId,
    };

    submissions[submissionIndex] = updatedSubmission;
    await saveProgressSubmissions(submissions);

    if (updatedSubmission.status === 'reviewed') {
        await notifyTeamMembers(
            updatedSubmission.teamId, 
            "Progress Reviewed", 
            `Your progress submission from ${new Date(updatedSubmission.submittedAt).toLocaleDateString()} has been reviewed. Points: ${updatedSubmission.points ?? 'N/A'}.`,
            "/progress"
        );
    }
    
    return { success: true, submission: updatedSubmission };
  } catch (e) {
    console.error("Error reviewing progress:", e);
    return { success: false, error: "Failed to review progress." };
  }
}

export async function approveProgressSubmission(
  submissionId: string,
  adminUserId: string
): Promise<{ success: boolean; submission?: ProgressSubmission; error?: string }> {
  try {
    const submissions = await loadProgressSubmissions();
    const submissionIndex = submissions.findIndex(s => s.id === submissionId);

    if (submissionIndex === -1) {
      return { success: false, error: "Submission not found." };
    }
    const currentSubmission = submissions[submissionIndex];

    if (currentSubmission.status === 'pending') {
        return { success: false, error: "Submission must be reviewed (points assigned) before it can be approved." };
    }
    if (currentSubmission.status === 'rejected') {
        return { success: false, error: "Rejected submissions cannot be approved." };
    }
     if (currentSubmission.points === null || currentSubmission.points === undefined) {
        return { success: false, error: "Submission must have points awarded to be approved." };
    }
    
    const settings = await loadSettings();
    const quota = settings.maxProgressPointsPerTeam;

    if (quota !== null) {
      const teamSubmissions = submissions.filter(s => s.teamId === currentSubmission.teamId);
      let currentTotalPointsFromApproved = 0;
      teamSubmissions.forEach(s => {
        if (s.id !== submissionId && s.status === 'approved' && s.points !== null) {
          currentTotalPointsFromApproved += s.points;
        }
      });
      
      const pointsForThisSubmission = currentSubmission.points || 0;
      if (currentTotalPointsFromApproved + pointsForThisSubmission > quota) {
        return { 
          success: false, 
          error: `Approving this submission (${pointsForThisSubmission}pts) would exceed the team's max progress points quota of ${quota}pts. Current approved total: ${currentTotalPointsFromApproved}pts.`
        };
      }
    }

    const updatedSubmission: ProgressSubmission = {
      ...currentSubmission,
      status: "approved",
      reviewedAt: new Date().toISOString(), 
      reviewedBy: adminUserId, 
    };

    submissions[submissionIndex] = updatedSubmission;
    await saveProgressSubmissions(submissions);

    await notifyTeamMembers(
        updatedSubmission.teamId,
        "Progress Approved!",
        `Your progress submission has been approved with ${updatedSubmission.points} points.`,
        "/progress"
    );

    // Send email
    await sendProgressUpdateEmail('progress-approved', updatedSubmission);

    return { success: true, submission: updatedSubmission };

  } catch (e) {
    console.error("Error approving progress:", e);
    return { success: false, error: "Failed to approve progress submission." };
  }
}

export async function rejectProgressSubmission(
  submissionId: string,
  reviewerComments: string,
  adminUserId: string
): Promise<{ success: boolean; submission?: ProgressSubmission; error?: string }> {
  try {
    const submissions = await loadProgressSubmissions();
    const submissionIndex = submissions.findIndex(s => s.id === submissionId);

    if (submissionIndex === -1) {
      return { success: false, error: "Submission not found." };
    }
    
    const currentSubmission = submissions[submissionIndex];
    if (currentSubmission.status === 'approved') {
      return { success: false, error: "Approved submissions cannot be rejected." };
    }

    const updatedSubmission: ProgressSubmission = {
      ...currentSubmission,
      status: "rejected",
      points: null, 
      reviewerComments,
      reviewedAt: new Date().toISOString(),
      reviewedBy: adminUserId,
    };

    submissions[submissionIndex] = updatedSubmission;
    await saveProgressSubmissions(submissions);

    await notifyTeamMembers(
        updatedSubmission.teamId,
        "Progress Submission Update",
        `Your progress submission has been marked as rejected. Please see comments for details.`,
        "/progress"
    );

    // Send email
    await sendProgressUpdateEmail('progress-rejected', updatedSubmission);

    return { success: true, submission: updatedSubmission };
  } catch (e) {
    console.error("Error rejecting progress:", e);
    return { success: false, error: "Failed to reject progress submission." };
  }
}

export async function deleteProgressSubmission(
  submissionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let submissions = await loadProgressSubmissions();
    const submissionToDelete = submissions.find(s => s.id === submissionId);
    if (!submissionToDelete) {
        return { success: false, error: "Submission not found to delete." };
    }
    const initialLength = submissions.length;
    submissions = submissions.filter(s => s.id !== submissionId);

    if (submissions.length === initialLength) {
      return { success: false, error: "Submission not found to delete (filter did not change length)." };
    }

    await saveProgressSubmissions(submissions);
    
    // Optionally notify team if a submission was deleted by admin? For now, no.
    // await notifyTeamMembers(submissionToDelete.teamId, "Progress Submission Deleted", `Your progress submission from ${new Date(submissionToDelete.submittedAt).toLocaleDateString()} was removed by an admin.`, "/progress");


    return { success: true };
  } catch (e) {
    console.error("Error deleting progress submission:", e);
    return { success: false, error: "Failed to delete progress submission." };
  }
}


export async function clearProgressImage(
  submissionId: string
): Promise<{ success: boolean; submission?: ProgressSubmission; error?: string }> {
  try {
    const submissions = await loadProgressSubmissions();
    const submissionIndex = submissions.findIndex(s => s.id === submissionId);

    if (submissionIndex === -1) {
      return { success: false, error: "Submission not found." };
    }

    const updatedSubmission: ProgressSubmission = {
      ...submissions[submissionIndex],
      imageUrl: null,
    };

    submissions[submissionIndex] = updatedSubmission;
    await saveProgressSubmissions(submissions);
    return { success: true, submission: updatedSubmission };
  } catch (e) {
    console.error("Error clearing progress image:", e);
    return { success: false, error: "Failed to clear progress image." };
  }
}
