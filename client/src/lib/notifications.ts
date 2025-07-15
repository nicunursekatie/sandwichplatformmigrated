import { supabase } from '@/lib/supabase';

export interface NotificationPayload {
  user_id: string;
  type: string;
  title: string;
  body: string;
  source_id?: string;
  related_type?: string;
  related_id?: number;
  celebration_data?: any;
}

/**
 * Send a notification to a user
 * This will insert a notification into the database and trigger real-time updates
 */
export async function sendNotification(payload: NotificationPayload) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        ...payload,
        read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending notification:', error);
      throw error;
    }

    return { success: true, notification: data };
  } catch (error) {
    console.error('Failed to send notification:', error);
    return { success: false, error };
  }
}

/**
 * Send multiple notifications at once
 */
export async function sendBulkNotifications(payloads: NotificationPayload[]) {
  try {
    const notifications = payloads.map(payload => ({
      ...payload,
      read: false,
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      console.error('Error sending bulk notifications:', error);
      throw error;
    }

    return { success: true, notifications: data };
  } catch (error) {
    console.error('Failed to send bulk notifications:', error);
    return { success: false, error };
  }
}