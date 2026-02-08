"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Rating {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  users: {
    full_name: string | null;
    email: string;
  };
}

interface AppRatingsProps {
  widgetKey: string;
  ratings: Rating[];
  userRating: {
    rating: number;
    review_text: string | null;
  } | null;
  isInstalled: boolean;
}

export function AppRatings({
  widgetKey,
  ratings: initialRatings,
  userRating: initialUserRating,
  isInstalled,
}: AppRatingsProps) {
  const [ratings, setRatings] = useState(initialRatings);
  const [userRating, setUserRating] = useState(initialUserRating);
  const [selectedRating, setSelectedRating] = useState(
    initialUserRating?.rating || 0
  );
  const [reviewText, setReviewText] = useState(
    initialUserRating?.review_text || ""
  );
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(!initialUserRating);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (selectedRating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/marketplace/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widget_key: widgetKey,
          rating: selectedRating,
          review_text: reviewText || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit rating");
      }

      setUserRating(data.rating);
      setShowForm(false);
      toast.success("Rating submitted successfully!");

      // Refresh ratings
      const ratingsRes = await fetch(
        `/api/marketplace/ratings?widget_key=${widgetKey}`
      );
      const ratingsData = await ratingsRes.json();
      setRatings(ratingsData.ratings || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit rating"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Ratings & Reviews</h2>

      {/* User Rating Form */}
      {isInstalled && showForm && (
        <form onSubmit={handleSubmit} className="border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Rate this app</h3>

          <div className="space-y-4">
            <div>
              <Label>Your Rating</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedRating(star)}
                    className="text-3xl hover:scale-110 transition-transform"
                  >
                    {star <= selectedRating ? "★" : "☆"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="review">Review (optional)</Label>
              <Textarea
                id="review"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience with this app..."
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {reviewText.length}/1000 characters
              </p>
            </div>

            <Button type="submit" disabled={loading || selectedRating === 0}>
              {loading ? "Submitting..." : "Submit Rating"}
            </Button>
          </div>
        </form>
      )}

      {/* User's Existing Rating */}
      {userRating && !showForm && (
        <div className="border rounded-lg p-6 bg-muted">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Your Rating</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              Edit
            </Button>
          </div>
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className="text-yellow-500">
                {star <= userRating.rating ? "★" : "☆"}
              </span>
            ))}
          </div>
          {userRating.review_text && (
            <p className="text-sm">{userRating.review_text}</p>
          )}
        </div>
      )}

      {/* All Ratings */}
      <div className="space-y-4">
        <h3 className="font-semibold">All Reviews</h3>

        {ratings.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No reviews yet. Be the first to review!
          </p>
        ) : (
          ratings.map((rating) => (
            <div key={rating.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="text-yellow-500">
                      {star <= rating.rating ? "★" : "☆"}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(rating.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm font-medium mb-1">
                {rating.users.full_name || rating.users.email}
              </p>
              {rating.review_text && (
                <p className="text-sm text-muted-foreground">
                  {rating.review_text}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
