
"use client";

import { useSettings } from "@/contexts/SettingsContext";

export function SiteFooter() {
  const { settings } = useSettings();
  return (
    <footer className="py-6 md:py-0">
      <div className="w-full flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          {settings.footerText}
        </p>
      </div>
    </footer>
  );
}
