import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export type NotificationType =
  | "comment"
  | "reply"
  | "announcement"
  | "course_update"
  | "admin_message"
  | "certificate";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  metadata = {},
}: CreateNotificationParams) {
  try {
    // Check if user has in-app notifications enabled
    const { data: preferences } = await supabaseAdmin
      .from("notification_preferences")
      .select("in_app_notifications")
      .eq("user_id", userId)
      .single();

    // If preferences don't exist or in_app_notifications is true, create notification
    if (!preferences || preferences.in_app_notifications !== false) {
      const { data, error } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: userId,
          type,
          title,
          message,
          link: link || null,
          metadata,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating notification:", error);
        return { success: false, error };
      }

      return { success: true, data };
    }

    return { success: true, data: null, message: "Notifications disabled for user" };
  } catch (error) {
    console.error("Error in createNotification:", error);
    return { success: false, error };
  }
}

export async function createBulkNotifications(
  notifications: CreateNotificationParams[]
) {
  try {
    const notificationsToInsert = notifications.map((n) => ({
      user_id: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link || null,
      metadata: n.metadata || {},
    }));

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert(notificationsToInsert)
      .select();

    if (error) {
      console.error("Error creating bulk notifications:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error in createBulkNotifications:", error);
    return { success: false, error };
  }
}
