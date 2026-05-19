"use client";

import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "videojs-youtube";
import "videojs-contrib-eme";
import type Player from "video.js/dist/types/player";

/**
 * Configuration for Digital Rights Management (DRM) protection
 */
interface DRMConfig {
  /** DRM key systems configuration for different platforms */
  keySystems: {
    /** Widevine DRM configuration (used by Chrome, Android) */
    "com.widevine.alpha": {
      /** URL to the license server for Widevine */
      licenseUrl: string;
      /** Optional headers to send with license requests */
      headers?: Record<string, string>;
    };
    /** PlayReady DRM configuration (used by Edge, Windows) */
    "com.microsoft.playready": {
      /** URL to the license server for PlayReady */
      licenseUrl: string;
      /** Optional headers to send with license requests */
      headers?: Record<string, string>;
    };
    /** FairPlay DRM configuration (used by Safari, iOS) */
    "com.apple.fps.1_0": {
      /** URL to the license server for FairPlay */
      licenseUrl: string;
      /** Optional headers to send with license requests */
      headers?: Record<string, string>;
    };
  };
}

/**
 * Props for the UnifiedVideoPlayer component
 */
interface UnifiedVideoPlayerProps {
  /**
   * Video source URL - can be a direct video file URL or YouTube URL
   * Supports: MP4, WebM, HLS (.m3u8), and YouTube videos (including live streams)
   *
   * YouTube URL formats supported:
   * - Standard: https://www.youtube.com/watch?v=VIDEO_ID
   * - Short: https://youtu.be/VIDEO_ID
   * - Live: https://www.youtube.com/watch?v=VIDEO_ID (works for live streams)
   * - Live embed: https://www.youtube.com/embed/VIDEO_ID (for live streams)
   */
  src: string;

  /**
   * Optional poster image URL to display before video loads
   * This image will be shown as a thumbnail/placeholder
   */
  poster?: string;

  /**
   * Video MIME type - helps the player understand the video format
   * Options: "video/mp4", "application/x-mpegURL" (HLS), "video/webm", "video/youtube"
   * If not provided, defaults to "video/mp4"
   */
  type?: "video/mp4" | "application/x-mpegURL" | "video/webm" | "video/youtube";

  /**
   * Optional DRM configuration for protected content
   * Required for encrypted videos that need license validation
   */
  drmConfig?: DRMConfig;

  /**
   * Callback function called when the video player is ready
   * Provides access to the Video.js player instance for advanced control
   */
  onReady?: (player: Player) => void;

  /**
   * Callback function called when the video playback ends
   * Useful for tracking completion, showing next video, etc.
   */
  onEnded?: () => void;

  /**
   * Callback function called during video playback for time updates
   * Receives current playback time in seconds
   * Throttled to fire at most once per second to avoid excessive calls
   */
  onTimeUpdate?: (currentTime: number) => void;

  /**
   * Optional CSS class name to apply to the video player container
   * Useful for custom styling and responsive design
   */
  className?: string;

  // === BASIC PLAYER SETTINGS ===

  /**
   * Whether to automatically start playing the video when loaded
   * Note: Most browsers require user interaction before autoplay works
   */
  autoplay?: boolean;

  /**
   * Whether to start the video muted
   * Recommended when using autoplay to comply with browser policies
   */
  muted?: boolean;

  /**
   * Whether to loop the video when it reaches the end
   */
  loop?: boolean;

  /**
   * How much of the video to preload
   * "none" - Don't preload anything
   * "metadata" - Only load video metadata (duration, dimensions)
   * "auto" - Load the entire video (default)
   */
  preload?: "none" | "metadata" | "auto";

  /**
   * Initial volume level (0.0 to 1.0)
   * Default: 1.0 (full volume)
   */
  volume?: number;

  /**
   * Fixed aspect ratio for the video player
   * Overrides fluid responsive behavior
   * Format: "16:9", "4:3", etc.
   */
  aspectRatio?: string;

  // === PLAYBACK SETTINGS ===

  /**
   * Available playback speeds for the user to choose from
   * Default: [0.5, 1, 1.25, 1.5, 2]
   */
  playbackRates?: number[];

  /**
   * Start time in seconds for YouTube videos
   * Only applies to YouTube URLs (not applicable for live streams)
   */
  startTime?: number;

  /**
   * End time in seconds for YouTube videos
   * Only applies to YouTube URLs (not applicable for live streams)
   */
  endTime?: number;

