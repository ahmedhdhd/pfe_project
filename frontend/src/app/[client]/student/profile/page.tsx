"use client";

import { StudentHeader } from "@/components/student/student-header";
import { PageHeader } from "@/components/common/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Camera } from "lucide-react";
import { toast } from "sonner";
import { useProfile, useUpdateProfile } from "@/hooks/api";
import { useIsMobile } from "@/hooks";
import { useProfileForm } from "./hooks/use-profile-form";
import { useProfileImageUpload } from "./hooks/use-profile-image-upload";
import { ProfileFormFields } from "./components/profile-form-fields";
import { ProfileCardSidebar } from "./components/profile-card-sidebar";
import { ProfileImageUpload } from "./components/profile-image-upload";

export default function ProfilePage() {
  const { isMobile, isClient } = useIsMobile();
  const { data: profileResponse, isLoading: isLoadingProfile } = useProfile();
  const updateProfile = useUpdateProfile();
  const profile = profileResponse?.data;

  const {
    formData,
    isEditing,
    hasChanges,
    phoneError,
    setIsEditing,
    handleInputChange,
    handleSubmit: handleFormSubmit,
    handleCancel,
    resetForm,
  } = useProfileForm({
    profile,
    onUpdate: async (data) => {
      await updateProfile.mutateAsync(data);
      toast.success("Profile updated successfully!");
    },
  });

  const { handleImageUpload, isUploading } = useProfileImageUpload();

  const handleImageSelect = async (file: File) => {
    const imageUrl = await handleImageUpload(file);
    if (imageUrl) {
      handleInputChange("profileImg", imageUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanges) {
      toast.info("No changes to save");
      return;
    }
    await handleFormSubmit(e);
  };

  const triggerImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleImageSelect(file);
    };
    input.click();
  };

  // Show nothing during initial render to prevent hydration mismatch
  if (!isClient) {
    return null;
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <StudentHeader />
        <div className="container mx-auto px-4 py-6 space-y-6">
          <PageHeader
            title="My Profile"
            description="Manage your profile information"
          />

          {isLoadingProfile ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <ProfileImageUpload
                    profileImg={formData.profileImg}
                    username={formData.username}
                    isEditing={isEditing}
                    isUploading={isUploading}
                    onFileSelect={handleImageSelect}
                  />
                  <div>
                    <CardTitle>{formData.username || "User"}</CardTitle>
                    <CardDescription>{profile?.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <ProfileFormFields
                    formData={formData}
                    isEditing={isEditing}
                    onInputChange={handleInputChange}
                    phoneError={phoneError}
                    email={profile?.email}
                  />

                  {isEditing ? (
                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateProfile.isPending || !hasChanges}
                        className="flex-1"
                      >
                        {updateProfile.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="w-full mt-4"
                    >
                      Edit Profile
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // ── Desktop view ──
  return (
    <div className="w-full min-h-screen bg-background">
      <StudentHeader />

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Profile Banner */}
        <section className="relative rounded-2xl bg-primary/5 border border-primary/10 overflow-hidden">
          {/* Banner background */}
          <div className="h-32 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" />

          {/* Profile info overlay */}
          <div className="px-8 pb-6 -mt-12 flex items-end gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="h-24 w-24 rounded-2xl border-4 border-background bg-card shadow-lg overflow-hidden">
                {formData.profileImg ? (
                  <img
                    src={formData.profileImg}
                    alt={formData.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary text-2xl font-bold">
                    {formData.username?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={triggerImageUpload}
                  className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Camera className="h-6 w-6 text-white" />
                  )}
                </button>
              )}
            </div>

            {/* Name + email */}
            <div className="pb-1">
              <h1 className="text-2xl font-bold text-foreground">
                {formData.username || "User"}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {profile?.email}
              </p>
            </div>

            {/* Edit button */}
            <div className="ml-auto pb-1">
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="rounded-xl"
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </section>

        {isLoadingProfile ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar Card */}
            <div className="lg:col-span-1 animate-slide-up">
              <ProfileCardSidebar
                formData={formData}
                profile={profile}
                isEditing={isEditing}
                isUploading={isUploading}
                onImageClick={triggerImageUpload}
              />
            </div>

            {/* Profile Form Card */}
            <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <Card className="rounded-xl border-border/60">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Profile Information
                      </CardTitle>
                      <CardDescription>
                        Update your personal information and preferences
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <ProfileFormFields
                      formData={formData}
                      isEditing={isEditing}
                      onInputChange={handleInputChange}
                      phoneError={phoneError}
                      email={profile?.email}
                    />

                    {/* Action Buttons */}
                    {isEditing && (
                      <div className="flex gap-3 pt-6 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancel}
                          className="flex-1 rounded-xl"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={updateProfile.isPending || !hasChanges}
                          className="flex-1 rounded-xl"
                        >
                          {updateProfile.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
