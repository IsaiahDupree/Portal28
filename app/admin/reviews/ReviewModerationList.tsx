"use client";

import { useState } from "react";
import { StarRating } from "@/components/reviews/StarRating";
import { CheckCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface Review {
  id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  moderation_status: string;
  moderation_notes: string | null;
  user_metadata: {
    name: string;
  };
  courses: {
    title: string;
  };
}

interface ReviewModerationListProps {
  pendingReviews: Review[];
  moderatedReviews: Review[];
}

export function ReviewModerationList({
  pendingReviews: initialPendingReviews,
  moderatedReviews,
}: ReviewModerationListProps) {
  const router = useRouter();
  const [pendingReviews, setPendingReviews] = useState(initialPendingReviews);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleModerate = async (
    reviewId: string,
    action: "approve" | "reject",
    notes?: string
  ) => {
    setProcessingId(reviewId);
    setError(null);

    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_published: action === "approve",
          moderation_status: action === "approve" ? "approved" : "rejected",
          moderation_notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to moderate review");
      }

      // Remove from pending list
      setPendingReviews((prev) =>
        prev.filter((review) => review.id !== reviewId)
      );

      // Refresh to show updated moderated list
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to moderate review");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Pending Reviews */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Pending Reviews ({pendingReviews.length})
        </h2>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {pendingReviews.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">No pending reviews</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white border border-gray-200 rounded-lg p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-gray-900">
                        {review.user_metadata.name}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-600">
                        {review.courses.title}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(review.created_at).toLocaleString()}
                    </div>
                  </div>
                  <StarRating rating={review.rating} readonly size="sm" />
                </div>

                {review.review_text && (
                  <p className="text-gray-700 mb-4 p-4 bg-gray-50 rounded">
                    {review.review_text}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => handleModerate(review.id, "approve")}
                    disabled={processingId === review.id}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleModerate(review.id, "reject")}
                    disabled={processingId === review.id}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recently Moderated */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Recently Moderated
        </h2>

        {moderatedReviews.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">No moderated reviews yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {moderatedReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white border border-gray-200 rounded-lg p-6 opacity-75"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-gray-900">
                        {review.user_metadata.name}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-600">
                        {review.courses.title}
                      </span>
                      <span
                        className={`ml-auto px-2 py-1 text-xs font-medium rounded-full ${
                          review.moderation_status === "approved"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {review.moderation_status}
                      </span>
                    </div>
                    <StarRating rating={review.rating} readonly size="sm" />
                  </div>
                </div>

                {review.review_text && (
                  <p className="text-gray-600 text-sm mt-2">
                    {review.review_text}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
