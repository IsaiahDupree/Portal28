"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Clock, DollarSign, Video, MapPin } from "lucide-react";

interface CoachingSlot {
  id: string;
  coach_id: string;
  coach_name: string;
  coach_email: string;
  title: string;
  description?: string;
  slot_type: string;
  duration_minutes: number;
  max_participants: number;
  current_participants: number;
  price_cents: number;
  start_time: string;
  end_time: string;
  timezone: string;
  location?: string;
  location_type: string;
  status: string;
  is_booked_by_user: boolean;
}

interface Booking {
  id: string;
  slot_id: string;
  status: string;
  notes?: string;
  slot: {
    title: string;
    start_time: string;
    duration_minutes: number;
    video_call_url?: string;
    coach: {
      email: string;
      email: string;
    };
  };
}

export default function CoachingPage() {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<CoachingSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"available" | "my-bookings">("available");
  const [selectedSlot, setSelectedSlot] = useState<CoachingSlot | null>(null);
  const [bookingNotes, setBookingNotes] = useState("");

  useEffect(() => {
    fetchSlots();
    fetchBookings();
  }, []);

  async function fetchSlots() {
    try {
      setLoading(true);
      const response = await fetch("/api/coaching/slots?days_ahead=60");

      if (response.ok) {
        const data = await response.json();
        setSlots(data.slots || []);
      } else {
        setError("Failed to load coaching slots");
      }
    } catch (err) {
      console.error("Error fetching slots:", err);
      setError("Failed to load coaching slots");
    } finally {
      setLoading(false);
    }
  }

  async function fetchBookings() {
    try {
      const response = await fetch("/api/coaching/bookings?upcoming_only=true");

      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
  }

  async function handleBookSlot(slotId: string) {
    try {
      const response = await fetch("/api/coaching/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_id: slotId,
          notes: bookingNotes,
        }),
      });

      if (response.ok) {
        setSelectedSlot(null);
        setBookingNotes("");
        fetchSlots();
        fetchBookings();
        alert("Booking created successfully!");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to create booking");
      }
    } catch (err) {
      console.error("Error creating booking:", err);
      alert("Failed to create booking");
    }
  }

  async function handleCancelBooking(bookingId: string) {
    if (!confirm("Are you sure you want to cancel this booking?")) {
      return;
    }

    try {
      const response = await fetch(`/api/coaching/bookings/${bookingId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchBookings();
        fetchSlots();
        alert("Booking cancelled successfully");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to cancel booking");
      }
    } catch (err) {
      console.error("Error cancelling booking:", err);
      alert("Failed to cancel booking");
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatPrice(cents: number) {
    return cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`;
  }

  const availableSlots = slots.filter((slot) => !slot.is_booked_by_user);

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Coaching Sessions</h1>
        <p className="text-muted-foreground">
          Book one-on-one coaching sessions with our expert coaches
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <Button
          variant={selectedTab === "available" ? "default" : "outline"}
          onClick={() => setSelectedTab("available")}
        >
          Available Sessions
        </Button>
        <Button
          variant={selectedTab === "my-bookings" ? "default" : "outline"}
          onClick={() => setSelectedTab("my-bookings")}
        >
          My Bookings ({bookings.length})
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-8">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <>
          {selectedTab === "available" && (
            <div className="grid gap-6">
              {availableSlots.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No coaching sessions available at the moment.
                  </CardContent>
                </Card>
              ) : (
                availableSlots.map((slot) => (
                  <Card key={slot.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold">{slot.title}</h3>
                            <Badge variant="outline">{slot.slot_type}</Badge>
                            {slot.price_cents === 0 && (
                              <Badge variant="secondary">Free</Badge>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground mb-4">
                            with {slot.coach_name}
                          </p>

                          {slot.description && (
                            <p className="text-sm mb-4">{slot.description}</p>
                          )}

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <div>
                                <div className="font-medium">
                                  {formatDate(slot.start_time)}
                                </div>
                                <div>{formatTime(slot.start_time)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{slot.duration_minutes} minutes</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>
                                {slot.max_participants - slot.current_participants} spots left
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <DollarSign className="h-4 w-4" />
                              <span className="font-semibold">
                                {formatPrice(slot.price_cents)}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 text-xs">
                            <Badge variant="outline">
                              {slot.location_type === "virtual" ? (
                                <>
                                  <Video className="h-3 w-3 mr-1" />
                                  Virtual
                                </>
                              ) : slot.location_type === "physical" ? (
                                <>
                                  <MapPin className="h-3 w-3 mr-1" />
                                  Physical
                                </>
                              ) : (
                                "Hybrid"
                              )}
                            </Badge>
                          </div>
                        </div>

                        <Button onClick={() => setSelectedSlot(slot)}>Book Now</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {selectedTab === "my-bookings" && (
            <div className="grid gap-6">
              {bookings.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    You don&apos;t have any bookings yet.
                  </CardContent>
                </Card>
              ) : (
                bookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold">
                              {booking.slot.title}
                            </h3>
                            <Badge
                              variant={
                                booking.status === "confirmed"
                                  ? "default"
                                  : booking.status === "pending"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {booking.status}
                            </Badge>
                          </div>

                          <p className="text-sm text-muted-foreground mb-4">
                            with {booking.slot.coach.email}
                          </p>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <div>
                                <div className="font-medium">
                                  {formatDate(booking.slot.start_time)}
                                </div>
                                <div>{formatTime(booking.slot.start_time)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{booking.slot.duration_minutes} minutes</span>
                            </div>
                            {booking.slot.video_call_url && (
                              <div>
                                <a
                                  href={booking.slot.video_call_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-blue-600 hover:underline"
                                >
                                  <Video className="h-4 w-4" />
                                  Join Call
                                </a>
                              </div>
                            )}
                          </div>

                          {booking.notes && (
                            <div className="text-sm bg-gray-50 p-3 rounded">
                              <strong>Your notes:</strong> {booking.notes}
                            </div>
                          )}
                        </div>

                        {booking.status !== "cancelled" &&
                          booking.status !== "completed" && (
                            <Button
                              variant="outline"
                              onClick={() => handleCancelBooking(booking.id)}
                            >
                              Cancel
                            </Button>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}

      {selectedSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle>Book Coaching Session</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedSlot.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    with {selectedSlot.coach_name}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Date:</strong> {formatDate(selectedSlot.start_time)}
                  </div>
                  <div>
                    <strong>Time:</strong> {formatTime(selectedSlot.start_time)}
                  </div>
                  <div>
                    <strong>Duration:</strong> {selectedSlot.duration_minutes} minutes
                  </div>
                  <div>
                    <strong>Price:</strong> {formatPrice(selectedSlot.price_cents)}
                  </div>
                </div>

                {selectedSlot.description && (
                  <div>
                    <strong className="block mb-1">Description:</strong>
                    <p className="text-sm text-muted-foreground">
                      {selectedSlot.description}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Notes for the coach (optional)
                  </label>
                  <textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    placeholder="Any specific topics or questions you'd like to discuss..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => handleBookSlot(selectedSlot.id)}>
                    Confirm Booking
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedSlot(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
