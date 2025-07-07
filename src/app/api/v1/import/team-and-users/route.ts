
import { NextResponse, type NextRequest } from 'next/server';
import type { Team, User, SiteSettings } from '@/lib/types';
import { loadTeams, saveTeams } from '@/actions/teamActions';
import { loadUsers, saveUsers } from '@/actions/userActions';
import { loadSettings } from '@/actions/settingsActions';

const DEFAULT_BANNER_URL = "https://roboconoxon.org.uk/wp-content/uploads/2024/05/Robocon-Email-Banner-1200x300-1.png";

async function authenticateRequest(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7); 

  try {
    const settings = await loadSettings();
    const validTokens = (settings.apiTokens || []).map(t => t.token);
    return validTokens.includes(token);
  } catch (error) {
    console.error("Error loading settings for API authentication:", error);
    return false;
  }
}

interface ApiTeamData {
  name: string;
  schoolName: string;
  contactPerson: string;
  contactEmail: string;
  bannerImageUrl?: string; // Optional Data URI
  notes?: string;
}

interface ApiTeamLeadUserData {
  username: string;
  name: string;
  password?: string; 
}

interface ApiStudentMemberData {
  name: string;
  email: string; 
}

interface ImportPayload {
  teamData: ApiTeamData;
  teamLeadUserData: ApiTeamLeadUserData;
  studentMemberData: ApiStudentMemberData[];
}

function generateRandomPassword(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function generateUniqueUsername(baseName: string, existingUsers: User[]): Promise<string> {
  let username = baseName.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 20);
  if (username.length < 3) username = `user_${username}`; // Ensure minimum length
  
  let counter = 0;
  let potentialUsername = username;
  
  while (existingUsers.some(u => u.username.toLowerCase() === potentialUsername.toLowerCase())) {
    counter++;
    potentialUsername = `${username}${counter}`;
  }
  return potentialUsername;
}


export async function POST(request: NextRequest) {
  const isAuthenticated = await authenticateRequest(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: ImportPayload;
  try {
    payload = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { teamData, teamLeadUserData, studentMemberData } = payload;

  // Validate teamData
  if (!teamData || !teamData.name || !teamData.schoolName || !teamData.contactPerson || !teamData.contactEmail) {
    return NextResponse.json({ error: 'Missing required fields in teamData: name, schoolName, contactPerson, contactEmail' }, { status: 400 });
  }

  // Validate teamLeadUserData
  if (!teamLeadUserData || !teamLeadUserData.username || !teamLeadUserData.name || !teamLeadUserData.password) {
    return NextResponse.json({ error: 'Missing required fields in teamLeadUserData: username, name, password' }, { status: 400 });
  }
  if (teamLeadUserData.password.length < 6) {
      return NextResponse.json({ error: `Password for team lead ${teamLeadUserData.username} must be at least 6 characters.`}, { status: 400 });
  }
  
  // Validate studentMemberData
  if (!studentMemberData || !Array.isArray(studentMemberData)) {
    return NextResponse.json({ error: 'studentMemberData must be an array' }, { status: 400 });
  }
  for (const student of studentMemberData) {
    if (!student.name || !student.email) {
      return NextResponse.json({ error: `Missing required fields in studentMemberData item: name, email. Student: ${JSON.stringify(student)}` }, { status: 400 });
    }
  }

  try {
    const allTeams = await loadTeams();
    const allUsers = await loadUsers();

    // Create Team
    const newTeamId = `team_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newTeam: Team = {
      id: newTeamId,
      name: teamData.name,
      schoolName: teamData.schoolName,
      bannerImageUrl: teamData.bannerImageUrl || DEFAULT_BANNER_URL,
      contactPerson: teamData.contactPerson,
      contactEmail: teamData.contactEmail,
      roboconBrainId: `RBCBID_${newTeamId.slice(-4)}`, 
      roboconBrainWifiPassword: `rbc_pass_${generateRandomPassword(6)}`,
      notes: teamData.notes || `Imported via API on ${new Date().toLocaleDateString()}`,
      dismissedResourceIds: [],
    };
    allTeams.push(newTeam);
    

    // Create or Update Team Lead User
    let teamLeadUser: User | undefined = allUsers.find(u => u.username.toLowerCase() === teamLeadUserData.username.toLowerCase());
    let teamLeadUserId: string;

    if (teamLeadUser) {
      // Update existing lead user if necessary (e.g., name, ensure password from signup system is set)
      teamLeadUser.name = teamLeadUserData.name;
      teamLeadUser.password = teamLeadUserData.password; // Overwrite password with the one from signup system
      teamLeadUser.role = "participant"; // Ensure role
      teamLeadUser.status = "active";
      teamLeadUser.teamId = newTeamId; // Assign to this new team
      teamLeadUserId = teamLeadUser.id;
    } else {
      teamLeadUserId = `user_lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      teamLeadUser = {
        id: teamLeadUserId,
        username: teamLeadUserData.username,
        password: teamLeadUserData.password,
        name: teamLeadUserData.name,
        role: "participant", 
        status: "active",
        teamId: newTeamId,
      };
      allUsers.push(teamLeadUser);
    }

    // Create Student Users
    const createdStudentUsersInfo: { id: string, username: string, email: string }[] = [];
    for (const student of studentMemberData) {
      const studentBaseUsername = student.email.split('@')[0] || student.name.split(' ')[0] || 'student';
      const studentUsername = await generateUniqueUsername(studentBaseUsername, allUsers);
      const studentPassword = `stu_${generateRandomPassword(6)}`;
      const newStudentId = `user_stu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      const newStudentEntry: User = {
        id: newStudentId,
        username: studentUsername,
        password: studentPassword,
        name: student.name,
        role: "participant",
        status: "active",
        teamId: newTeamId,
      };
      allUsers.push(newStudentEntry);
      createdStudentUsersInfo.push({ id: newStudentId, username: studentUsername, email: student.email });
    }

    await saveTeams(allTeams);
    await saveUsers(allUsers);

    return NextResponse.json({ 
      message: 'Team and users imported successfully.',
      teamId: newTeamId,
      teamName: newTeam.name,
      teamLeadUser: { id: teamLeadUserId, username: teamLeadUserData.username },
      createdStudentUsers: createdStudentUsersInfo
    }, { status: 201 });

  } catch (error) {
    console.error("API POST /v1/import/team-and-users Error:", error);
    return NextResponse.json({ error: 'Failed to import team and users due to a server error.' }, { status: 500 });
  }
}
