
"use client";

import type { SiteSettings, ThemeName } from "@/lib/types";
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { useTheme } from 'next-themes';
import { loadSettings as loadSettingsAction, saveSettings as saveSettingsAction } from "@/actions/settingsActions";

const themeVariables = [
  "background", "foreground", "card", "card-foreground", "popover", "popover-foreground",
  "primary", "primary-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground",
  "accent", "accent-foreground", "destructive", "destructive-foreground", "border", "input", "ring",
  "sidebar-background", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground",
  "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring"
];

const themes: Record<ThemeName, Partial<Record<typeof themeVariables[number], string>>> = {
  normal: {}, // Relies on globals.css for light/dark
  highContrast: {
    background: "0 0% 100%", foreground: "0 0% 0%", card: "0 0% 95%", cardForeground: "0 0% 0%",
    popover: "0 0% 95%", popoverForeground: "0 0% 0%", primary: "240 100% 50%", primaryForeground: "0 0% 100%",
    secondary: "0 0% 85%", secondaryForeground: "0 0% 0%", muted: "0 0% 90%", mutedForeground: "0 0% 20%",
    accent: "60 100% 50%", accentForeground: "0 0% 0%", destructive: "0 100% 50%", destructiveForeground: "0 0% 100%",
    border: "0 0% 50%", input: "0 0% 80%", ring: "240 100% 50%",
    "sidebar-background": "0 0% 90%", "sidebar-foreground": "0 0% 0%", "sidebar-primary": "240 100% 50%",
    "sidebar-primary-foreground": "0 0% 100%", "sidebar-accent": "240 100% 50%", "sidebar-accent-foreground": "0 0% 100%",
    "sidebar-border": "0 0% 60%", "sidebar-ring": "240 100% 50%",
  },
  cyberGreen: {
    background: "120 70% 8%", foreground: "0 0% 98%", card: "120 60% 12%", cardForeground: "0 0% 98%",
    popover: "120 60% 12%", popoverForeground: "0 0% 98%", primary: "120 100% 50%", primaryForeground: "0 0% 98%",
    secondary: "120 50% 20%", secondaryForeground: "0 0% 98%", muted: "120 50% 15%", mutedForeground: "0 0% 98%",
    accent: "100 100% 60%", accentForeground: "0 0% 98%", destructive: "0 100% 50%", destructiveForeground: "0 0% 100%",
    border: "120 80% 30%", input: "120 60% 15%", ring: "120 100% 50%",
    "sidebar-background": "120 65% 10%", "sidebar-foreground": "0 0% 98%", "sidebar-primary": "120 100% 50%",
    "sidebar-primary-foreground": "0 0% 98%", "sidebar-accent": "120 100% 50%", "sidebar-accent-foreground": "0 0% 98%",
    "sidebar-border": "120 70% 25%", "sidebar-ring": "120 100% 50%",
  },
  cyberRed: {
    background: "0 70% 8%", foreground: "0 0% 98%", card: "0 60% 12%", cardForeground: "0 0% 98%",
    popover: "0 60% 12%", popoverForeground: "0 0% 98%", primary: "0 100% 50%", primaryForeground: "0 0% 98%",
    secondary: "0 50% 20%", secondaryForeground: "0 0% 98%", muted: "0 50% 15%", mutedForeground: "0 0% 98%",
    accent: "330 100% 60%", accentForeground: "0 0% 98%", destructive: "0 100% 50%", destructiveForeground: "0 0% 100%",
    border: "0 80% 30%", input: "0 60% 15%", ring: "0 100% 50%",
    "sidebar-background": "0 65% 10%", "sidebar-foreground": "0 0% 98%", "sidebar-primary": "0 100% 50%",
    "sidebar-primary-foreground": "0 0% 98%", "sidebar-accent": "0 100% 50%", "sidebar-accent-foreground": "0 0% 98%",
    "sidebar-border": "0 70% 25%", "sidebar-ring": "0 100% 50%",
  },
};

const initialDefaultSettings: SiteSettings = {
  logoUrl: "https://roboconoxon.org.uk/wp-content/uploads/2025/05/cropped-Robocon-Natural-Logo.png",
  faviconUrl: "/favicon.ico",
  siteTitle: "MyRobocon Portal",
  demoMode: true,
  loginHint: "If you have lost your account or need a password reset, please send an email to help@roboconoxon.on.spiceworks.com",
  footerText: "© 2025 Robocon Oxfordshire, All Rights Reserved.",
  activeThemeName: "normal",
  maxProgressPointsPerTeam: 100,
  apiTokens: [],
  smtpSettings: {},
};

interface SettingsContextType {
  settings: SiteSettings;
  setSettings: (newSettings: Partial<SiteSettings>) => Promise<void>;
  isLoadingSettings: boolean;
  applyThemeByName: (themeName: ThemeName) => void;
  switchToNormalTheme: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { theme: nextThemeCurrentMode, setTheme: setNextThemeMode } = useTheme();
  const [settings, setLocalSettings] = useState<SiteSettings>(initialDefaultSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);

  const applyThemeStyles = useCallback((themeName: ThemeName) => {
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      
      themeVariables.forEach(varBaseName => {
        root.style.removeProperty(`--${varBaseName}`);
      });

      if (themeName !== "normal") {
        setNextThemeMode('light'); // Force light mode for custom themes to avoid conflicts
        const palette = themes[themeName];
        Object.entries(palette).forEach(([varBaseName, hslString]) => {
          if (hslString) {
            root.style.setProperty(`--${varBaseName}`, hslString);
          }
        });
      } else {
        // For 'normal' theme, next-themes handles light/dark via globals.css
      }
    }
  }, [setNextThemeMode]);

  useEffect(() => {
    async function fetchSettings() {
      setIsLoadingSettings(true);
      try {
        const loadedSettings = await loadSettingsAction();
        setLocalSettings(loadedSettings);
        applyThemeStyles(loadedSettings.activeThemeName);
      } catch (error) {
        console.error("Failed to load settings:", error);
        setLocalSettings(initialDefaultSettings);
        applyThemeStyles(initialDefaultSettings.activeThemeName);
      } finally {
        setIsLoadingSettings(false);
      }
    }
    fetchSettings();
  }, [applyThemeStyles]);

  useEffect(() => {
    if (settings.activeThemeName === 'normal') {
      applyThemeStyles('normal');
    }
  }, [nextThemeCurrentMode, settings.activeThemeName, applyThemeStyles]);


  const handleSetSettings = async (newSettings: Partial<SiteSettings>) => {
    // Optimistically update local state for responsiveness
    const updatedSettings = { 
        ...settings, 
        ...newSettings,
        smtpSettings: {
            ...settings.smtpSettings,
            ...newSettings.smtpSettings,
        }
    };
    setLocalSettings(updatedSettings);
    
    if (newSettings.activeThemeName) {
        applyThemeStyles(newSettings.activeThemeName);
    }
    
    try {
      await saveSettingsAction(newSettings);
      // Optional: re-fetch to confirm save, but optimistic update is usually enough
      // const reloadedSettings = await loadSettingsAction();
      // setLocalSettings(reloadedSettings);
    } catch (error) {
      console.error("Failed to save settings:", error);
      // Optionally revert local state or show error to user
    }
  };

  const switchToNormalTheme = async () => {
    await handleSetSettings({ activeThemeName: 'normal' });
  };

  return (
    <SettingsContext.Provider value={{ settings, setSettings: handleSetSettings, isLoadingSettings, applyThemeByName: applyThemeStyles, switchToNormalTheme }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
