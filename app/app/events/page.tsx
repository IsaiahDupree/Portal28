"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Users, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Event {
  id: string;
  title: string;
  description: string;
  event_type: string;
  location: string;
  location_type: string;
  start_time: string;
  end_time: string;
  timezone: string;
  max_attendees: number | null;
  current_attendees: number;
  status: string;
  cover_image_url: string | null;
  is_registered?: boolean;
  is_full?: boolean;
}

export default function EventsPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setLoading(true);
      const response = await fetch("/api/events/upcoming");

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

  async function handleRegister(eventId: string) {
    try {
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
      });

      if (response.ok) {
        fetchEvents(); // Refresh events
      } else {
        const data = await response.json();
        alert(data.error || "Failed to register");
      }
    } catch (err) {
      console.error("Error registering for event:", err);
      alert("Failed to register for event");
    }
  }

  async function handleCancelRegistration(eventId: string) {
    try {
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchEvents(); // Refresh events
      } else {
        alert("Failed to cancel registration");
      }
    } catch (err) {
      console.error("Error cancelling registration:", err);
      alert("Failed to cancel registration");
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const filteredEvents = events.filter((event) => {
    if (filter === "all") return true;
    if (filter === "registered") return event.is_registered;
    if (filter === "available") return !event.is_registered && !event.is_full;
    return true;
  });

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
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Upcoming Events</h1>
        <p className="text-muted-foreground">
          Join us for webinars, workshops, and live sessions
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="mb-6 flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All Events
        </Button>
        <Button
          variant={filter === "registered" ? "default" : "outline"}
          onClick={() => setFilter("registered")}
        >
          My Events
        </Button>
        <Button
          variant={filter === "available" ? "default" : "outline"}
          onClick={() => setFilter("available")}
        >
          Available
        </Button>
      </div>

      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {filter === "registered"
                ? "You haven't registered for any events yet."
                : "No upcoming events at this time."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredEvents.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              {event.cover_image_url && (
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-xl">{event.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {event.description}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {event.event_type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(event.start_time)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatTime(event.start_time)} - {formatTime(event.end_time)}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {event.location_type === "virtual" ? (
                        <a
                          href={event.location}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Join Online
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span>{event.location}</span>
                      )}
                    </div>
                  )}
                  {event.max_attendees && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {event.current_attendees} / {event.max_attendees} attendees
                      </span>
                      {event.is_full && (
                        <Badge variant="destructive" className="ml-2">
                          Full
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  {event.is_registered ? (
                    <div className="space-y-2">
                      <Badge className="bg-green-500">Registered</Badge>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleCancelRegistration(event.id)}
                      >
                        Cancel Registration
                      </Button>
                    </div>
                  ) : event.is_full ? (
                    <Button className="w-full" disabled>
                      Event Full
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleRegister(event.id)}
                    >
                      Register Now
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/app/events/calendar">
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            View Calendar
          </Button>
        </Link>
      </div>
    </div>
  );
}
