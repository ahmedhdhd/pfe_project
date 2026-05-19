"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Phone } from "lucide-react";

interface CountryCode {
  code: string;
  dialCode: string;
  name: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: "IN", dialCode: "+91", name: "India" },
  { code: "US", dialCode: "+1", name: "United States" },
  { code: "GB", dialCode: "+44", name: "United Kingdom" },
  { code: "AU", dialCode: "+61", name: "Australia" },
  { code: "CA", dialCode: "+1", name: "Canada" },
  { code: "DE", dialCode: "+49", name: "Germany" },
  { code: "FR", dialCode: "+33", name: "France" },
  { code: "JP", dialCode: "+81", name: "Japan" },
  { code: "CN", dialCode: "+86", name: "China" },
  { code: "BR", dialCode: "+55", name: "Brazil" },
];

interface PhoneInputProps {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneNumberChange: (phone: string) => void;
  onBlur?: () => void;
  onEnter?: () => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  placeholder?: string;
}

export function PhoneInput({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  onBlur,
  onEnter,
  disabled = false,
  error = false,
  className,
  placeholder = "Enter phone number",
}: PhoneInputProps) {
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits
    const digits = e.target.value.replace(/\D/g, "");
    // For India (+91), limit to 10 digits, otherwise 15 digits (international standard)
    const maxLength = countryCode === "+91" ? 10 : 15;
    const limitedDigits = digits.slice(0, maxLength);
    onPhoneNumberChange(limitedDigits);
  };

  const selectedCountry =
    COUNTRY_CODES.find((c) => c.dialCode === countryCode) || COUNTRY_CODES[0];

  return (
    <div className={cn("flex gap-2", className)}>
      <Select
        value={countryCode}
        onValueChange={onCountryCodeChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>{selectedCountry.dialCode}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((country) => (
            <SelectItem key={country.code} value={country.dialCode}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{country.dialCode}</span>
                <span className="text-muted-foreground">{country.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        inputMode="numeric"
        value={phoneNumber}
        onChange={handlePhoneChange}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !disabled && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "flex-1",
          error && "border-destructive focus-visible:border-destructive"
        )}
        aria-label="Phone number"
        maxLength={countryCode === "+91" ? 10 : 15}
      />
    </div>
  );
}
