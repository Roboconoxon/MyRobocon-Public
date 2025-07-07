
'use server';

import { readDataFile, writeDataFile } from '@/lib/file-utils';
import type { ScheduledEmail, EmailTargetType } from '@/lib/types';

const SCHEDULED_EMAILS_FILE = 'scheduled_emails.json';

const defaultScheduledEmails: ScheduledEmail[] = [];

export async function loadScheduledEmails(): Promise<ScheduledEmail[]> {
  return await readDataFile<ScheduledEmail[]>(SCHEDULED_EMAILS_FILE, defaultScheduledEmails);
}

export async function saveScheduledEmails(emails: ScheduledEmail[]): Promise<void> {
  await writeDataFile<ScheduledEmail[]>(SCHEDULED_EMAILS_FILE, emails);
}

export async function addScheduledEmail(
  emailData: Omit<ScheduledEmail, 'id' | 'status' | 'createdAt'>
): Promise<ScheduledEmail> {
  const allScheduledEmails = await loadScheduledEmails();
  
  const newScheduledEmail: ScheduledEmail = {
    ...emailData,
    id: `scheduled_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  allScheduledEmails.push(newScheduledEmail);
  await saveScheduledEmails(allScheduledEmails);

  return newScheduledEmail;
}
