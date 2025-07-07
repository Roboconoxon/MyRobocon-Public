
'use server';

import { readDataFile, writeDataFile } from '@/lib/file-utils';
import type { Announcement } from '@/lib/types';

const ANNOUNCEMENTS_FILE = 'announcements.json';

const defaultAnnouncements: Announcement[] = [
  { 
    id: "global_announcement_1", 
    content: "Welcome to the Robocon Portal! The first workshop is scheduled for next Saturday. **All teams must attend.** \n\nCheck the resources section for preparatory materials.", 
    isActive: true, 
    displayLocation: "both", 
    alertType: "info", 
    activeSince: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // Default to 1 week ago
    isDismissible: false,
  },
   { 
    id: "api_ann1", 
    content: "API Test Announcement: System update scheduled for midnight.", 
    isActive: true, 
    displayLocation: "teams", 
    alertType: "maintenance", 
    activeSince: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // Default to 2 days ago
    isDismissible: true,
  },
];

export async function loadAnnouncements(): Promise<Announcement[]> {
  return await readDataFile<Announcement[]>(ANNOUNCEMENTS_FILE, defaultAnnouncements);
}

export async function saveAnnouncements(announcements: Announcement[]): Promise<void> {
  await writeDataFile<Announcement[]>(ANNOUNCEMENTS_FILE, announcements);
}
