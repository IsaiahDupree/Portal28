"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Check, X } from "lucide-react";

interface Instructor {
  id: string;
  display_name: string;
  bio?: string;
  total_courses: number;
  total_students: number;
  is_verified: boolean;
  payout_method: string;
  user: {
    email: string;
  };
}

export default function AdminInstructorsPage() {
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInstructors();
  }, []);

  async function fetchInstructors() {
    try {
      setLoading(true);
      const response = await fetch("/api/instructors");

      if (response.ok) {
        const data = await response.json();
        setInstructors(data.instructors || []);
      } else {
        setError("Failed to load instructors");
      }
    } catch (err) {
      console.error("Error fetching instructors:", err);
      setError("Failed to load instructors");
    } finally {
      setLoading(false);
    }
  }

  async function toggleVerified(instructorId: string, currentValue: boolean) {
    try {
      const response = await fetch(`/api/instructors/${instructorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_verified: !currentValue }),
      });

      if (response.ok) {
        fetchInstructors();
      } else {
        alert("Failed to update verification status");
      }
    } catch (err) {
      console.error("Error updating instructor:", err);
      alert("Failed to update instructor");
    }
  }

  async function handleDelete(instructorId: string) {
    if (!confirm("Are you sure you want to delete this instructor?")) {
      return;
    }

    try {
      const response = await fetch(`/api/instructors/${instructorId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchInstructors();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete instructor");
      }
    } catch (err) {
      console.error("Error deleting instructor:", err);
      alert("Failed to delete instructor");
    }
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
          <h1 className="text-3xl font-bold mb-2">Instructor Management</h1>
          <p className="text-muted-foreground">
            Manage instructors and their profiles
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Instructor
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-8">{error}</div>
      )}

      <div className="grid gap-4">
        {instructors.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No instructors yet. Add your first instructor to get started.
            </CardContent>
          </Card>
        ) : (
          instructors.map((instructor) => (
            <Card key={instructor.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {instructor.display_name}
                      </h3>
                      {instructor.is_verified ? (
                        <Badge variant="default">
                          <Check className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <X className="h-3 w-3 mr-1" />
                          Unverified
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {instructor.user.email}
                    </p>

                    {instructor.bio && (
                      <p className="text-sm mb-3">{instructor.bio}</p>
                    )}

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Courses:</span>{" "}
                        <span className="font-medium">
                          {instructor.total_courses}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Students:</span>{" "}
                        <span className="font-medium">
                          {instructor.total_students}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Payout:</span>{" "}
                        <span className="font-medium capitalize">
                          {instructor.payout_method}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleVerified(instructor.id, instructor.is_verified)
                      }
                    >
                      {instructor.is_verified ? "Unverify" : "Verify"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(instructor.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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
