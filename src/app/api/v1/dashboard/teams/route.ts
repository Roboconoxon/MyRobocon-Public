
import { NextResponse, type NextRequest } from 'next/server';
import { loadSettings } from '@/actions/settingsActions';
import { loadTeams } from '@/actions/teamActions';

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
    const teams = await loadTeams();
    // For security, we do not expose WiFi passwords via API.
    const sanitizedTeams = teams.map(({ roboconBrainWifiPassword, ...team }) => team);
    return NextResponse.json(sanitizedTeams);
  } catch (error) {
    console.error("API GET /dashboard/teams Error:", error);
    return NextResponse.json({ error: 'Failed to retrieve teams data' }, { status: 500 });
  }
}
