"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  GraduationCap, 
  Clock, 
  BookOpen, 
  Play,
  ChevronRight,
  Users,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Module {
  id: string;
  title: string;
  lessonCount: number;
}

interface CourseCardProps {
  id: string;
  slug: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  modules?: Module[];
  lessonCount?: number;
  duration?: string;
  progress?: number;
  enrolled?: boolean;
  price?: string;
  rating?: number;
  studentCount?: number;
  className?: string;
}

export function CourseCard({
  id,
  slug,
  title,
  description,
  thumbnailUrl,
  modules = [],
  lessonCount = 0,
  duration,
  progress,
  enrolled = false,
  price,
  rating,
  studentCount,
  className,
}: CourseCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Dialog>
      <Card 
        className={cn(
          "group overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/50 cursor-pointer",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          {thumbnailUrl ? (
            <img 
              src={thumbnailUrl} 
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <GraduationCap className="h-16 w-16 text-primary/40" />
            </div>
          )}
          
          {/* Overlay on hover */}
          <div className={cn(
            "absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity",
            isHovered ? "opacity-100" : "opacity-0"
          )}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="lg">
                <Play className="mr-2 h-4 w-4" />
                View Details
              </Button>
            </DialogTrigger>
          </div>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            {enrolled && (
              <Badge className="bg-brand-green text-white">Enrolled</Badge>
            )}
            {price && !enrolled && (
              <Badge variant="secondary">{price}</Badge>
            )}
          </div>

          {/* Progress bar for enrolled courses */}
          {enrolled && progress !== undefined && (
            <div className="absolute bottom-0 left-0 right-0">
              <Progress value={progress} className="h-1 rounded-none" />
            </div>
          )}
        </div>

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-lg">{title}</CardTitle>
            {rating && (
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="h-4 w-4 fill-current" />
                <span className="text-sm font-medium">{rating}</span>
              </div>
            )}
          </div>
          {description && (
            <CardDescription className="line-clamp-2">
              {description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {lessonCount > 0 && (
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>{lessonCount} lessons</span>
              </div>
            )}
            {duration && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{duration}</span>
              </div>
            )}
            {studentCount && (
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{studentCount.toLocaleString()}</span>
              </div>
            )}
          </div>

          {enrolled && progress !== undefined && (
            <p className="mt-2 text-sm text-muted-foreground">
              {progress}% complete
            </p>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Course stats */}
          <div className="flex flex-wrap gap-4">
            {lessonCount > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="h-5 w-5 text-primary" />
                <span>{lessonCount} lessons</span>
              </div>
            )}
            {duration && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-5 w-5 text-primary" />
                <span>{duration}</span>
              </div>
            )}
            {rating && (
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-5 w-5 text-amber-500 fill-current" />
                <span>{rating} rating</span>
              </div>
            )}
            {studentCount && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-5 w-5 text-primary" />
                <span>{studentCount.toLocaleString()} students</span>
              </div>
            )}
          </div>

          {/* Modules list */}
          {modules.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold">Course Content</h4>
              <div className="space-y-2">
                {modules.map((module, index) => (
                  <div 
                    key={module.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {index + 1}
                      </span>
                      <span className="font-medium">{module.title}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {module.lessonCount} lessons
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action button */}
          <div className="flex gap-3">
            {enrolled ? (
              <Button asChild className="flex-1">
                <Link href={`/app/courses/${slug}`}>
                  Continue Learning
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/courses/${slug}`}>
                    Learn More
                  </Link>
                </Button>
                {price && (
                  <Button className="flex-1">
                    Enroll Now - {price}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
