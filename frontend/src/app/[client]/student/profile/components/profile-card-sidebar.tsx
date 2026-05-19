"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, MapPin, Camera } from "lucide-react";
import { Loader2 } from "lucide-react";
import { ProfileFormData } from "../types";
import { Profile } from "@/hooks/api";

interface ProfileCardSidebarProps {
  formData: ProfileFormData;
  profile: Profile | undefined;
  isEditing: boolean;
  isUploading: boolean;
  onImageClick: () => void;
}

export function ProfileCardSidebar({
  formData,
  profile,
  isEditing,
  isUploading,
  onImageClick,
}: ProfileCardSidebarProps) {
  return (
    <Card className="sticky top-24">
      <CardHeader className="text-center pb-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-primary/20">
              <AvatarImage src={formData.profileImg} alt={formData.username} />
              <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                {formData.username?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 rounded-full h-10 w-10"
                onClick={onImageClick}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl">
              {formData.username || "User"}
            </CardTitle>
            <CardDescription className="flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" />
              {profile?.email}
            </CardDescription>
            {profile?.isVerified && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400" />
                Verified Account
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          {formData.phoneNumber && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{formData.phoneNumber}</span>
            </div>
          )}
          {(formData.address.city || formData.address.state) && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                {[formData.address.city, formData.address.state]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          )}
          {formData.gender && formData.gender.trim() !== "" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{formData.gender}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
