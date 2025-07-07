
import type { AuthenticatorDevice, AuthenticatorTransport } from "@simplewebauthn/server";

export type UserRole = "participant" | "admin";

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  email?: string;
  role: UserRole;
  status: "active" | "locked";
  teamId?: string; 
  authenticators?: Authenticator[];
}

export interface Authenticator extends AuthenticatorDevice {
  // We don't need a separate ID, credentialID from the parent is unique
  // simple-webauthn properties
  credentialID: string; // Is a buffer in the lib, but we'll store as base64url string
  credentialPublicKey: string; // Stored as a base64 string. Convert to buffer for use.
  counter: number;
  credentialDeviceType: "singleDevice" | "multiDevice";
  credentialBackedUp: boolean;
  transports?: AuthenticatorTransport[];
}


export interface Team {
  id: string;
  name: string;
  schoolName: string;
  bannerImageUrl: string;
  contactPerson: string;
  contactEmail: string;
  roboconBrainId: string;
  roboconBrainWifiPassword?: string;
  notes?: string;
  dismissedResourceIds?: string[];
}

export interface Resource {
  id: string;
  title: string;
  content: string; // Markdown content
  linkUrl?: string; // Optional dedicated URL for the resource
  assignedTeamIds: string[] | "all" | "none"; // 'all' or array of team IDs
  author: string;
  tags: string[];
}

export type AnnouncementAlertType = "emergency" | "maintenance" | "info";
export type AnnouncementDisplayLocation = "login" | "teams" | "both";

export interface Announcement {
  id: string;
  content: string; // Markdown content
  isActive: boolean;
  displayLocation: AnnouncementDisplayLocation; 
  alertType: AnnouncementAlertType;
  activeSince?: string; // ISO date string
  isDismissible?: boolean;
}

export type ThemeName = "normal" | "highContrast" | "cyberGreen" | "cyberRed";

export interface ApiToken {
  id: string;
  name: string;
  token: string; // The actual secret API token string
  createdAt: string; // ISO date string
}

export interface SmtpSettings {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  fromName?: string;
  fromEmail?: string;
}

export interface OidcClient {
  client_id: string;
  client_secret: string;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
}

export interface SiteSettings {
  logoUrl: string;
  faviconUrl: string; // Not implemented, but for future use
  siteTitle: string;
  demoMode: boolean;
  loginHint: string;
  footerText: string;
  activeThemeName: ThemeName;
  maintenanceMode?: boolean;
  maxProgressPointsPerTeam: number | null; 
  apiTokens: ApiToken[];
  smtpSettings?: SmtpSettings;
  oidcClients?: OidcClient[];
}


export type ProgressSubmissionStatus = "pending" | "reviewed" | "approved" | "rejected";

export interface ProgressSubmission {
  id: string;
  teamId: string;
  teamName: string; // Denormalized for easier display
  imageUrl: string | null; // Can be null if cleared
  description: string;
  status: ProgressSubmissionStatus;
  points: number | null;
  reviewerComments: string | null;
  submittedAt: string; // ISO date string
  reviewedAt: string | null; // ISO date string
  reviewedBy: string | null; // Admin user ID or name
}

export type NotificationCategory = 'resource' | 'progress' | 'system' | 'admin_manual';
export type LucideIconName = 
  | 'FileText' 
  | 'ClipboardCheck' 
  | 'Users' 
  | 'Megaphone' 
  | 'Info'
  | 'Bell';


export interface Notification {
  id: string;
  userId: string; 
  title: string;
  message: string; 
  link?: string; 
  timestamp: string; 
  isRead: boolean;
  icon?: LucideIconName; 
  category: NotificationCategory;
}

export type NotificationTargetType = 'all_users' | 'all_participants' | 'all_admins' | 'team' | 'user';

export type EmailTargetType = 'all_users' | 'all_participants' | 'all_admins' | 'team';


export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  createdAt: string; 
}

export interface ScheduledEmail {
  id: string;
  targetType: EmailTargetType;
  teamId?: string;
  subject: string;
  htmlBody: string;
  scheduledAt: string;
  status: 'pending' | 'sent' | 'failed';
  createdAt: string; 
}
