"use client";

import { useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { IMAGE_VALIDATION } from "../constants";
import { toast } from "sonner";

interface ProfileImageUploadProps {
  profileImg: string;
  username: string;
  isEditing: boolean;
  isUploading: boolean;
  onFileSelect: (file: File) => void;
}

export function ProfileImageUpload({
  profileImg,
  username,
  isEditing,
  isUploading,
  onFileSelect,
}: ProfileImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith(IMAGE_VALIDATION.ALLOWED_TYPES[0])) {
      toast.error(IMAGE_VALIDATION.ERROR_MESSAGES.INVALID_TYPE);
      return;
    }

    // Validate file size
    if (file.size > IMAGE_VALIDATION.MAX_SIZE) {
      toast.error(IMAGE_VALIDATION.ERROR_MESSAGES.TOO_LARGE);
      return;
    }

    onFileSelect(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="relative">
      <Avatar className="h-32 w-32 border-4 border-primary/20">
        <AvatarImage src={profileImg} alt={username} />
        <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
          {username?.charAt(0).toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      {isEditing && (
        <>
          <Button
            size="icon"
            variant="secondary"
            className="absolute bottom-0 right-0 rounded-full h-10 w-10"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </>
      )}
    </div>
  );
}
