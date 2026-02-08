"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Plus, Video } from "lucide-react";
import Link from "next/link";

interface CoachingSlot {
  id: string;
  title: string;
  slot_type: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: string;
  is_published: boolean;
  current_participants: number;
  max_participants: number;
  price_cents: number;
  location_type: string;
  video_call_url?: string;
}

export default function AdminCoachingPage() {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<CoachingSlot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "Coaching Session",
    description: "",
    duration_minutes: 60,
    slot_type: "one_on_one",
    max_participants: 1,
    price_cents: 0,
    start_time: "",
    end_time: "",
    timezone: "America/New_York",
    location: "",
    location_type: "virtual",
    video_call_url: "",
  });

  useEffect(() => {
    fetchSlots();
  }, []);

  async function fetchSlots() {
    try {
      setLoading(true);
      const response = await fetch("/api/coaching/slots?coach_id=me");

      if (response.ok) {
        const data = await response.json();
        setSlots(data.slots || []);
      } else {
        setError("Failed to load coaching slots");
      }
    } catch (err) {
      console.error("Error fetching coaching slots:", err);
      setError("Failed to load coaching slots");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSlot(e: React.FormEvent) {
    e.preventDefault();

    try {
      const response = await fetch("/api/coaching/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setShowCreateForm(false);
        fetchSlots();
        // Reset form
        setFormData({
          title: "Coaching Session",
          description: "",
          duration_minutes: 60,
          slot_type: "one_on_one",
          max_participants: 1,
          price_cents: 0,
          start_time: "",
          end_time: "",
          timezone: "America/New_York",
          location: "",
          location_type: "virtual",
          video_call_url: "",
        });
      } else {
        const data = await response.json();
        alert(data.error || "Failed to create slot");
      }
    } catch (err) {
      console.error("Error creating slot:", err);
      alert("Failed to create slot");
    }
  }

  async function handleDelete(slotId: string) {
    if (!confirm("Are you sure you want to delete this coaching slot?")) {
      return;
    }

    try {
      const response = await fetch(`/api/coaching/slots/${slotId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchSlots();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete slot");
      }
    } catch (err) {
      console.error("Error deleting slot:", err);
      alert("Failed to delete slot");
    }
  }

  async function togglePublished(slotId: string, currentValue: boolean) {
    try {
      const response = await fetch(`/api/coaching/slots/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !currentValue }),
      });

      if (response.ok) {
        fetchSlots();
      } else {
        alert("Failed to update slot");
      }
    } catch (err) {
      console.error("Error updating slot:", err);
      alert("Failed to update slot");
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatPrice(cents: number) {
    return cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`;
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Coaching Management</h1>
          <p className="text-muted-foreground">
            Manage your coaching availability and bookings
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Slot
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create Coaching Slot</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSlot} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration_minutes: parseInt(e.target.value),
                      })
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                    min="15"
                    max="480"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Slot Type</label>
                  <select
                    value={formData.slot_type}
                    onChange={(e) =>
                      setFormData({ ...formData, slot_type: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="one_on_one">One-on-One</option>
                    <option value="group">Group</option>
                    <option value="workshop">Workshop</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Participants</label>
                  <input
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_participants: parseInt(e.target.value),
                      })
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price ($)</label>
                  <input
                    type="number"
                    value={formData.price_cents / 100}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_cents: parseFloat(e.target.value) * 100,
                      })
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Location Type</label>
                  <select
                    value={formData.location_type}
                    onChange={(e) =>
                      setFormData({ ...formData, location_type: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="virtual">Virtual</option>
                    <option value="physical">Physical</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Video Call URL (optional)
                  </label>
                  <input
                    type="url"
                    value={formData.video_call_url}
                    onChange={(e) =>
                      setFormData({ ...formData, video_call_url: e.target.value })
                    }
                    className="w-full border rounded px-3 py-2"
                    placeholder="https://zoom.us/j/..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Create Slot</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-8">{error}</div>
      )}

      <div className="grid gap-4">
        {slots.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No coaching slots yet. Create your first slot to get started.
            </CardContent>
          </Card>
        ) : (
          slots.map((slot) => (
            <Card key={slot.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{slot.title}</h3>
                      <Badge
                        variant={
                          slot.status === "available"
                            ? "default"
                            : slot.status === "booked"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {slot.status}
                      </Badge>
                      {!slot.is_published && (
                        <Badge variant="outline">Unpublished</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(slot.start_time)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>
                          {slot.current_participants}/{slot.max_participants} participants
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        {slot.duration_minutes} minutes
                      </div>
                      <div className="font-medium">{formatPrice(slot.price_cents)}</div>
                    </div>

                    <div className="flex gap-2 mt-3 text-xs">
                      <Badge variant="outline">{slot.slot_type}</Badge>
                      <Badge variant="outline">{slot.location_type}</Badge>
                      {slot.video_call_url && (
                        <Badge variant="outline">
                          <Video className="h-3 w-3 mr-1" />
                          Video Call
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => togglePublished(slot.id, slot.is_published)}
                    >
                      {slot.is_published ? "Unpublish" : "Publish"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(slot.id)}
                      disabled={slot.current_participants > 0}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
