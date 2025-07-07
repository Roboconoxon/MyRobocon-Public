
'use server';

import { readDataFile, writeDataFile } from '@/lib/file-utils';
import type { EmailTemplate } from '@/lib/types';

const EMAIL_TEMPLATES_FILE = 'email_templates.json';

const defaultEmailTemplates: EmailTemplate[] = [
  {
    id: "welcome-email",
    name: "New User Welcome Email",
    subject: "Welcome to the Robocon Portal, {{name}}!",
    htmlBody: `
      <h1>Welcome, {{name}}!</h1>
      <p>Your account for the Robocon Portal has been created.</p>
      <p>You can now log in to view team resources, submit progress, and receive important announcements.</p>
      <p>If you have any questions, please contact an administrator.</p>
      <br/>
      <p>Best regards,</p>
      <p>The Robocon Team</p>
    `,
    createdAt: new Date().toISOString(),
  },
  {
    id: "progress-approved",
    name: "Progress Submission Approved",
    subject: "Your Robocon progress has been approved!",
    htmlBody: `
      <h1>Hi {{name}},</h1>
      <p>Great news! Your team's ({{teamName}}) recent progress submission has been reviewed and approved.</p>
      <p><strong>Points Awarded:</strong> {{points}}</p>
      <p><strong>Admin Comments:</strong></p>
      <p><em>{{comments}}</em></p>
      <br/>
      <p>Keep up the great work!</p>
      <p>The Robocon Team</p>
    `,
    createdAt: new Date().toISOString(),
  },
  {
    id: "progress-rejected",
    name: "Progress Submission Update",
    subject: "Update on your Robocon progress submission",
    htmlBody: `
      <h1>Hi {{name}},</h1>
      <p>Your team's ({{teamName}}) recent progress submission has been reviewed and marked as rejected.</p>
      <p><strong>Admin Comments:</strong></p>
      <p><em>{{comments}}</em></p>
      <p>Please review the comments and feel free to submit an update again. If you have any questions, please reach out to an admin.</p>
      <br/>
      <p>Best regards,</p>
      <p>The Robocon Team</p>
    `,
    createdAt: new Date().toISOString(),
  },
];


export async function loadEmailTemplates(): Promise<EmailTemplate[]> {
  return await readDataFile<EmailTemplate[]>(EMAIL_TEMPLATES_FILE, defaultEmailTemplates);
}

export async function saveEmailTemplates(templates: EmailTemplate[]): Promise<void> {
  await writeDataFile<EmailTemplate[]>(EMAIL_TEMPLATES_FILE, templates);
}
