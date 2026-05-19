"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfileFormProps } from "../types";
import { MAX_PHONE_LENGTH, MAX_PINCODE_LENGTH } from "../constants";

interface ProfileFormFieldsProps extends ProfileFormProps {
  email?: string;
}

export function ProfileFormFields({
  formData,
  isEditing,
  onInputChange,
  phoneError,
  email,
}: ProfileFormFieldsProps) {
  return (
    <>
      {/* Basic Information Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => onInputChange("username", e.target.value)}
              disabled={!isEditing}
              placeholder="Enter your username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => onInputChange("phoneNumber", e.target.value)}
              disabled={!isEditing}
              placeholder="Enter 10-digit phone number"
              type="tel"
              maxLength={MAX_PHONE_LENGTH}
              aria-invalid={!!phoneError}
            />
            {phoneError && (
              <p className="text-sm text-destructive">{phoneError}</p>
            )}
            {!phoneError && formData.phoneNumber && (
              <p className="text-xs text-muted-foreground">
                {formData.phoneNumber.length}/{MAX_PHONE_LENGTH} digits
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select
              key={`gender-${formData.gender || "empty"}`}
              value={formData.gender || undefined}
              onValueChange={(value) => onInputChange("gender", value)}
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Address Information Section */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-lg font-semibold">Address Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={formData.address.city}
              onChange={(e) => onInputChange("address.city", e.target.value)}
              disabled={!isEditing}
              placeholder="Enter your city"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={formData.address.state}
              onChange={(e) => onInputChange("address.state", e.target.value)}
              disabled={!isEditing}
              placeholder="Enter your state"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="pincode">Pincode</Label>
            <Input
              id="pincode"
              value={formData.address.pincode}
              onChange={(e) => onInputChange("address.pincode", e.target.value)}
              disabled={!isEditing}
              placeholder="Enter your pincode"
              maxLength={MAX_PINCODE_LENGTH}
            />
          </div>
        </div>
      </div>
    </>
  );
}
