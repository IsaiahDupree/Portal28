"use client";

import { useState, useRef } from "react";
import MuxPlayer from "@mux/mux-player-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  SkipBack,
  SkipForward,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  onComplete?: () => void;
  className?: string;
  // Mux-specific props
  muxPlaybackId?: string;
  muxPlaybackToken?: string;
  lessonId?: string;
  onProgress?: (position: number, duration: number) => void;
}

export function VideoPlayer({
  src,
  title,
  poster,
  onComplete,
  className,
  muxPlaybackId,
  muxPlaybackToken,
  lessonId,
  onProgress
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const muxPlayerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Check if this is a Mux video
  const isMuxVideo = Boolean(muxPlaybackId);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      // Check if video is complete (within last 5 seconds)
      if (duration > 0 && videoRef.current.currentTime >= duration - 5) {
        onComplete?.();
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (videoRef.current) {
      const newVolume = value[0];
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Render Mux player if we have a Mux playback ID
  if (isMuxVideo && muxPlaybackId) {
    return (
      <Card className={cn("overflow-hidden bg-black", className)}>
        <div className="relative aspect-video">
          <MuxPlayer
            ref={muxPlayerRef}
            playbackId={muxPlaybackId}
            tokens={{
              playback: muxPlaybackToken,
            }}
            metadata={{
              video_title: title || "Lesson Video",
              lesson_id: lessonId,
            }}
            streamType="on-demand"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              onComplete?.();
            }}
            onTimeUpdate={(e: any) => {
              const player = e.target;
              if (player && onProgress) {
                const currentTime = player.currentTime || 0;
                const duration = player.duration || 0;
                onProgress(currentTime, duration);
              }
            }}
            className="w-full h-full"
          />
        </div>
        {title && (
          <div className="p-4 bg-card">
            <h3 className="font-semibold">{title}</h3>
          </div>
        )}
      </Card>
    );
  }

  // Check if it's an embed URL (Vimeo, YouTube, etc.)
  const isEmbed = src.includes("vimeo.com") || src.includes("youtube.com") || src.includes("youtu.be");

  if (isEmbed) {
    return (
      <Card className={cn("overflow-hidden bg-black", className)}>
        <div className="relative aspect-video">
          <iframe
            src={src}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
        {title && (
          <div className="p-4 bg-card">
            <h3 className="font-semibold">{title}</h3>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card 
      className={cn("overflow-hidden bg-black group", className)}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(isPlaying ? false : true)}
    >
      <div className="relative aspect-video">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => {
            setIsPlaying(false);
            onComplete?.();
          }}
          onClick={togglePlay}
        />

        {/* Play button overlay */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/90 text-primary-foreground">
              <Play className="h-10 w-10 ml-1" />
            </div>
          </button>
        )}

        {/* Controls */}
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Progress bar */}
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="mb-3"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => skip(-10)} className="text-white hover:bg-white/20">
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:bg-white/20">
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => skip(10)} className="text-white hover:bg-white/20">
                <SkipForward className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2 ml-2">
                <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/20">
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.1}
                  onValueChange={handleVolumeChange}
                  className="w-20"
                />
              </div>

              <span className="text-white text-sm ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {title && (
        <div className="p-4 bg-card">
          <h3 className="font-semibold">{title}</h3>
        </div>
      )}
    </Card>
  );
}
