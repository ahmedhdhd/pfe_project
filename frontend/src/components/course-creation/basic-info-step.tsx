"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowRight,
  Upload,
  Image as ImageIcon,
  Calendar as CalendarIcon,
} from "@/components/icons";
import {
  format,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
} from "date-fns";
import { cn } from "@/lib/utils";
import { useOrgPaymentMode } from "@/lib/store/organization-config";

interface BasicInfoStepProps {
  data: {
    name: string;
    description: string;
    class: string;
    exam: string;
    language: string;
    startDate: string;
    endDate: string;
    validity: string;
    totalPrice: number;
    discountPercentage: number;
    discountedPrice: number;
    imageUrl: string;
  };
  onUpdate: (data: Record<string, unknown>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirstStep: boolean;
  isSubmitting: boolean;
}

export function BasicInfoStep({
  data,
  onUpdate,
  onNext,
  isFirstStep,
  isSubmitting,
}: BasicInfoStepProps) {
  const [formData, setFormData] = useState({
    name: data.name || "",
    description: data.description || "",
    class: data.class || "",
    exam: data.exam || "",
    language: data.language || "English",
    startDate: data.startDate || "",
    endDate: data.endDate || "",
    validity: data.validity || "",
    totalPrice: data.totalPrice || 0,
    discountPercentage: data.discountPercentage || 0,
    discountedPrice: data.discountedPrice || 0,
    imageUrl: data.imageUrl || "",
  });
  const paymentMode = useOrgPaymentMode();
  const showCoursePricing = paymentMode === "per_course";

  const handleInputChange = (field: string, value: string | number) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);

    // Auto-calculate validity when start or end date changes
    if (field === "startDate" || field === "endDate") {
      const calculatedValidity = calculateValidity(
        newData.startDate,
        newData.endDate
      );
      if (calculatedValidity) {
        newData.validity = calculatedValidity;
        setFormData(newData);
      }
    }

