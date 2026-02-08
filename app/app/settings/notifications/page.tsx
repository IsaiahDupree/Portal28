"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NotificationPreferences {
  in_app_notifications: boolean;
  email_on_comment: boolean;
  email_on_reply: boolean;
  email_on_announcement: boolean;
  email_on_course_update: boolean;
}

interface EmailPreferences {
  announcements_enabled: boolean;
  replies_enabled: boolean;
  digest_enabled: boolean;
  digest_frequency: "daily" | "weekly" | "monthly";
}

export default function NotificationSettingsPage() {
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences | null>(null);
  const [emailPrefs, setEmailPrefs] = useState<EmailPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    setIsLoading(true);
    try {
      // Load notification preferences
      const notifResponse = await fetch("/api/notifications/preferences");
      if (notifResponse.ok) {
        const notifData = await notifResponse.json();
        setNotificationPrefs(notifData);
      }

      // Load email preferences (for community spaces)
      const emailResponse = await fetch("/api/email/preferences");
      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        // Get the first space's preferences (or default)
        if (emailData && emailData.length > 0) {
          setEmailPrefs(emailData[0]);
        } else {
          // Set defaults if no preferences exist
          setEmailPrefs({
            announcements_enabled: true,
            replies_enabled: true,
            digest_enabled: false,
            digest_frequency: "weekly",
          });
        }
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to load preferences" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);

    try {
      // Save notification preferences
      if (notificationPrefs) {
        const notifResponse = await fetch("/api/notifications/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(notificationPrefs),
        });

        if (!notifResponse.ok) {
          throw new Error("Failed to save notification preferences");
        }
      }

      // Save email preferences
      if (emailPrefs) {
        const emailResponse = await fetch("/api/email/preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailPrefs),
        });

        if (!emailResponse.ok) {
          throw new Error("Failed to save email preferences");
        }
      }

      setMessage({ type: "success", text: "Preferences saved successfully!" });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl py-12 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-8"></div>
          <div className="space-y-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
      <p className="text-gray-600 mb-8">
        Manage how you receive notifications and updates
      </p>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-8">
        {/* In-App Notifications */}
        <section className="border-b pb-6">
          <h2 className="text-xl font-semibold mb-4">In-App Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="in-app" className="text-base font-medium">
                  Enable in-app notifications
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  Show notifications in the app notification center
                </p>
              </div>
              <Switch
                id="in-app"
                checked={notificationPrefs?.in_app_notifications ?? true}
                onCheckedChange={(checked) =>
                  setNotificationPrefs((prev) => ({
                    ...prev!,
                    in_app_notifications: checked,
                  }))
                }
              />
            </div>
          </div>
        </section>

        {/* Email Notifications - Course Activity */}
        <section className="border-b pb-6">
          <h2 className="text-xl font-semibold mb-4">Course Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-comment" className="text-base font-medium">
                  Comments on your posts
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  Get notified when someone comments on your lesson posts
                </p>
              </div>
              <Switch
                id="email-comment"
                checked={notificationPrefs?.email_on_comment ?? true}
                onCheckedChange={(checked) =>
                  setNotificationPrefs((prev) => ({
                    ...prev!,
                    email_on_comment: checked,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-reply" className="text-base font-medium">
                  Replies to your comments
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  Get notified when someone replies to your comments
                </p>
              </div>
              <Switch
                id="email-reply"
                checked={notificationPrefs?.email_on_reply ?? true}
                onCheckedChange={(checked) =>
                  setNotificationPrefs((prev) => ({
                    ...prev!,
                    email_on_reply: checked,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-course" className="text-base font-medium">
                  Course updates
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  Get notified when courses you own are updated
                </p>
              </div>
              <Switch
                id="email-course"
                checked={notificationPrefs?.email_on_course_update ?? true}
                onCheckedChange={(checked) =>
                  setNotificationPrefs((prev) => ({
                    ...prev!,
                    email_on_course_update: checked,
                  }))
                }
              />
            </div>
          </div>
        </section>

        {/* Email Notifications - Community */}
        <section className="border-b pb-6">
          <h2 className="text-xl font-semibold mb-4">Community Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-announcement" className="text-base font-medium">
                  Community announcements
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  Get notified about important community announcements
                </p>
              </div>
              <Switch
                id="email-announcement"
                checked={notificationPrefs?.email_on_announcement ?? true}
                onCheckedChange={(checked) =>
                  setNotificationPrefs((prev) => ({
                    ...prev!,
                    email_on_announcement: checked,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="forum-replies" className="text-base font-medium">
                  Forum post replies
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  Get notified when someone replies to your forum posts
                </p>
              </div>
              <Switch
                id="forum-replies"
                checked={emailPrefs?.replies_enabled ?? true}
                onCheckedChange={(checked) =>
                  setEmailPrefs((prev) => ({
                    ...prev!,
                    replies_enabled: checked,
                  }))
                }
              />
            </div>
          </div>
        </section>

        {/* Email Digest Options */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Email Digest</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="digest-enabled" className="text-base font-medium">
                  Enable email digest
                </Label>
                <p className="text-sm text-gray-500 mt-1">
                  Receive a summary of activity instead of individual emails
                </p>
              </div>
              <Switch
                id="digest-enabled"
                checked={emailPrefs?.digest_enabled ?? false}
                onCheckedChange={(checked) =>
                  setEmailPrefs((prev) => ({
                    ...prev!,
                    digest_enabled: checked,
                  }))
                }
              />
            </div>

            {emailPrefs?.digest_enabled && (
              <div>
                <Label htmlFor="digest-frequency" className="text-base font-medium">
                  Digest frequency
                </Label>
                <Select
                  value={emailPrefs?.digest_frequency ?? "weekly"}
                  onValueChange={(value: "daily" | "weekly" | "monthly") =>
                    setEmailPrefs((prev) => ({
                      ...prev!,
                      digest_frequency: value,
                    }))
                  }
                >
                  <SelectTrigger id="digest-frequency" className="w-full mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500 mt-1">
                  How often you want to receive digest emails
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Save Button */}
        <div className="flex gap-4 pt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Preferences"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={loadPreferences}
            disabled={isSaving}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
