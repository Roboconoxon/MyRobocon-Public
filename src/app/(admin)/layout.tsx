
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Home, Users, Settings, FileText, Megaphone, Bot, ClipboardCheck, Bell, Mail } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import Image from "next/image";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: Home },
  { href: "/admin/teams", label: "Team Management", icon: Users },
  { href: "/admin/users", label: "User Management", icon: Bot },
  { href: "/admin/resources", label: "Resources", icon: FileText },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/progress-review", label: "Progress Review", icon: ClipboardCheck },
  { href: "/admin/notifications", label: "Send Notification", icon: Bell },
  { href: "/admin/email", label: "Email Campaigns", icon: Mail },
  { href: "/admin/settings", label: "Site Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { settings } = useSettings();

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <SidebarProvider defaultOpen>
        <div className="flex min-h-screen w-full"> {/* Ensured w-full here, though SidebarProvider usually handles it */}
          <Sidebar collapsible="icon" className="border-r">
            <SidebarHeader className="p-4 flex items-center gap-2 justify-center group-data-[collapsible=icon]:justify-center">
               <Image src={settings.logoUrl} alt="Logo" width={32} height={32} className="rounded-sm" data-ai-hint="logo" />
               <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">{settings.siteTitle}</span>
            </SidebarHeader>
            <ScrollArea className="flex-1">
              <SidebarContent>
                <SidebarMenu>
                  {adminNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <Link href={item.href} legacyBehavior passHref>
                        <SidebarMenuButton
                          isActive={pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))}
                          tooltip={item.label}
                          className="w-full justify-start"
                        >
                          <item.icon className="h-5 w-5" />
                          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarContent>
            </ScrollArea>
          </Sidebar>
          
          {/* Main content column: Added overflow-hidden */}
          <div className="flex flex-1 flex-col min-w-0 overflow-hidden"> 
            <SiteHeader showAdminToggle={true} />
            <SidebarInset> {/* SidebarInset is the main scrollable area wrapper */}
              <main className="flex-1 p-4 md:p-6 overflow-y-auto"> {/* Added overflow-y-auto here for content scrolling */}
                {children}
              </main>
              <SiteFooter />
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
