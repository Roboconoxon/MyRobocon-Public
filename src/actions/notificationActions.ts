
'use server';

import { readDataFile, writeDataFile } from '@/lib/file-utils';
import type { Notification, NotificationCategory, LucideIconName, User } from '@/lib/types';
import { loadUsers } from './userActions';

const NOTIFICATIONS_FILE = 'notifications.json';
const defaultNotifications: Notification[] = [];

export async function loadNotifications(): Promise<Notification[]> {
  return await readDataFile<Notification[]>(NOTIFICATIONS_FILE, defaultNotifications);
}

export async function saveNotifications(notifications: Notification[]): Promise<void> {
  await writeDataFile<Notification[]>(NOTIFICATIONS_FILE, notifications);
}

export async function createUserNotification(
  userId: string,
  title: string,
  message: string,
  category: NotificationCategory,
  link?: string,
  icon?: LucideIconName
): Promise<Notification> {
  const newNotification: Notification = {
    id: `notif_${Date.now()}_${userId}`,
    userId,
    title,
    message,
    link,
    timestamp: new Date().toISOString(),
    isRead: false,
    category,
    icon: icon || (category === 'resource' ? 'FileText' : category === 'progress' ? 'ClipboardCheck' : 'Info'),
  };

  const notifications = await loadNotifications();
  notifications.push(newNotification);
  await saveNotifications(notifications);
  return newNotification;
}

export async function createNotificationsForUserIds(
  userIds: string[],
  title: string,
  message: string,
  category: NotificationCategory,
  link?: string,
  icon?: LucideIconName
): Promise<Notification[]> {
  const allNotifications = await loadNotifications();
  const createdNotifications: Notification[] = [];

  for (const userId of userIds) {
    const newNotification: Notification = {
      id: `notif_${Date.now()}_${userId}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      title,
      message,
      link,
      timestamp: new Date().toISOString(),
      isRead: false,
      category,
      icon: icon || (category === 'resource' ? 'FileText' : category === 'progress' ? 'ClipboardCheck' : 'Info'),
    };
    allNotifications.push(newNotification);
    createdNotifications.push(newNotification);
  }
  
  await saveNotifications(allNotifications);
  return createdNotifications;
}


export async function getNotificationsForUser(userId: string): Promise<Notification[]> {
  const notifications = await loadNotifications();
  return notifications
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
  const notifications = await loadNotifications();
  const notificationIndex = notifications.findIndex(n => n.id === notificationId && n.userId === userId);

  if (notificationIndex > -1) {
    notifications[notificationIndex].isRead = true;
    await saveNotifications(notifications);
    return true;
  }
  return false;
}

export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  const notifications = await loadNotifications();
  let changed = false;
  notifications.forEach(n => {
    if (n.userId === userId && !n.isRead) {
      n.isRead = true;
      changed = true;
    }
  });

  if (changed) {
    await saveNotifications(notifications);
  }
  return changed;
}

export async function deleteNotification(notificationId: string, userId: string): Promise<boolean> {
  let notifications = await loadNotifications();
  const initialLength = notifications.length;
  notifications = notifications.filter(n => !(n.id === notificationId && n.userId === userId));

  if (notifications.length < initialLength) {
    await saveNotifications(notifications);
    return true;
  }
  return false;
}
