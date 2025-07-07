
'use server';

import { readDataFile, writeDataFile } from '@/lib/file-utils';
import type { User } from '@/lib/types';
import { sendEmail } from '@/services/emailService';
import { loadEmailTemplates } from './emailTemplateActions';

const USERS_FILE = 'users.json';

const defaultUsers: User[] = [
  { id: "user1", username: "admin", password: "admin", name: "Admin User", email: "admin@example.com", role: "admin", status: "active", authenticators: [] },
  { id: "user2", username: "participant", password: "participant", name: "Participant User", email: "participant@example.com", role: "participant", status: "active", teamId: "team_alpha", authenticators: [] },
  { id: "user3", username: "team2_member", password: "teampassword", name: "Jane Smith (Team Beta)", email: "jane.beta@example.com", role: "participant", status: "locked", teamId: "team_beta", authenticators: [] }
];

export async function loadUsers(): Promise<User[]> {
  const users = await readDataFile<User[]>(USERS_FILE, defaultUsers);
  // Ensure data consistency for users loaded from file
  return users.map(user => ({
    ...user,
    email: user.email ?? undefined,
    authenticators: user.authenticators ?? [],
  }));
}

export async function saveUsers(users: User[]): Promise<void> {
  await writeDataFile<User[]>(USERS_FILE, users);
}

export async function createUser(user: Omit<User, 'id'>): Promise<User> {
  const users = await loadUsers();
  const newUser: User = {
    ...user,
    id: `user_${Date.now()}`,
    authenticators: user.authenticators ?? [],
  };
  users.push(newUser);
  await saveUsers(users);

  // Send welcome email if template exists
  try {
    const templates = await loadEmailTemplates();
    const welcomeTemplate = templates.find(t => t.id === 'welcome-email'); // Convention-based ID
    if (welcomeTemplate && newUser.email) {
      await sendEmail({
        to: newUser.email,
        subject: welcomeTemplate.subject.replace(/{{name}}/g, newUser.name),
        html: welcomeTemplate.htmlBody.replace(/{{name}}/g, newUser.name),
      });
    }
  } catch (error) {
    console.error(`Failed to send welcome email to ${newUser.username}:`, error);
  }

  return newUser;
}