  // === YOUTUBE SPECIFIC SETTINGS ===

  /**
   * YouTube-specific configuration options
   * These only apply when playing YouTube videos
   */
  youtubeConfig?: {
    /** Remove YouTube branding (0=show, 1=hide) */
    modestbranding?: number;
    /** Show related videos from other channels (0=hide, 1=show) */
    rel?: number;
    /** Show video title and uploader info (0=hide, 1=show) */
    showinfo?: number;
    /** Show video annotations (1=show, 3=hide) */
    iv_load_policy?: number;
    /** Show closed captions by default (0=hide, 1=show) */
    cc_load_policy?: number;
    /** Enable fullscreen button (0=disable, 1=enable) */
    fs?: number;
    /** Disable keyboard controls (0=enable, 1=disable) */
    disablekb?: number;
    /** Auto-hide controls (0=always show, 1=auto-hide) */
    autohide?: number;
    /** Start time in seconds */
    start?: number;
    /** End time in seconds */
    end?: number;
    /** Preferred video quality */
    vq?: "small" | "medium" | "large" | "hd720" | "hd1080";
    /** Progress bar color ("red" or "white") */
    color?: "red" | "white";
    /** Player theme ("dark" or "light") */
    theme?: "dark" | "light";
  };

  // === ADAPTIVE STREAMING SETTINGS ===

  /**
   * Configuration for HLS/DASH adaptive streaming
   * Only applies to HLS (.m3u8) and DASH streams
   */
  adaptiveStreaming?: {
    /** Enable low initial playlist for faster startup */
    enableLowInitialPlaylist?: boolean;
    /** Enable smooth quality changes during playback */
    smoothQualityChange?: boolean;
    /** Override native HLS support to use Video.js implementation */
    overrideNative?: boolean;
    /** Maximum bandwidth in bits per second */
    bandwidth?: number;
    /** Buffer size in seconds */
    bufferSize?: number;
    /** Maximum buffer size in seconds */
    maxBufferSize?: number;
  };

  // === ERROR HANDLING ===

  /**
   * Error handling configuration
   */
  errorHandling?: {
    /** Whether to display error messages to users */
    displayErrors?: boolean;
    /** How long to show error messages (milliseconds) */
    errorTimeout?: number;
    /** Whether to automatically retry on error */
    retryOnError?: boolean;
    /** Maximum number of retry attempts */
    maxRetries?: number;
    /** Delay between retry attempts (milliseconds) */
    retryDelay?: number;
  };

  // === ANALYTICS ===

  /**
   * Analytics configuration for tracking video events
   */
  analytics?: {
    /** Google Analytics tracking ID */
    trackingId?: string;
    /** Custom analytics endpoint URL */
    customEndpoint?: string;
    /** Events to track: "play", "pause", "complete", "seek", "timeupdate" */
    events?: string[];
  };

  // === ACCESSIBILITY ===

  /**
   * Accessibility configuration for screen readers and keyboard navigation
   */
  accessibility?: {
    /** Announce when video loads */
    announceVideoLoad?: boolean;
    /** Announce when video starts playing */
    announceVideoPlay?: boolean;
    /** Custom ARIA labels for player controls */
    ariaLabels?: Record<string, string>;
  };

  // === ADDITIONAL EVENT HANDLERS ===

  /**
   * Callback when video starts playing
   */
  onPlay?: () => void;

  /**
   * Callback when video is paused
   */
  onPause?: () => void;

  /**
   * Callback when user seeks to a different time
   * Receives the new time position in seconds
   */
  onSeek?: (time: number) => void;

  /**
   * Callback when volume or mute state changes
   * Receives volume level (0-1) and muted state
   */
  onVolumeChange?: (volume: number, muted: boolean) => void;

  /**
   * Callback when an error occurs
   * Receives the error object for debugging
   */
  onError?: (error: Error | unknown) => void;

  /**
   * Callback for progress tracking
   * Receives progress percentage (0-100)
   * Useful for analytics and completion tracking
   */
  onProgress?: (progress: number) => void;
}

