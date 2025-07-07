
"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { LogOut, UserCircle, LayoutDashboard, PanelLeft, ChevronDown, KeyRound, ListChecks, Bell, FileText, ClipboardCheck, Info, Trash2, Users, Megaphone, ShieldCheck } from "lucide-react"; 
import { useSidebar } from "@/components/ui/sidebar"; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useCallback } from "react";
import { ChangePasswordDialog } from "./ChangePasswordDialog"; 
import { PasskeyManagementDialog } from "./PasskeyManagementDialog";
import type { Notification, LucideIconName } from "@/lib/types";
import { getNotificationsForUser, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from "@/actions/notificationActions";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface SiteHeaderProps {
  showAdminToggle?: boolean;
}

const LucideIcons: Record<LucideIconName, React.ElementType> = {
  FileText,
  ClipboardCheck,
  Users,
  Megaphone,
  Info,
  Bell,
};

const NotificationIcon = ({ iconName, ...props }: { iconName?: LucideIconName } & React.ComponentProps<typeof Info>) => {
  if (!iconName) return <Info {...props} />;
  const IconComponent = LucideIcons[iconName] || Info;
  return <IconComponent {...props} />;
};


export function SiteHeader({ showAdminToggle = false }: SiteHeaderProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const { toggleSidebar } = showAdminToggle ? useSidebar() : { toggleSidebar: () => {} };
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [isPasskeyDialogOpen, setIsPasskeyDialogOpen] = useState(false);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const fetchUserNotifications = useCallback(async () => {
    if (user) {
      try {
        const userNotifications = await getNotificationsForUser(user.id);
        setNotifications(userNotifications);
        setUnreadCount(userNotifications.filter(n => !n.isRead).length);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        toast({ title: "Error", description: "Could not load notifications.", variant: "destructive" });
      }
    }
  }, [user, toast]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserNotifications();
      const intervalId = setInterval(fetchUserNotifications, 60000); 
      return () => clearInterval(intervalId);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, user, fetchUserNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id, notification.userId);
        fetchUserNotifications(); // Refresh notifications
      } catch (error) {
        toast({ title: "Error", description: "Failed to mark notification as read.", variant: "destructive" });
      }
    }
    if (notification.link) {
      router.push(notification.link);
    }
    setIsNotificationMenuOpen(false); 
  };

  const handleMarkAllRead = async () => {
    if (user) {
      try {
        await markAllNotificationsAsRead(user.id);
        fetchUserNotifications();
        toast({ title: "Notifications Updated", description: "All notifications marked as read." });
      } catch (error) {
        toast({ title: "Error", description: "Failed to mark all notifications as read.", variant: "destructive" });
      }
    }
     setIsNotificationMenuOpen(false);
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation(); 
    if (user) {
        try {
            await deleteNotification(notificationId, user.id);
            fetchUserNotifications();
            toast({title: "Notification Deleted"});
        } catch (error) {
            toast({title: "Error", description: "Failed to delete notification.", variant: "destructive"});
        }
    }
  };

  const recentUnreadNotifications = notifications.filter(n => !n.isRead).slice(0, 5);
  const recentReadNotifications = notifications.filter(n => n.isRead).slice(0, 5);
  const displayedNotifications = recentUnreadNotifications.length > 0 ? recentUnreadNotifications : recentReadNotifications;

  return (
    <>
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-2 sm:space-x-4">
          {showAdminToggle && (
             <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="md:hidden" 
            >
              <PanelLeft className="h-6 w-6" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          )}
          <Link href={isAuthenticated ? (user?.role === 'admin' ? "/admin" : "/my-team") : "/login"} className="flex items-center space-x-2">
            <Image src={settings.logoUrl} alt="Logo" width={32} height={32} className="rounded-sm" data-ai-hint="logo" />
            <span className="font-semibold font-headline hidden sm:inline">{settings.siteTitle}</span>
          </Link>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2">
          {isAuthenticated && user && (
            <>
             <DropdownMenu open={isNotificationMenuOpen} onOpenChange={setIsNotificationMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-4 w-4 min-w-4 p-0 flex items-center justify-center text-xs rounded-full"
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                    <span className="sr-only">Notifications</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
                  <DropdownMenuLabel className="flex justify-between items-center">
                    Notifications
                    {unreadCount > 0 && (
                      <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={handleMarkAllRead}>
                        Mark all as read
                      </Button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {displayedNotifications.length > 0 ? (
                    displayedNotifications.map(notification => (
                      <DropdownMenuItem
                        key={notification.id}
                        onSelect={() => handleNotificationClick(notification)}
                        className={`flex items-start gap-2.5 p-2.5 cursor-pointer ${!notification.isRead ? 'font-semibold' : 'text-muted-foreground'}`}
                      >
                        <NotificationIcon iconName={notification.icon} className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                        <div className="flex-grow">
                          <p className="text-sm leading-tight">{notification.title}</p>
                          <p className={`text-xs leading-tight ${!notification.isRead ? 'text-foreground/80' : 'text-muted-foreground/80'}`}>{notification.message.substring(0, 50)}{notification.message.length > 50 ? '...' : ''}</p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                         <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0" onClick={(e) => handleDeleteNotification(e, notification.id)}>
                            <Trash2 className="h-3.5 w-3.5"/>
                            <span className="sr-only">Delete notification</span>
                        </Button>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">No notifications yet.</div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {user.role === "participant" && (
                <>
                  <Button variant="ghost" asChild className="hidden sm:inline-flex">
                    <Link href="/my-team">My Team</Link>
                  </Button>
                  <Button variant="ghost" asChild className="hidden sm:inline-flex">
                    <Link href="/progress"><ListChecks className="mr-2 h-4 w-4" />Progress</Link>
                  </Button>
                </>
              )}
               {user.role === "admin" && (
                <Button variant="ghost" asChild className="hidden sm:inline-flex">
                  <Link href="/admin"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="px-1 sm:px-3">
                    <UserCircle className="h-5 w-5 sm:mr-2" />
                    <span className="hidden sm:inline text-sm text-muted-foreground">
                       {user.name}
                    </span>
                    <ChevronDown className="ml-1 h-4 w-4 text-muted-foreground hidden sm:inline"/>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                   {user.role === "participant" && (
                    <>
                      <DropdownMenuItem asChild className="sm:hidden">
                        <Link href="/my-team">My Team</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="sm:hidden">
                        <Link href="/progress"><ListChecks className="mr-2 h-4 w-4" />Progress</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {user.role === "admin" && (
                    <DropdownMenuItem asChild className="sm:hidden">
                      <Link href="/admin"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => setIsChangePasswordDialogOpen(true)}>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Change Password
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setIsPasskeyDialogOpen(true)}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Security &amp; Passkeys
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={logout} className="text-destructive hover:!bg-destructive hover:!text-destructive-foreground focus:!bg-destructive focus:!text-destructive-foreground">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <ThemeToggle />
          {!isAuthenticated && (
             <Button variant="outline" asChild>
               <Link href="/login">Login</Link>
             </Button>
          )}
        </div>
      </div>
    </header>
    {isAuthenticated && user && (
      <>
        <ChangePasswordDialog 
            isOpen={isChangePasswordDialogOpen} 
            onOpenChange={setIsChangePasswordDialogOpen} 
        />
        <PasskeyManagementDialog
            isOpen={isPasskeyDialogOpen}
            onOpenChange={setIsPasskeyDialogOpen}
        />
      </>
    )}
    </>
  );
}
