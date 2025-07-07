
'use server';

import type { EmailTargetType, Team, User } from '@/lib/types';
import { loadUsers } from './userActions';
import { loadTeams } from './teamActions';
import { sendEmail } from '@/services/emailService';

// Function to replace placeholders in a string
const replacePlaceholders = (text: string, user: User, team?: Team): string => {
  let result = text;
  result = result.replace(/{{name}}/g, user.name || '');
  result = result.replace(/{{teamName}}/g, team?.name || 'N/A');
  result = result.replace(/{{schoolName}}/g, team?.schoolName || 'N/A');
  return result;
};

export async function sendBulkEmail(
  targetType: EmailTargetType,
  subject: string,
  htmlBody: string,
  teamId?: string
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  
  try {
    const allUsers = await loadUsers();
    const allTeams = await loadTeams();

    let recipients: User[] = [];

    switch (targetType) {
      case 'all_users':
        recipients = allUsers;
        break;
      case 'all_participants':
        recipients = allUsers.filter(u => u.role === 'participant');
        break;
      case 'all_admins':
        recipients = allUsers.filter(u => u.role === 'admin');
        break;
      case 'team':
        if (!teamId) {
          return { success: false, sentCount: 0, error: 'Team ID is required for this target type.' };
        }
        recipients = allUsers.filter(u => u.teamId === teamId);
        break;
      default:
        return { success: false, sentCount: 0, error: 'Invalid target type.' };
    }

    if (recipients.length === 0) {
      return { success: false, sentCount: 0, error: 'No recipients found for the selected target.' };
    }

    let sentCount = 0;
    const sendPromises = recipients.map(async (user) => {
        const userTeam = user.teamId ? allTeams.find(t => t.id === user.teamId) : undefined;
        
        const personalizedSubject = replacePlaceholders(subject, user, userTeam);
        const personalizedHtmlBody = replacePlaceholders(htmlBody, user, userTeam);
        
        // New email resolution logic
        let userEmail: string | undefined;

        // 1. Prioritize the dedicated 'email' field
        if (user.email && user.email.includes('@')) {
            userEmail = user.email;
        } 
        // 2. Fallback to username if it looks like an email
        else if (user.username.includes('@')) {
            userEmail = user.username;
        } 
        // 3. Fallback to team's main contact email for participants
        else if (userTeam?.contactEmail) {
            userEmail = userTeam.contactEmail;
        }

        if (userEmail) {
            try {
                await sendEmail({
                    to: userEmail,
                    subject: personalizedSubject,
                    html: personalizedHtmlBody,
                });
                sentCount++;
            } catch (e) {
                console.error(`Failed to send email to ${userEmail}:`, e);
            }
        } else {
            console.warn(`Could not determine email address for user ${user.username} (ID: ${user.id}). Skipping.`);
        }
    });

    await Promise.all(sendPromises);

    if (sentCount === 0 && recipients.length > 0) {
        return { success: false, sentCount: 0, error: 'Could not determine a valid email address for any recipient.' };
    }

    return { success: true, sentCount };

  } catch (error: any) {
    console.error('Error in sendBulkEmail action:', error);
    if (error.message.includes('Email service is not configured')) {
         return { success: false, sentCount: 0, error: 'Email service is not configured. Please set SMTP details in Site Settings.' };
    }
    return { success: false, sentCount: 0, error: 'An unexpected server error occurred.' };
  }
}
