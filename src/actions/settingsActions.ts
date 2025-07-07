
'use server';

import { readDataFile, writeDataFile } from '@/lib/file-utils';
import type { SiteSettings, ThemeName, ApiToken } from '@/lib/types';

const SETTINGS_FILE = 'settings.json';

const defaultSettings: SiteSettings = {
  logoUrl: "https://roboconoxon.org.uk/wp-content/uploads/2025/05/cropped-Robocon-Natural-Logo.png",
  faviconUrl: "/favicon.ico",
  siteTitle: "MyRobocon Portal",
  demoMode: true,
  loginHint: "If you have lost your account or need a password reset, please send an email to help@roboconoxon.on.spiceworks.com",
  footerText: "© 2025 Robocon Oxfordshire, All Rights Reserved.",
  activeThemeName: "normal" as ThemeName,
  maintenanceMode: false,
  maxProgressPointsPerTeam: 100,
  apiTokens: [
    { 
      id: "default_token_1", 
      name: "Default System Key", 
      token: "robocon_sk_default_example_key_12345", 
      createdAt: new Date().toISOString() 
    },
    { 
      id: "python_script_token", 
      name: "Python Script Test Key", 
      token: "robocon_sk_0hs7u17aoceknbwc", 
      createdAt: new Date().toISOString() 
    }
  ],
  smtpSettings: {
    host: "",
    port: 587,
    user: "",
    pass: "",
    fromName: "MyRobocon Portal",
    fromEmail: "",
  },
  oidcClients: [],
};

export async function loadSettings(): Promise<SiteSettings> {
  const settings = await readDataFile<SiteSettings>(SETTINGS_FILE, defaultSettings);
  // Ensure theme is valid
  const validThemeNames: ThemeName[] = ["normal", "highContrast", "cyberGreen", "cyberRed"];
  if (!settings.activeThemeName || !validThemeNames.includes(settings.activeThemeName)) {
      settings.activeThemeName = "normal";
  }
  // Ensure other fields exist with defaults
  settings.maintenanceMode = settings.maintenanceMode ?? defaultSettings.maintenanceMode;
  settings.maxProgressPointsPerTeam = settings.maxProgressPointsPerTeam ?? defaultSettings.maxProgressPointsPerTeam;
  settings.apiTokens = settings.apiTokens ?? defaultSettings.apiTokens;
  settings.smtpSettings = settings.smtpSettings ?? defaultSettings.smtpSettings;
  settings.oidcClients = settings.oidcClients ?? defaultSettings.oidcClients;


  return settings;
}

export async function saveSettings(newSettings: Partial<SiteSettings>): Promise<void> {
    const currentSettings = await loadSettings();

    // Deep merge smtpSettings to avoid overwriting password if it's not provided
    const smtpSettings = newSettings.smtpSettings
        ? { ...currentSettings.smtpSettings, ...newSettings.smtpSettings }
        : currentSettings.smtpSettings;

    const settingsToSave: SiteSettings = {
        ...currentSettings,
        ...newSettings,
        smtpSettings,
    };
    
    // Ensure maxProgressPointsPerTeam is correctly parsed as number or null
    if (newSettings.maxProgressPointsPerTeam === '' || newSettings.maxProgressPointsPerTeam === undefined) {
        settingsToSave.maxProgressPointsPerTeam = null;
    } else {
        settingsToSave.maxProgressPointsPerTeam = Number(newSettings.maxProgressPointsPerTeam);
    }
    
    await writeDataFile<SiteSettings>(SETTINGS_FILE, settingsToSave);
}
