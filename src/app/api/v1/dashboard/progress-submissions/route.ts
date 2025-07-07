
import { NextResponse, type NextRequest } from 'next/server';
import { loadSettings } from '@/actions/settingsActions';
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
    const submissions = await loadProgressSubmissions();
    return NextResponse.json(submissions);
  } catch (error) {
    console.error("API GET /dashboard/progress-submissions Error:", error);
    return NextResponse.json({ error: 'Failed to retrieve progress submissions data' }, { status: 500 });
  }
}
