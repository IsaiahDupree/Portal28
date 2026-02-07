"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Event {
  id: string;
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  is_registered?: boolean;
}

export default function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setLoading(true);
      const response = await fetch("/api/events/upcoming?days_ahead=60");

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  }

  function getDaysInMonth(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  }

  function getEventsForDate(date: Date) {
    return events.filter((event) => {
      const eventDate = new Date(event.start_time);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  }

  function previousMonth() {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  }

  function nextMonth() {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  }

  const { daysInMonth, startingDayOfWeek, year, month } =
    getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long" });

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  if (loading) {
    return (
      <div className="container max-w-7xl py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading calendar...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-10">
      <div className="mb-8">
        <Link href="/app/events">
          <Button variant="ghost" size="sm" className="mb-4">
            ← Back to Events
          </Button>
        </Link>
        <h1 className="text-4xl font-bold mb-2">Events Calendar</h1>
        <p className="text-muted-foreground">
          View all upcoming events in calendar format
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl">
              {monthName} {year}
            </CardTitle>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-sm text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const date = new Date(year, month, day);
              const dayEvents = getEventsForDate(date);
              const isToday =
                date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={day}
                  className={`
                    aspect-square border rounded-lg p-2
                    ${isToday ? "bg-blue-50 border-blue-300" : ""}
                    ${dayEvents.length > 0 ? "cursor-pointer hover:bg-gray-50" : ""}
                  `}
                >
                  <div className="flex flex-col h-full">
                    <div
                      className={`text-sm font-semibold mb-1 ${
                        isToday ? "text-blue-600" : ""
                      }`}
                    >
                      {day}
                    </div>

                    <div className="space-y-1 overflow-y-auto">
                      {dayEvents.slice(0, 3).map((event) => (
                        <Link
                          key={event.id}
                          href={`/app/events/${event.id}`}
                          className="block"
                        >
                          <div
                            className={`
                              text-xs p-1 rounded truncate
                              ${
                                event.is_registered
                                  ? "bg-green-100 text-green-800"
                                  : "bg-blue-100 text-blue-800"
                              }
                            `}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        </Link>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-100" />
          <span className="text-sm">Available Events</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-100" />
          <span className="text-sm">Registered Events</span>
        </div>
      </div>
    </div>
  );
}