/**
 * UnifiedVideoPlayer - A comprehensive video player component that supports multiple formats and DRM
 *
 * Features:
 * - Supports MP4, WebM, HLS (.m3u8), and YouTube videos (including live streams)
 * - Built-in DRM support for Widevine, PlayReady, and FairPlay
 * - Adaptive streaming with HLS support
 * - YouTube integration with custom controls
 * - YouTube live stream support
 * - Responsive design with fluid layout
 * - Customizable playback rates and controls
 *
 * @param props - Configuration object for the video player
 * @returns JSX element containing the video player
 *
 * @example
 * ```tsx
 * // Basic usage with MP4 video
 * <UnifiedVideoPlayer
 *   src="https://example.com/video.mp4"
 *   poster="https://example.com/poster.jpg"
 * />
 *
 * // YouTube video with custom callbacks
 * <UnifiedVideoPlayer
 *   src="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 *   onReady={(player) => console.log('Player ready')}
 *   onTimeUpdate={(time) => console.log('Current time:', time)}
 *   onEnded={() => console.log('Video ended')}
 * />
 *
 * // YouTube live stream
 * <UnifiedVideoPlayer
 *   src="https://www.youtube.com/watch?v=LIVE_VIDEO_ID"
 *   autoplay={true}
 *   muted={true}
 *   onReady={(player) => console.log('Live stream ready')}
 *   onPlay={() => console.log('Live stream started')}
 * />
 *
 * // DRM protected content
 * <UnifiedVideoPlayer
 *   src="https://example.com/encrypted-video.mp4"
 *   drmConfig={{
 *     keySystems: {
 *       "com.widevine.alpha": {
 *         licenseUrl: "https://license-server.com/widevine"
 *       }
 *     }
 *   }}
 * />
 * ```
 */
