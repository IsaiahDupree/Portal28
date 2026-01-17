"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Profile {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/profile");
      if (!response.ok) throw new Error("Failed to load profile");

      const data = await response.json();
      setProfile(data);
      setDisplayName(data.display_name || "");
      setBio(data.bio || "");
      setAvatarUrl(data.avatar_url);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to load profile" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          bio: bio,
          avatar_url: avatarUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save profile");
      }

      const updated = await response.json();
      setProfile(updated);
      setMessage({ type: "success", text: "Profile saved successfully!" });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select an image file" });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be less than 5MB" });
      return;
    }

    setIsUploadingAvatar(true);
    setMessage(null);

    try {
      // Get presigned upload URL
      const urlResponse = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!urlResponse.ok) {
        const error = await urlResponse.json();
        throw new Error(error.error || "Failed to get upload URL");
      }

      const { uploadUrl, publicUrl } = await urlResponse.json();

      // Upload file to S3/R2
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload avatar");
      }

      // Update avatar URL in state (will be saved when user clicks Save)
      setAvatarUrl(publicUrl);
      setMessage({ type: "success", text: "Avatar uploaded! Click Save to update your profile." });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!confirm("Remove your profile avatar?")) return;

    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove avatar");

      setAvatarUrl(null);
      setMessage({ type: "success", text: "Avatar removed" });
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    }
  }

  function getInitials(name: string): string {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl py-12 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="space-y-4">
            <div className="h-24 bg-gray-200 rounded-full w-24"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>

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

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar Section */}
        <div>
          <Label className="text-base font-semibold mb-4 block">Profile Picture</Label>
          <div className="flex items-center gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={avatarUrl || undefined} alt={displayName || "User"} />
              <AvatarFallback className="text-xl">
                {displayName ? getInitials(displayName) : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="avatar-upload"
                className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                {isUploadingAvatar ? "Uploading..." : "Upload New"}
              </Label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={isUploadingAvatar}
                className="hidden"
              />
              {avatarUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  disabled={isUploadingAvatar}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            JPG, PNG, GIF or WebP. Max size 5MB.
          </p>
        </div>

        {/* Display Name */}
        <div>
          <Label htmlFor="display-name" className="text-base font-semibold">
            Display Name
          </Label>
          <Input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="mt-2"
            maxLength={100}
          />
          <p className="text-sm text-gray-500 mt-1">
            This is how your name will appear to other users.
          </p>
        </div>

        {/* Bio */}
        <div>
          <Label htmlFor="bio" className="text-base font-semibold">
            Bio
          </Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us a bit about yourself"
            className="mt-2 min-h-32"
            maxLength={500}
          />
          <p className="text-sm text-gray-500 mt-1">
            {bio.length}/500 characters
          </p>
        </div>

        {/* Save Button */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isSaving || isUploadingAvatar}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={loadProfile}
            disabled={isSaving || isUploadingAvatar}
          >
            Reset
          </Button>
        </div>
      </form>
    </div>
  );
}
