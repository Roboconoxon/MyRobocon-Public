
import { NextResponse, type NextRequest } from 'next/server';
import type { Announcement, AnnouncementDisplayLocation, AnnouncementAlertType, SiteSettings } from '@/lib/types';
import { loadAnnouncements, saveAnnouncements } from '@/actions/announcementActions';
import { loadSettings } from '@/actions/settingsActions';

async function authenticateRequest(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7); 

  try {
    const settings = await loadSettings();
    const validTokens = settings.apiTokens.map(t => t.token);
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
    const announcements = await loadAnnouncements();
    const activeAnnouncements = announcements.filter(ann => ann.isActive);
    return NextResponse.json(activeAnnouncements);
  } catch (error) {
    console.error("API GET Error loading announcements:", error);
    return NextResponse.json({ error: 'Failed to retrieve announcements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const isAuthenticated = await authenticateRequest(request);
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { content, displayLocation, alertType } = body;

    if (!content || !displayLocation || !alertType) {
      return NextResponse.json({ error: 'Missing required fields: content, displayLocation, alertType' }, { status: 400 });
    }
    
    const validDisplayLocations: AnnouncementDisplayLocation[] = ["login", "teams", "both"];
    if (!validDisplayLocations.includes(displayLocation)) {
        return NextResponse.json({ error: `Invalid displayLocation. Must be one of: ${validDisplayLocations.join(', ')}` }, { status: 400 });
    }

    const validAlertTypes: AnnouncementAlertType[] = ['info', 'maintenance', 'emergency'];
    if (!validAlertTypes.includes(alertType)) {
        return NextResponse.json({ error: `Invalid alertType. Must be one of: ${validAlertTypes.join(', ')}` }, { status: 400 });
    }


    const newAnnouncement: Announcement = {
      id: `api_ann_${Date.now()}`,
      content,
      isActive: true, 
      displayLocation,
      alertType,
      activeSince: new Date().toISOString(),
    };

    const currentAnnouncements = await loadAnnouncements();
    const updatedAnnouncements = [...currentAnnouncements, newAnnouncement];
    await saveAnnouncements(updatedAnnouncements);
    
    return NextResponse.json(newAnnouncement, { status: 201 });
  } catch (error) {
    console.error("API POST Error processing request:", error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid request body or server error' }, { status: 400 });
  }
}