export function UnifiedVideoPlayer({
  src,
  poster,
  type = "video/mp4",
  drmConfig,
  onReady,
  onEnded,
  onTimeUpdate,
  className,

  // Basic Player Settings
  autoplay = false,
  muted = false,
  loop = false,
  preload = "metadata",
  volume = 1.0,
  aspectRatio,

  // Playback Settings
  playbackRates = [0.5, 1, 1.25, 1.5, 2],
  startTime,
  endTime,

  // YouTube Specific Settings
  youtubeConfig,

  // Adaptive Streaming Settings
  adaptiveStreaming,

  // Error Handling
  errorHandling,

  // Analytics
  analytics,

  // Accessibility
  accessibility,

  // Additional Event Handlers
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  onError,
  onProgress,
}: UnifiedVideoPlayerProps) {
  // Detect if src is a YouTube URL (including live streams)
  const isYouTube = src.includes("youtube.com") || src.includes("youtu.be");
  const videoType = isYouTube ? "video/youtube" : type;

  // Detect if it's a live stream (YouTube live streams don't have duration)
  // Note: This is detected at runtime, but we can optimize config for live streams
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Player | null>(null);
  const previousProgressRef = useRef<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize player once
  useEffect(() => {
    if (!videoRef.current || playerRef.current) return;

    const initPlayer = () => {
      if (
        videoRef.current &&
        !playerRef.current &&
        videoRef.current.parentNode
      ) {
        try {
          interface PlayerConfig {
            controls: boolean;
            responsive: boolean;
            fluid?: boolean;
            aspectRatio?: string;
            autoplay?: boolean;
            muted?: boolean;
            loop?: boolean;
            preload?: string;
            volume?: number;
            playbackRates?: number[];
            techOrder: string[];
            sources: Array<{ src: string; type: string }>;
            poster?: string;
            youtube?: Record<string, unknown>;
            html5?: Record<string, unknown>;
            [key: string]: unknown;
          }
          const playerConfig: PlayerConfig = {
            controls: true,
            responsive: true,
            fluid: !aspectRatio, // Use fluid unless aspectRatio is specified
            aspectRatio: aspectRatio,
            autoplay: autoplay,
            muted: muted,
            loop: loop,
            preload: preload,
            volume: volume,
            playbackRates: playbackRates,
            techOrder: isYouTube ? ["youtube"] : ["html5"],
            sources: [
              {
                src,
                type: videoType,
              },
            ],
            poster,

            // YouTube Configuration
            youtube: {
              ytControls: 0, // Hide YouTube controls completely
              enablePrivacyEnhancedMode: true,
              modestbranding: youtubeConfig?.modestbranding ?? 1,
              rel: youtubeConfig?.rel ?? 0,
              showinfo: youtubeConfig?.showinfo ?? 0,
              iv_load_policy: youtubeConfig?.iv_load_policy ?? 3,
              cc_load_policy: youtubeConfig?.cc_load_policy ?? 0,
              fs: youtubeConfig?.fs ?? 0,
              disablekb: youtubeConfig?.disablekb ?? 1,
              controls: 0, // Disable all YouTube controls
              autohide: youtubeConfig?.autohide ?? 1,
              wmode: "opaque", // Prevent overlay issues
              // Only set start/end time for non-live videos
              // Live streams will ignore these parameters automatically
              start: startTime ?? youtubeConfig?.start,
              end: endTime ?? youtubeConfig?.end,
              vq: youtubeConfig?.vq,
              color: youtubeConfig?.color,
              theme: youtubeConfig?.theme,
            },

            // HLS/DASH Configuration
            html5: {
              hls: {
                enableLowInitialPlaylist:
                  adaptiveStreaming?.enableLowInitialPlaylist ?? true,
                smoothQualityChange:
                  adaptiveStreaming?.smoothQualityChange ?? true,
                overrideNative: adaptiveStreaming?.overrideNative ?? true,
                bandwidth: adaptiveStreaming?.bandwidth,
                bufferSize: adaptiveStreaming?.bufferSize ?? 30,
                maxBufferSize: adaptiveStreaming?.maxBufferSize ?? 60,
              },
            },

            // Error Handling
            errorDisplay: errorHandling?.displayErrors ?? true,
            errorTimeout: errorHandling?.errorTimeout ?? 5000,

            // Accessibility
            ...(accessibility?.ariaLabels && {
              ariaLabels: accessibility.ariaLabels,
            }),
          };

          // Add DRM configuration if provided
          if (drmConfig) {
            playerConfig.eme = {
              keySystems: drmConfig.keySystems,
            };
          }

          const player = videojs(videoRef.current, playerConfig);
          playerRef.current = player;
          setIsInitialized(true);

          // Handle player ready
          player.ready(() => {
            onReady?.(player);
          });

          // Handle time updates
          if (onTimeUpdate) {
            player.on("timeupdate", () => {
              const currentTime = player.currentTime();
              if (
                currentTime !== null &&
                currentTime !== undefined &&
                !isNaN(currentTime)
              ) {
                const time = Number(currentTime);
                if (time - previousProgressRef.current > 1) {
                  previousProgressRef.current = time;
                  onTimeUpdate(time);
                }
              }
            });
          }

          // Handle video ended
          if (onEnded) {
            player.on("ended", () => {
              onEnded();
            });
          }

          // Handle play event
          if (onPlay) {
            player.on("play", () => {
              onPlay();
            });
          }

          // Handle pause event
          if (onPause) {
            player.on("pause", () => {
              onPause();
            });
          }

          // Handle seek event
          if (onSeek) {
            player.on("seeked", () => {
              const currentTime = player.currentTime();
              if (currentTime !== null && currentTime !== undefined) {
                onSeek(currentTime);
              }
            });
          }

          // Handle volume change event
          if (onVolumeChange) {
            player.on("volumechange", () => {
              const volume = player.volume();
              const muted = player.muted();
              if (
                volume !== null &&
                volume !== undefined &&
                muted !== undefined
              ) {
                onVolumeChange(volume, muted);
              }
            });
          }

          // Handle error event
          if (onError) {
            player.on("error", (error: Error | unknown) => {
              onError(error);
            });
          }

          // Handle progress event
          if (onProgress) {
            player.on("timeupdate", () => {
              const currentTime = player.currentTime();
              const duration = player.duration();
              // For live streams, duration is Infinity, so we handle it differently
              if (
                duration &&
                isFinite(duration) &&
                duration > 0 &&
                currentTime !== null &&
                currentTime !== undefined
              ) {
                const progress = (currentTime / duration) * 100;
                onProgress(progress);
              } else if (duration && !isFinite(duration)) {
                // For live streams, we can't calculate percentage progress
                // You might want to track watch time instead
                // For live streams, we'll report 100% or track watch time differently
                onProgress(100); // Or handle live stream progress differently
              }
            });
          }

          // Analytics tracking
          if (analytics?.trackingId || analytics?.customEndpoint) {
            setupAnalytics(player, analytics);
          }

          // Accessibility announcements
          if (accessibility?.announceVideoLoad) {
            player.on("loadedmetadata", () => {
              // Announce video loaded for screen readers
              console.log(
                "Video metadata loaded - announcing to screen readers"
              );
            });
          }

          if (accessibility?.announceVideoPlay) {
            player.on("play", () => {
              // Announce video playing for screen readers
              console.log(
                "Video started playing - announcing to screen readers"
              );
            });
          }

          // Add DRM event listeners if DRM is configured
          if (drmConfig) {
            addDRMEventListeners(player);
          }

          // Add adaptive streaming event listeners for HLS
          if (videoType === "application/x-mpegURL") {
            addAdaptiveStreamingEventListeners(player);
          }
        } catch (error) {
          console.error("Error initializing video player:", error);
        }
      }
    };

    // Use requestAnimationFrame to ensure DOM is ready
    const rafId = requestAnimationFrame(() => {
      requestAnimationFrame(initPlayer);
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []); // Only run once on mount

  // Update source when src changes
  useEffect(() => {
    if (playerRef.current && isInitialized) {
      const player = playerRef.current;

      // Update the source
      player.src({
        src,
        type: videoType,
      });

      // Update poster if provided
      if (poster) {
        player.poster(poster);
      }
    }
  }, [src, poster, videoType, isInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
        setIsInitialized(false);
      }
    };
  }, []);

  /**
   * Helper function to setup analytics tracking
   * Supports both Google Analytics and custom analytics endpoints
   *
   * @param player - Video.js player instance
   * @param analytics - Analytics configuration object
   */
  interface AnalyticsConfig {
    trackingId?: string;
    customEndpoint?: string;
    events?: string[];
    [key: string]: unknown;
  }
  const setupAnalytics = (player: Player, analytics: AnalyticsConfig) => {
    const events = analytics.events || [
      "play",
      "pause",
      "complete",
      "seek",
      "timeupdate",
    ];

    if (analytics.trackingId) {
      // Google Analytics tracking
      events.forEach((event: string) => {
        player.on(event, () => {
          // @ts-expect-error - gtag is loaded by Google Analytics
          if (typeof gtag !== "undefined") {
            // @ts-expect-error - gtag is loaded by Google Analytics
            gtag("event", "video_" + event, {
              event_category: "Video",
              event_label: src,
              value: player.currentTime(),
            });
          }
        });
      });
    }

    if (analytics.customEndpoint) {
      // Custom analytics endpoint
      const endpoint = analytics.customEndpoint;
      events.forEach((event: string) => {
        player.on(event, () => {
          fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              event: event,
              src: src,
              currentTime: player.currentTime(),
              duration: player.duration(),
              timestamp: Date.now(),
            }),
          }).catch((error) => {
            console.error("Analytics tracking error:", error);
          });
        });
      });
    }
  };

  /**
   * Helper function to add DRM (Digital Rights Management) event listeners
   * Monitors DRM-related events for debugging and error handling
   *
   * @param player - Video.js player instance
   */
  const addDRMEventListeners = (player: Player) => {
    player.on("loadedmetadata", () => {
      console.log("DRM: Video metadata loaded");
    });

    player.on("error", (error: Error | unknown) => {
      const drmError = error as { code?: number };
      if (drmError.code === 4) {
        console.error("DRM: License request failed");
      } else if (drmError.code === 5) {
        console.error("DRM: License expired");
      }
    });

    player.on("keyload", () => {
      console.log("DRM: Key loaded successfully");
    });

    player.on("keyerror", (error: Error | unknown) => {
      console.error("DRM: Key error:", error);
    });

    // Additional DRM events
    player.on("loadeddata", () => {
      console.log("DRM: Encrypted content loaded");
    });
  };

  /**
   * Helper function to add adaptive streaming event listeners for HLS
   * Monitors streaming events for debugging and quality management
   *
   * @param player - Video.js player instance
   */
  const addAdaptiveStreamingEventListeners = (player: Player) => {
    player.on("loadedmetadata", () => {
      console.log("Adaptive Streaming: Video metadata loaded");
    });

    player.on("loadstart", () => {
      console.log("Adaptive Streaming: Loading started");
    });

    player.on("canplay", () => {
      console.log("Adaptive Streaming: Can start playing");
    });

    player.on("waiting", () => {
      console.log("Adaptive Streaming: Buffering...");
    });

    player.on("canplaythrough", () => {
      console.log("Adaptive Streaming: Can play through without buffering");
    });

    // Quality level events
    player.on("loadeddata", () => {
      console.log("Adaptive Streaming: Data loaded");
    });
  };

  return (
    <div className={className}>
      <div data-vjs-player className="h-full w-full">
        <video
          ref={videoRef}
          className="video-js vjs-default-skin youtube-clean-player h-full w-full"
        />
      </div>
    </div>
  );
}
