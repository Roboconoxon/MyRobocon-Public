
import { NextResponse, type NextRequest } from 'next/server';
import { loadSettings } from '@/actions/settingsActions';
import { loadTeams } from '@/actions/teamActions';
import { loadUsers } from '@/actions/userActions';
import { loadResources } from '@/actions/resourceActions';
import { loadProgressSubmissions } from '@/actions/progressActions';

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

export async function GET(request: NextRequest) {
  const isAuthenticated = await authenticateRequest(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [teams, users, resources, submissions] = await Promise.all([
      loadTeams(),
      loadUsers(),
      loadResources(),
      loadProgressSubmissions()
    ]);

    const approvedSubmissions = submissions.filter(s => s.status === 'approved');
    const totalPointsAwarded = approvedSubmissions.reduce((sum, s) => sum + (s.points || 0), 0);

    const stats = {
      totalTeams: teams.length,
      totalUsers: users.length,
      totalResources: resources.length,
      totalProgressSubmissions: submissions.length,
      pendingSubmissionsCount: submissions.filter(s => s.status === 'pending').length,
      reviewedSubmissionsCount: submissions.filter(s => s.status === 'reviewed').length,
      approvedSubmissionsCount: approvedSubmissions.length,
      rejectedSubmissionsCount: submissions.filter(s => s.status === 'rejected').length,
      totalPointsAwarded: totalPointsAwarded,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("API GET /dashboard/stats Error:", error);
    return NextResponse.json({ error: 'Failed to retrieve dashboard stats' }, { status: 500 });
  }
}
