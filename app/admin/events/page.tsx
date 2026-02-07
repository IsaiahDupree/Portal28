"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Plus } from "lucide-react";
import Link from "next/link";

interface Event {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  status: string;
  is_published: boolean;
  current_attendees: number;
  max_attendees: number | null;
}

export default function AdminEventsPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/events");

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      } else {
        setError("Failed to load events");
      }
    } catch (err) {
      console.error("Error fetching events:", err);
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Are you sure you want to delete this event?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchEvents(); // Refresh list
      } else {
        alert("Failed to delete event");
      }
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Failed to delete event");
    }
  }

  async function togglePublished(eventId: string, currentValue: boolean) {
    try {
      const response = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !currentValue }),
      });

      if (response.ok) {
        fetchEvents(); // Refresh list
      } else {
        alert("Failed to update event");
      }
    } catch (err) {
      console.error("Error updating event:", err);
      alert("Failed to update event");
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

  if (loading) {
    return (
      <div className="container max-w-6xl py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading events...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Manage Events</h1>
          <p className="text-muted-foreground">
            Create and manage events for your community
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/events/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {events.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No events created yet.
              </p>
              <Button asChild>
                <Link href="/admin/events/new">Create Your First Event</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <Card key={event.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">{event.title}</h3>
                      <Badge variant={event.is_published ? "default" : "secondary"}>
                        {event.is_published ? "Published" : "Draft"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          event.status === "cancelled"
                            ? "border-red-500 text-red-700"
                            : ""
                        }
                      >
                        {event.status}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(event.start_time)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>
                          {event.current_attendees}
                          {event.max_attendees && ` / ${event.max_attendees}`}{" "}
                          attendees
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        togglePublished(event.id, event.is_published)
                      }
                    >
                      {event.is_published ? "Unpublish" : "Publish"}
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/events/${event.id}`}>Edit</Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(event.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
