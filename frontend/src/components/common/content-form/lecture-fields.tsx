"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/common/file-upload";
import { DetailedHLSUpload } from "@/components/common/detailed-hls-upload";
import { Video } from "@/components/icons";
import { ContentFormData, VideoType } from "./types";

interface LectureFieldsProps {
  formData: ContentFormData;
  onUpdate: (updates: Partial<ContentFormData>) => void;
  onVideoFileUpload: (url: string) => void;
  onThumbnailFileUpload: (url: string) => void;
}

export function LectureFields({
  formData,
  onUpdate,
  onVideoFileUpload,
  onThumbnailFileUpload,
}: LectureFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="videoType">Video Type *</Label>
        <Select
          value={formData.videoType}
          onValueChange={(value) =>
            onUpdate({
              videoType: value as VideoType,
              videoUrl: "", // Reset URL when changing type
              videoDuration: 0, // Reset duration when changing type
            })
          }
        >
          <SelectTrigger id="videoType">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={VideoType.YOUTUBE}>
              <div className="flex items-center space-x-2">
                <Video className="h-4 w-4" />
                <span>YouTube</span>
              </div>
            </SelectItem>
            <SelectItem value={VideoType.HLS}>Upload / URL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* YouTube URL Input */}
      {formData.videoType === VideoType.YOUTUBE && (
        <div className="space-y-2">
          <Label htmlFor="videoUrl">YouTube URL *</Label>
          <Input
            id="videoUrl"
            placeholder="https://www.youtube.com/watch?v=..."
            value={formData.videoUrl}
            onChange={(e) => onUpdate({ videoUrl: e.target.value })}
            required
          />
          <p className="text-xs text-muted-foreground">
            Enter the full YouTube video URL or video ID
          </p>
        </div>
      )}

      {/* Video Upload for HLS */}
      {formData.videoType === VideoType.HLS && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="videoUpload">Upload Video *</Label>
            <p className="text-xs text-muted-foreground">
              Upload a direct video file or use an HLS manifest URL. Large
              videos will be split into 50MB chunks and uploaded in parallel.
            </p>
            <DetailedHLSUpload
              onUploadComplete={(cdnUrl: string) => {
                onVideoFileUpload(cdnUrl);
              }}
              folder="course-videos"
              maxSize={5000} // 5GB max for HLS videos
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="videoUrl">Enter Video URL (Optional)</Label>
            <Input
              id="videoUrl"
              placeholder="https://cdn.example.com/video.mp4 or .m3u8"
              value={formData.videoUrl}
              onChange={(e) => onUpdate({ videoUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Enter a direct video URL like `.mp4` or an HLS manifest URL like
              `.m3u8`
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="videoThumbnail">Video Thumbnail</Label>
        <FileUpload
          accept="image/*"
          maxSize={10}
          onUploadComplete={(fileData) => onThumbnailFileUpload(fileData.url)}
        />
        <div className="space-y-2">
          <Label htmlFor="videoThumbnailUrl">Or Enter Thumbnail URL</Label>
          <Input
            id="videoThumbnailUrl"
            placeholder="Enter thumbnail URL (optional)"
            value={formData.videoThumbnail}
            onChange={(e) => onUpdate({ videoThumbnail: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="videoDuration">Duration (seconds) *</Label>
        <Input
          id="videoDuration"
          type="number"
          placeholder="Enter duration in seconds"
          value={formData.videoDuration || ""}
          onChange={(e) =>
            onUpdate({ videoDuration: Number(e.target.value) || 0 })
          }
          required
          min="1"
        />
      </div>
    </>
  );
}
