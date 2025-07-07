
'use server';

import { readDataFile, writeDataFile } from '@/lib/file-utils';
import type { Team } from '@/lib/types';

const TEAMS_FILE = 'teams.json';
const DEFAULT_BANNER_URL = "https://roboconoxon.org.uk/wp-content/uploads/2024/05/Robocon-Email-Banner-1200x300-1.png";

const defaultTeams: Team[] = [
  { id: "team_alpha", name: "Alpha Bots", schoolName: "Oxfordshire High", bannerImageUrl: DEFAULT_BANNER_URL, contactPerson: "John Alpha", contactEmail: "j.alpha@example.com", roboconBrainId: "RBCB01", roboconBrainWifiPassword: "alpha_wifi_pass", notes: "Team Alpha notes: Focus on autonomous mode.", dismissedResourceIds: [] },
  { id: "team_beta", name: "Beta Builders", schoolName: "Abingdon School", bannerImageUrl: DEFAULT_BANNER_URL, contactPerson: "Jane Beta", contactEmail: "j.beta@example.com", roboconBrainId: "RBCB02", roboconBrainWifiPassword: "beta_secure_pw", notes: "Team Beta notes: Strong mechanical design.", dismissedResourceIds: [] },
  { id: "team_gamma", name: "Gamma Geeks", schoolName: "Didcot Girls'", bannerImageUrl: DEFAULT_BANNER_URL, contactPerson: "Gary Gamma", contactEmail: "g.gamma@example.com", roboconBrainId: "RBCB03", roboconBrainWifiPassword: "gamma_net_key", notes: "Team Gamma notes: Innovative sensor usage.", dismissedResourceIds: [] },
];

export async function loadTeams(): Promise<Team[]> {
  const teams = await readDataFile<Team[]>(TEAMS_FILE, defaultTeams);
  // Ensure data consistency for teams loaded from file
  return teams.map(team => ({
    ...team,
    notes: team.notes ?? "",
    dismissedResourceIds: team.dismissedResourceIds ?? []
  }));
}

export async function saveTeams(teams: Team[]): Promise<void> {
  await writeDataFile<Team[]>(TEAMS_FILE, teams);
}

export async function toggleResourceReadStatus(teamId: string, resourceId: string): Promise<{ success: boolean; dismissedResourceIds?: string[] }> {
  try {
    const teams = await loadTeams();
    const teamIndex = teams.findIndex(t => t.id === teamId);

    if (teamIndex === -1) {
      console.error(`Team with id ${teamId} not found.`);
      return { success: false };
    }

    const team = teams[teamIndex];
    if (!team.dismissedResourceIds) { // Should be initialized by loadTeams, but defensive check
      team.dismissedResourceIds = [];
    }

    const resourceIndex = team.dismissedResourceIds.indexOf(resourceId);
    if (resourceIndex > -1) {
      // Resource is currently read, mark as unread (remove)
      team.dismissedResourceIds.splice(resourceIndex, 1);
    } else {
      // Resource is currently unread, mark as read (add)
      team.dismissedResourceIds.push(resourceId);
    }
    
    teams[teamIndex] = team;
    await saveTeams(teams);
    return { success: true, dismissedResourceIds: team.dismissedResourceIds };
  } catch (error) {
    console.error("Error toggling resource read status:", error);
    return { success: false };
  }
}

