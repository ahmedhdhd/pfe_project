"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { MutableRefObject } from "react";

// Shows camera status, video preview and enable/fullscreen controls
export function ProctoringPanel({
  mediaStream,
  isRequestingMedia,
  startMedia,
  mediaError,
  videoRef,
  isFullscreen,
  enterFullscreen,
  autoStart = false,
}: {
  mediaStream: MediaStream | null;
  isRequestingMedia: boolean;
  startMedia: () => Promise<boolean> | boolean;
  mediaError: string | null;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  isFullscreen: boolean;
  enterFullscreen: () => Promise<boolean> | boolean;
  autoStart?: boolean;
}) {
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);

  // Track if we've already attempted to start media
  const hasAttemptedStart = useRef(false);
  const mountedRef = useRef(true);

  // Note: Camera start is now primarily handled by useProctoringOnAttempt hook based on route
  // This is a minimal fallback that won't interfere with route hook
  useEffect(() => {
    mountedRef.current = true;
    
    // Very conservative fallback - only if route hook completely fails after significant delay
    const fallbackTimer = setTimeout(() => {
      if (autoStart && !mediaStream && !isRequestingMedia && !hasAttemptedStart.current && mountedRef.current) {
        console.log("[PROCTORING PANEL DEBUG] Fallback: Route hook may not have started camera, attempting...");
        hasAttemptedStart.current = true;
        
        const result = startMedia();
        if (result instanceof Promise) {
          result
            .then((success) => {
              console.log("[PROCTORING PANEL DEBUG] Fallback startMedia result:", success);
            })
            .catch((err) => {
              console.error("[PROCTORING PANEL DEBUG] Fallback start failed:", err);
              if (mountedRef.current) {
                hasAttemptedStart.current = false;
              }
            });
        }
      }
    }, 1500); // Wait longer for route hook to start first
    
    return () => {
      clearTimeout(fallbackTimer);
      mountedRef.current = false;
    };
  }, [autoStart, mediaStream, isRequestingMedia, startMedia]);

  // Ensure video plays when stream is available
  // Note: use-exam-security hook handles srcObject attachment
  // We only need to ensure video plays once stream is ready
  useEffect(() => {
    if (!mediaStream || !videoRef.current || !isPreviewVisible) {
      return;
    }

    const video = videoRef.current;
    let cancelled = false;
    let playAttempts = 0;
    const maxPlayAttempts = 5;
    
    console.log("[VIDEO DEBUG] Video effect triggered:", {
      hasVideoRef: !!videoRef.current,
      hasStream: !!mediaStream,
      isPreviewVisible,
      currentSrcObject: video.srcObject instanceof MediaStream ? video.srcObject.id : null,
      streamId: mediaStream.id,
      readyState: video.readyState,
      paused: video.paused,
    });
    
    // Function to attempt playing video
    const attemptPlay = () => {
      if (cancelled || !video || !mediaStream) return;
      
      // Check if video has stream attached
      if (!video.srcObject || video.srcObject !== mediaStream) {
        console.log("[VIDEO DEBUG] Waiting for srcObject to be set by use-exam-security hook");
        // Retry after a delay
        if (playAttempts < maxPlayAttempts) {
          playAttempts++;
          setTimeout(attemptPlay, 200);
        }
        return;
      }
      
      // Only play if paused and ready
      if (video.paused && video.readyState >= 2) {
        console.log("[VIDEO DEBUG] Attempting to play, readyState:", video.readyState);
        video.play()
          .then(() => {
            console.log("[VIDEO DEBUG] ✅ Video play SUCCESS!");
          })
          .catch((err) => {
            console.warn("[VIDEO DEBUG] Video play failed:", err);
            // Retry if not cancelled
            if (!cancelled && playAttempts < maxPlayAttempts) {
              playAttempts++;
              setTimeout(attemptPlay, 500);
            }
          });
      } else if (video.readyState < 2) {
        console.log("[VIDEO DEBUG] Video not ready, readyState:", video.readyState);
        // Wait for metadata
        if (playAttempts < maxPlayAttempts) {
          playAttempts++;
          setTimeout(attemptPlay, 300);
        }
      }
    };
    
    // Wait for metadata before trying to play
    const handleLoadedMetadata = () => {
      if (cancelled) return;
      console.log("[VIDEO DEBUG] ✅ Metadata loaded, readyState:", video.readyState);
      playAttempts = 0; // Reset attempts when metadata loads
      attemptPlay();
    };
    
    const handleCanPlay = () => {
      if (cancelled) return;
      console.log("[VIDEO DEBUG] ✅ Can play event, readyState:", video.readyState);
      attemptPlay();
    };

    const handlePlay = () => {
      console.log("[VIDEO DEBUG] ✅ Video play event");
    };

    const handlePlaying = () => {
      console.log("[VIDEO DEBUG] ✅✅✅ Video playing - SUCCESS!");
      cancelled = true; // Success, stop retrying
    };
    
    // Add listeners - use capture phase for reliability
    video.addEventListener("loadedmetadata", handleLoadedMetadata, { once: false });
    video.addEventListener("canplay", handleCanPlay, { once: false });
    video.addEventListener("play", handlePlay, { once: false });
    video.addEventListener("playing", handlePlaying, { once: false });
    
    // If metadata already loaded, try to play immediately
    if (video.readyState >= 2 && video.srcObject === mediaStream) {
      console.log("[VIDEO DEBUG] Video already ready, attempting play");
      attemptPlay();
    } else {
      // Start checking after a delay
      setTimeout(attemptPlay, 100);
    }
    
    return () => {
      cancelled = true;
      console.log("[VIDEO DEBUG] Cleaning up video listeners");
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("playing", handlePlaying);
    };
  }, [mediaStream, isPreviewVisible]); // Only re-run when stream or visibility changes

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-card shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium flex items-center gap-2">
          <Camera className="h-4 w-4" /> Proctoring
        </div>
        <div className="flex items-center gap-2">
          {mediaStream ? (
            <>
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Active
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsPreviewVisible(!isPreviewVisible)}
                className="h-7 w-7 p-0"
                title={isPreviewVisible ? "Hide preview" : "Show preview"}
              >
                {isPreviewVisible ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </Button>
            </>
          ) : (
            // Only show manual button if auto-start is disabled or failed
            (!autoStart || mediaError) && (
              <Button
                size="sm"
                variant="outline"
                disabled={isRequestingMedia}
                onClick={async () => {
                  if (!isRequestingMedia) {
                    console.log("[PROCTORING PANEL DEBUG] Manual camera start requested");
                    const result = startMedia();
                    if (result instanceof Promise) {
                      await result.catch((err) => {
                        console.error("[PROCTORING PANEL DEBUG] Manual camera start failed:", err);
                      });
                    }
                  }
                }}
              >
                {isRequestingMedia ? "Requesting…" : "Enable Camera"}
              </Button>
            )
          )}
        </div>
      </div>
      
      {mediaError ? (
        <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
          {mediaError}. Please allow camera and microphone in your browser
          permissions and click Enable again.
        </div>
      ) : null}
      
      {/* Video preview - ALWAYS render video element to maintain ref */}
      <div className="relative w-full rounded-md overflow-hidden border-2 border-border">
        {/* Always render video element, but hide if no stream */}
        <video
          ref={videoRef}
          muted
          autoPlay
          playsInline
          className={`w-full h-32 sm:h-48 object-cover transition-opacity ${
            mediaStream && isPreviewVisible ? "opacity-100 bg-black" : "opacity-0"
          }`}
          style={{
            transform: mediaStream ? "scaleX(-1)" : "none", // Mirror the video for better UX (selfie view)
          }}
          onError={(e) => {
            console.error("[VIDEO DEBUG] Video error event:", e);
          }}
          onLoadedMetadata={() => {
            console.log("[VIDEO DEBUG] onLoadedMetadata event (inline handler)");
            // use-exam-security hook handles srcObject attachment
            // Just log that metadata is loaded
          }}
          onCanPlay={() => {
            console.log("[VIDEO DEBUG] onCanPlay event (inline handler)");
            // Play will be handled by the effect
          }}
          onPlay={() => {
            console.log("[VIDEO DEBUG] Video play event");
          }}
          onPlaying={() => {
            console.log("[VIDEO DEBUG] Video playing event - SUCCESS!");
          }}
        />
        {/* Overlay when preview is hidden */}
        {mediaStream && !isPreviewVisible && (
          <div className="absolute inset-0 w-full h-full rounded-md bg-gradient-to-br from-muted to-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center z-10">
            <div className="text-center space-y-2">
              <EyeOff className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Preview hidden</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsPreviewVisible(true)}
                className="text-xs"
              >
                Show Preview
              </Button>
            </div>
          </div>
        )}
        
        {/* Overlay when no stream */}
        {!mediaStream && (
          <div className="absolute inset-0 w-full h-full rounded-md flex items-center justify-center z-10">
            {isRequestingMedia ? (
              <div className="w-full h-full bg-black flex items-center justify-center rounded-md">
                <div className="text-center space-y-2">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-white">Requesting camera access...</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center rounded-md">
                <div className="text-center space-y-2">
                  <Camera className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Camera preview will appear here
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {!isFullscreen && (
        <Button
          size="sm"
          className="w-full"
          variant="secondary"
          onClick={async () => {
            const result = enterFullscreen();
            if (result instanceof Promise) {
              await result.catch((err) => {
                console.error("Failed to enter fullscreen:", err);
              });
            }
          }}
        >
          Enter Fullscreen
        </Button>
      )}
      
      {isFullscreen && (
        <Button
          size="sm"
          className="w-full"
          variant="outline"
          onClick={async () => {
            try {
              if (typeof document !== "undefined" && document.fullscreenElement) {
                await document.exitFullscreen();
              }
            } catch (err) {
              console.error("Failed to exit fullscreen:", err);
            }
          }}
        >
          Exit Fullscreen
        </Button>
      )}
    </div>
  );
}
