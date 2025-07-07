
'use server';

import { readDataFile, writeDataFile } from '@/lib/file-utils';
import type { Resource, User } from '@/lib/types';
import { createNotificationsForUserIds } from './notificationActions';
import { loadUsers } from './userActions';
import { loadTeams } from './teamActions';

const RESOURCES_FILE = 'resources.json';

const defaultResources: Resource[] = [
  { id: "res1", title: "Robot Building Guide v2.1", content: "Detailed guide for v2.1...", linkUrl: "https://example.com/robot-guide-v2.1.pdf", assignedTeamIds: ["team_alpha"], author: "Robocon Org", tags: ["guide", "assembly"] },
  { id: "res2", title: "Competition Rulebook 2025", content: "Official rules for 2025. See link for full PDF.", linkUrl: "https://roboconoxon.org.uk/resources/Robocon_Oxfordshire_Rules_2025_v1.0.pdf", assignedTeamIds: "all", author: "Rules Committee", tags: ["rules", "official"] },
  { id: "res3", title: "Programming Basics", content: "Intro to Python for Robocon Brain. Includes examples for common tasks.", assignedTeamIds: "none", author: "Tech Team", tags: ["programming", "python"] },
];

export async function loadResources(): Promise<Resource[]> {
  return await readDataFile<Resource[]>(RESOURCES_FILE, defaultResources);
}

export async function saveResources(resources: Resource[]): Promise<void> {
  await writeDataFile<Resource[]>(RESOURCES_FILE, resources);

  // Post-save: Identify newly created or significantly updated resources to notify users.
  // This example simplifies by notifying on every save if assigned.
  // A more complex system might track previous versions or use a "notify users" flag.
  const allUsers = await loadUsers();
  const participantUsers = allUsers.filter(u => u.role === 'participant');
  const allTeams = await loadTeams();

  for (const resource of resources) {
    // Assuming 'resource' here is the one just saved/created.
    // In a real scenario, you'd need to know if it's new or significantly changed.
    // For this example, let's assume if it's in the saved list and has assignments, we consider notifying.
    
    let userIdsToNotify: string[] = [];

    if (resource.assignedTeamIds === 'all') {
      userIdsToNotify = participantUsers.map(u => u.id);
    } else if (resource.assignedTeamIds === 'none') {
      // No one to notify directly based on team assignment
    } else if (Array.isArray(resource.assignedTeamIds)) {
      const targetTeamIds = resource.assignedTeamIds;
      userIdsToNotify = participantUsers
        .filter(u => u.teamId && targetTeamIds.includes(u.teamId))
        .map(u => u.id);
    }

    if (userIdsToNotify.length > 0) {
      // Check if this is a truly new resource or just an update.
      // This logic is simplified. A better way would be to pass a flag or compare old/new state.
      // For now, let's assume any save of an assigned resource might be "new" enough.
      const title = `New Resource: ${resource.title}`;
      const message = `A new resource titled "${resource.title}" by ${resource.author} is now available.`;
      try {
        await createNotificationsForUserIds(userIdsToNotify, title, message, 'resource', `/my-team`, 'FileText');
      } catch (e) {
        console.error(`Failed to create notifications for resource ${resource.id}:`, e);
      }
    }
  }
}

