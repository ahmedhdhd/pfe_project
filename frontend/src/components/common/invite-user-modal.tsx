"use client";

import { useState, useEffect } from "react";
import { useInviteTeacher, useInviteAdmin } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserPlus, Mail, User, Shield, Users } from "lucide-react";

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  defaultRole?: "ADMIN" | "TEACHER";
  allowedRoles?: ("ADMIN" | "TEACHER")[];
}

export function InviteUserModal({
  isOpen,
  onClose,
  organizationId,
  defaultRole = "ADMIN",
  allowedRoles = ["ADMIN", "TEACHER"],
}: InviteUserModalProps) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<"ADMIN" | "TEACHER">(defaultRole);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inviteUserMutation = useInviteTeacher();
  const inviteAdminMutation = useInviteAdmin();

  // Auto-suggest username based on email
  useEffect(() => {
    if (email && !username) {
      const emailPrefix = email.split("@")[0];
      setUsername(emailPrefix);
    }
  }, [email, username]);

  // Set role when modal opens or allowedRoles changes
  useEffect(() => {
    if (isOpen && allowedRoles.length === 1) {
      setRole(allowedRoles[0]);
    } else if (isOpen) {
      setRole(defaultRole);
    }
  }, [isOpen, allowedRoles, defaultRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !username) {
      alert("Please fill in all required fields");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      // Use the appropriate hook based on role
      if (role === "ADMIN") {
        await inviteAdminMutation.mutateAsync({
          organizationId,
          email,
          username,
        });
      } else {
        await inviteUserMutation.mutateAsync({
          email,
          username,
        });
      }

      alert(`Invitation sent to ${email} successfully!`);

      // Reset form and close modal
      setEmail("");
      setUsername("");
      setRole(defaultRole);
      onClose();
    } catch (error: unknown) {
      console.error("Failed to invite user:", error);

      // Handle specific error cases
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 409) {
          alert("User with this email already exists in your organization");
        } else if (axiosError.response?.status === 400) {
          alert("Invalid request. Please check your input and try again");
        } else {
          alert("Failed to send invitation. Please try again");
        }
      } else {
        alert("Failed to send invitation. Please try again");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (
      !isSubmitting &&
      !inviteUserMutation.isPending &&
      !inviteAdminMutation.isPending
    ) {
      setEmail("");
      setUsername("");
      setRole(defaultRole);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <span>
              {allowedRoles.length === 1 && allowedRoles[0] === "TEACHER"
                ? "Invite a Teacher"
                : allowedRoles.length === 1 && allowedRoles[0] === "ADMIN"
                ? "Invite an Admin"
                : "Invite a new user"}
            </span>
          </DialogTitle>
          <DialogDescription>
            {allowedRoles.length === 1 && allowedRoles[0] === "TEACHER"
              ? "Send an invitation to a teacher to join your organization. They will receive an email with setup instructions."
              : allowedRoles.length === 1 && allowedRoles[0] === "ADMIN"
              ? "Send an invitation to an admin to join your organization. They will receive an email with setup instructions."
              : "Send an invitation to join your organization. The user will receive an email with setup instructions."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Email Address *</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Username</span>
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Username will be auto-suggested based on email if left empty
            </p>
          </div>

          {allowedRoles.length > 1 && (
            <div className="space-y-2">
              <Label className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Role</span>
              </Label>
              <RadioGroup
                value={role}
                onValueChange={(value) => setRole(value as "ADMIN" | "TEACHER")}
                className="grid grid-cols-2 gap-3"
              >
                {allowedRoles.includes("ADMIN") && (
                  <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent/40">
                    <RadioGroupItem
                      value="ADMIN"
                      id="role-admin"
                      disabled={isSubmitting}
                    />
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>Admin</span>
                    </div>
                  </label>
                )}
                {allowedRoles.includes("TEACHER") && (
                  <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent/40">
                    <RadioGroupItem
                      value="TEACHER"
                      id="role-teacher"
                      disabled={isSubmitting}
                    />
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Teacher</span>
                    </div>
                  </label>
                )}
              </RadioGroup>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={
                isSubmitting ||
                inviteUserMutation.isPending ||
                inviteAdminMutation.isPending
              }
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                inviteUserMutation.isPending ||
                inviteAdminMutation.isPending ||
                !email ||
                !username
              }
              className="w-full sm:w-auto"
            >
              {isSubmitting ||
              inviteUserMutation.isPending ||
              inviteAdminMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending Invitation...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