    onUpdate(newData);
  };

  const calculateValidity = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return "";

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) return "";

    const years = differenceInYears(end, start);
    const months = differenceInMonths(end, start);
    const days = differenceInDays(end, start);

    // Calculate remaining days after years and months
    const remainingDays = days % 30; // Approximate days in a month
    const remainingMonths = months % 12;

    let result = "";

    if (years > 0) {
      result += `${years} year${years > 1 ? "s" : ""}`;
    }

    if (remainingMonths > 0) {
      if (result) result += " ";
      result += `${remainingMonths} month${remainingMonths > 1 ? "s" : ""}`;
    }

    if (remainingDays > 0) {
      if (result) result += " ";
      result += `${remainingDays} day${remainingDays > 1 ? "s" : ""}`;
    }

    // Fallback for very short durations
    if (!result) {
      const totalDays = differenceInDays(end, start);
      if (totalDays > 0) {
        result = `${totalDays} day${totalDays > 1 ? "s" : ""}`;
      }
    }

    return result;
  };

  const handleDescriptionChange = (content: string) => {
    handleInputChange("description", content);
  };

  const calculateDiscountedPrice = (price: number, discount: number) => {
    return price - (price * discount) / 100;
  };

  const handlePriceChange = (field: string, value: number) => {
    const newData = { ...formData, [field]: value };

    if (field === "totalPrice" || field === "discountPercentage") {
      const totalPrice = field === "totalPrice" ? value : formData.totalPrice;
      const discountPercentage =
        field === "discountPercentage" ? value : formData.discountPercentage;
      newData.discountedPrice = calculateDiscountedPrice(
        totalPrice,
        discountPercentage
      );
    }

    setFormData(newData);
    onUpdate(newData);
  };

  const handleNext = () => {
    // Comprehensive validation for all required fields
    if (
      formData.name &&
      formData.description &&
      formData.class &&
      formData.exam &&
      formData.startDate &&
      formData.endDate &&
      formData.validity &&
      (!showCoursePricing || formData.totalPrice >= 0)
    ) {
      if (!showCoursePricing) {
        onUpdate({
          ...formData,
          totalPrice: 0,
          discountPercentage: 0,
          discountedPrice: 0,
        });
      }
      onNext();
    }
  };

  const classOptions = [
    "6th",
    "7th",
    "8th",
    "9th",
    "10th",
    "11th",
    "12th",
    "12+",
    "Graduate",
    "Post Graduate",
  ];

  const examOptions = [
    "JEE Main",
    "JEE Advanced",
    "NEET",
    "CAT",
    "UPSC",
    "SSC",
    "Banking",
    "Railway",
    "Defense",
    "Other",
  ];

  const languageOptions = [
    "English",
    "Hindi",
    "Bengali",
    "Tamil",
    "Telugu",
    "Marathi",
    "Gujarati",
    "Kannada",
    "Malayalam",
    "Punjabi",
  ];

  return (
    <div className="space-y-6">
      {/* Course Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Course Information</CardTitle>
          <CardDescription>
            Provide basic details about your course
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Course Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter course name"
                className=""
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class">Class *</Label>
              <Select
                value={formData.class}
                onValueChange={(value) => handleInputChange("class", value)}
              >
                <SelectTrigger className="">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Course Description *</Label>
            <RichTextEditor
              content={formData.description}
              onChange={handleDescriptionChange}
              placeholder="Describe your course in detail..."
              className="min-h-[200px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exam">Target Exam *</Label>
              <Select
                value={formData.exam}
                onValueChange={(value) => handleInputChange("exam", value)}
              >
                <SelectTrigger className="">
                  <SelectValue placeholder="Select target exam" />
                </SelectTrigger>
                <SelectContent>
                  {examOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language *</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => handleInputChange("language", value)}
              >
                <SelectTrigger className="">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Image */}
      <Card>
        <CardHeader>
          <CardTitle>Course Image</CardTitle>
          <CardDescription>
            Upload a thumbnail image for your course
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {formData.imageUrl ? (
              <div className="space-y-2">
                <div className="relative w-full h-48 border-2 border-dashed border-muted-foreground/25 rounded-lg overflow-hidden">
                  <Image
                    src={formData.imageUrl}
                    alt="Course thumbnail"
                    fill
                    className="object-cover"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleInputChange("imageUrl", "")}
                  className="w-full"
                >
                  Change Image
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Upload a course thumbnail image
                </p>
                <Button variant="outline" className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Course Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Course Schedule</CardTitle>
          <CardDescription>
            Set the course duration and validity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate
                      ? format(new Date(formData.startDate), "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      formData.startDate
                        ? new Date(formData.startDate)
                        : undefined
                    }
                    onSelect={(date) =>
                      handleInputChange(
                        "startDate",
                        date ? format(date, "yyyy-MM-dd") : ""
                      )
                    }
                    captionLayout="dropdown"
                    fromDate={new Date()}
                    toDate={new Date(2030, 11, 31)}
                    className="pointer-events-auto"
                    startMonth={new Date()}
                    endMonth={new Date(2030, 11, 31)}
                    defaultMonth={new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.endDate
                      ? format(new Date(formData.endDate), "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      formData.endDate ? new Date(formData.endDate) : undefined
                    }
                    onSelect={(date) =>
                      handleInputChange(
                        "endDate",
                        date ? format(date, "yyyy-MM-dd") : ""
                      )
                    }
                    captionLayout="dropdown"
                    fromDate={
                      formData.startDate
                        ? new Date(formData.startDate)
                        : new Date()
                    }
                    toDate={new Date(2030, 11, 31)}
                    className="pointer-events-auto"
                    startMonth={new Date()}
                    endMonth={new Date(2030, 11, 31)}
                    defaultMonth={
                      formData.startDate
                        ? new Date(formData.startDate)
                        : new Date()
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="validity">Validity *</Label>
              <Input
                id="validity"
                value={formData.validity}
                onChange={(e) => handleInputChange("validity", e.target.value)}
                placeholder="Auto-calculated from start and end dates"
                className="bg-muted/50"
                readOnly
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Validity is automatically calculated based on your start and end
                dates
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      {showCoursePricing && (
      <Card>
        <CardHeader>
          <CardTitle>Course Pricing</CardTitle>
          <CardDescription>
            Set the course price and any discounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalPrice">Total Price (₹) *</Label>
              <Input
                id="totalPrice"
                type="number"
                value={formData.totalPrice}
                onChange={(e) =>
                  handlePriceChange(
                    "totalPrice",
                    parseFloat(e.target.value) || 0
                  )
                }
                placeholder="0"
                className=""
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountPercentage">Discount (%)</Label>
              <Input
                id="discountPercentage"
                type="number"
                value={formData.discountPercentage}
                onChange={(e) =>
                  handlePriceChange(
                    "discountPercentage",
                    parseFloat(e.target.value) || 0
                  )
                }
                placeholder="0"
                min="0"
                max="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountedPrice">Final Price (₹)</Label>
              <Input
                id="discountedPrice"
                type="number"
                value={formData.discountedPrice}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {}}
          disabled={isFirstStep}
        >
          Previous
        </Button>
        <Button type="button" onClick={handleNext} disabled={isSubmitting}>
          Next Step
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
