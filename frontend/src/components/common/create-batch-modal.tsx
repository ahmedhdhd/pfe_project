"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  CalendarIcon,
  Plus,
  X,
  BookOpen,
  GraduationCap,
  BadgeDollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useCreateBatch, useGetCategories } from "@/hooks";
import { useOrgPaymentMode } from "@/lib/store/organization-config";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { FileUpload } from "@/components/common/file-upload";
import { DetailedHLSUpload } from "@/components/common/detailed-hls-upload";
import { Badge } from "../ui/badge";
import Image from "next/image";
import {
  CategoryOption,
  getCategoryIcon,
  getChildCategories,
  getRootCategories,
  resolveAssignedCategoryId,
} from "@/lib/categories";

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FAQ {
  id: string;
  title: string;
  description: string;
}

export function CreateBatchModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateBatchModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    subcategoryId: "",
    imageUrl: "",
    introVideoUrl: "",
    startDate: "",
    endDate: "",
    language: "English",
    level: "BEGINNER",
    totalPrice: 0,
    discountPercentage: 0,
  });

  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [newFaq, setNewFaq] = useState({ title: "", description: "" });
  const [isAddingFaq, setIsAddingFaq] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingIntroVideo, setIsUploadingIntroVideo] = useState(false);

  const paymentMode = useOrgPaymentMode();
  const showCoursePricing = paymentMode === "per_course";
  const createBatchMutation = useCreateBatch();
  const { data: categoriesResponse } = useGetCategories();
  const categories = useMemo(
    () => ((categoriesResponse?.data as CategoryOption[] | undefined) ?? []),
    [categoriesResponse?.data]
  );
  const rootCategories = useMemo(
    () => getRootCategories(categories),
    [categories]
  );
  const subcategories = useMemo(
    () => getChildCategories(categories, formData.categoryId || null),
    [categories, formData.categoryId]
  );

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleDateChange = (
    field: "startDate" | "endDate",
    date: Date | undefined
  ) => {
    if (date) {
      setFormData((prev) => ({ ...prev, [field]: date.toISOString() }));
    }
  };

  const handleAddFaq = () => {
    if (newFaq.title.trim() && newFaq.description.trim()) {
      const faq: FAQ = {
        id: Date.now().toString(),
        title: newFaq.title,
        description: newFaq.description,
      };
      setFaqs((prev) => [...prev, faq]);
      setNewFaq({ title: "", description: "" });
      setIsAddingFaq(false);
    }
  };

  const handleImageUpload = (fileData: {
    key: string;
    url: string;
    bucket: string;
    originalName: string;
    size: number;
    mimeType: string;
  }) => {
    setIsUploadingImage(true);
    try {
      // Update the form data with the uploaded image URL
      setFormData((prev) => ({ ...prev, imageUrl: fileData.url }));
    } catch (error) {
      console.error("Failed to update image URL:", error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveFaq = (id: string) => {
    setFaqs((prev) => prev.filter((faq) => faq.id !== id));
  };

  const handleIntroVideoUpload = (url: string) => {
    setIsUploadingIntroVideo(true);
    try {
      setFormData((prev) => ({ ...prev, introVideoUrl: url }));
    } catch (error) {
      console.error("Failed to update intro video URL:", error);
    } finally {
      setIsUploadingIntroVideo(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Course name is required";
    }
    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }
    if (!formData.endDate) {
      newErrors.endDate = "End date is required";
    }
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end <= start) {
        newErrors.endDate = "End date must be after start date";
      }
    }
    if (showCoursePricing && formData.totalPrice < 0) {
      newErrors.totalPrice = "Price cannot be negative";
    }
    if (
      showCoursePricing &&
      (formData.discountPercentage < 0 || formData.discountPercentage > 100)
    ) {
      newErrors.discountPercentage = "Discount must be between 0 and 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const batchData = {
        name: formData.name,
        description: formData.description,
        categoryId:
          resolveAssignedCategoryId(
            formData.categoryId,
            formData.subcategoryId
          ) || undefined,
        imageUrl: formData.imageUrl || undefined,
        introVideoUrl: formData.introVideoUrl.trim()
          ? formData.introVideoUrl
          : "",
        startDate: formData.startDate,
        endDate: formData.endDate,
        language: formData.language,
        level: formData.level,
        totalPrice: showCoursePricing ? formData.totalPrice : 0,
        discountPercentage: showCoursePricing
          ? formData.discountPercentage
          : 0,
        faq: faqs.map((faq) => ({
          title: faq.title,
          description: faq.description,
        })),
      };

      await createBatchMutation.mutateAsync(batchData);
      onSuccess();
    } catch (error) {
      console.error("Failed to create batch:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      description: "",
      categoryId: "",
      subcategoryId: "",
      imageUrl: "",
      introVideoUrl: "",
      startDate: "",
      endDate: "",
      language: "English",
      level: "BEGINNER",
      totalPrice: 0,
      discountPercentage: 0,
    });
    setFaqs([]);
    setNewFaq({ title: "", description: "" });
    setIsAddingFaq(false);
    setErrors({});
    setIsUploadingImage(false);
    setIsUploadingIntroVideo(false);
    onClose();
  };

  const languageOptions = [
    "Arabic",
    "English",
    "French",
  ];

  const levelOptions = [
    { value: "BEGINNER", label: "Beginner" },
    { value: "INTERMEDIATE", label: "Intermediate" },
    { value: "ADVANCED", label: "Advanced" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-7xl max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new course. You can add more content
            and assign teachers after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Course Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., JEE 2026 Master Batch"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category</Label>
                  <Select
                    value={formData.categoryId || undefined}
                    onValueChange={(value) => {
                      handleInputChange("categoryId", value);
                      handleInputChange("subcategoryId", "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {rootCategories.map((option) => {
                        const Icon = getCategoryIcon(option.icon);
                        return (
                        <SelectItem key={option.id} value={option.id}>
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {option.name}
                          </span>
                        </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {categories.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Create categories from the All Courses page to assign one
                      here.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subcategoryId">Subcategory</Label>
                  <Select
                    value={formData.subcategoryId || undefined}
                    onValueChange={(value) =>
                      handleInputChange("subcategoryId", value)
                    }
                    disabled={!formData.categoryId || subcategories.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategories.map((option) => {
                        const Icon = getCategoryIcon(option.icon);
                        return (
                          <SelectItem key={option.id} value={option.id}>
                            <span className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {option.name}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {formData.categoryId && subcategories.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No subcategories under this category yet.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) =>
                      handleInputChange("language", value)
                    }
                  >
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Select
                    value={formData.level}
                    onValueChange={(value) => handleInputChange("level", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {levelOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="description">Description</Label>
                <RichTextEditor
                  content={formData.description}
                  onChange={(content) =>
                    handleInputChange("description", content)
                  }
                  placeholder="Describe your course in detail..."
                />
              </div>

              <div className="space-y-2 mt-4">
                <Label>Course Image (Optional)</Label>
                <div className="space-y-4">
                  {/* Image Preview */}
                  {formData.imageUrl && (
                    <div className="relative h-48 w-full rounded-lg border overflow-hidden">
                      <Image
                        src={formData.imageUrl}
                        alt="Course preview"
                        className="object-cover"
                        fill
                        sizes="(max-width: 768px) 100vw, 400px"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => handleInputChange("imageUrl", "")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* File Upload */}
                  <FileUpload
                    onUploadComplete={handleImageUpload}
                    accept="image/*"
                    maxSize={10} // 10MB for images
                    folder="course-images"
                    className="w-full"
                  />

                  {isUploadingImage && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span>Uploading image...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label>Introduction Video (Optional)</Label>
                <div className="space-y-4">
                  {formData.introVideoUrl && (
                    <div className="relative overflow-hidden rounded-lg border bg-black">
                      <video
                        src={formData.introVideoUrl}
                        controls
                        className="aspect-video w-full"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute right-2 top-2"
                        onClick={() => handleInputChange("introVideoUrl", "")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  <DetailedHLSUpload
                    onUploadComplete={handleIntroVideoUpload}
                    accept="video/*"
                    maxSize={5000}
                    folder="course-intro-videos"
                    className="w-full"
                  />

                  <p className="text-sm text-muted-foreground">
                    This video will appear on the student course page and as the
                    first lesson in the course player.
                  </p>

                  {isUploadingIntroVideo && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span>Uploading introduction video...</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Schedule
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.startDate && "text-muted-foreground",
                          errors.startDate && "border-red-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.startDate
                          ? format(new Date(formData.startDate), "PPP")
                          : "Select start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={
                          formData.startDate
                            ? new Date(formData.startDate)
                            : undefined
                        }
                        onSelect={(date) => handleDateChange("startDate", date)}
                        fromDate={new Date()}
                        className="rounded-md border"
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.startDate && (
                    <p className="text-sm text-red-500">{errors.startDate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.endDate && "text-muted-foreground",
                          errors.endDate && "border-red-500"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.endDate
                          ? format(new Date(formData.endDate), "PPP")
                          : "Select end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={
                          formData.endDate
                            ? new Date(formData.endDate)
                            : undefined
                        }
                        onSelect={(date) => handleDateChange("endDate", date)}
                        fromDate={
                          formData.startDate
                            ? new Date(formData.startDate)
                            : new Date()
                        }
                        className="rounded-md border"
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.endDate && (
                    <p className="text-sm text-red-500">{errors.endDate}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          {showCoursePricing && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center">
                <BadgeDollarSign className="mr-2 h-5 w-5" />
                Pricing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalPrice">Course Price</Label>
                  <Input
                    id="totalPrice"
                    type="number"
                    placeholder="0"
                    value={formData.totalPrice || ""}
                    onChange={(e) =>
                      handleInputChange("totalPrice", Number(e.target.value))
                    }
                    className={errors.totalPrice ? "border-red-500" : ""}
                  />
                  {errors.totalPrice && (
                    <p className="text-sm text-red-500">{errors.totalPrice}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discountPercentage">
                    Discount Percentage (%)
                  </Label>
                  <Input
                    id="discountPercentage"
                    type="number"
                    placeholder="20"
                    min="0"
                    max="100"
                    value={formData.discountPercentage || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "discountPercentage",
                        Number(e.target.value)
                      )
                    }
                    className={
                      errors.discountPercentage ? "border-red-500" : ""
                    }
                  />
                  {errors.discountPercentage && (
                    <p className="text-sm text-red-500">
                      {errors.discountPercentage}
                    </p>
                  )}
                </div>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                New courses are free by default. Keep the price at 0 to leave
                the course free.
              </p>

              {formData.totalPrice > 0 && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Final Price:
                    </span>
                    <span className="text-lg font-semibold">
                      {Math.round(
                        formData.totalPrice -
                          (formData.totalPrice * formData.discountPercentage) /
                            100
                      ).toLocaleString()}
                    </span>
                  </div>
                  {formData.discountPercentage > 0 && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-muted-foreground line-through">
                        {formData.totalPrice.toLocaleString()}
                      </span>
                      <Badge variant="destructive">
                        {formData.discountPercentage}% OFF
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* FAQ Section */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 flex items-center">
                <GraduationCap className="mr-2 h-5 w-5" />
                Frequently Asked Questions
              </h3>

              {faqs.length > 0 && (
                <div className="space-y-3 mb-4">
                  {faqs.map((faq) => (
                    <div key={faq.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{faq.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {faq.description}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFaq(faq.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isAddingFaq ? (
                <div className="space-y-3 p-3 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="faq-title">Question</Label>
                    <Input
                      id="faq-title"
                      placeholder="What is this course about?"
                      value={newFaq.title}
                      onChange={(e) =>
                        setNewFaq((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="faq-description">Answer</Label>
                    <Textarea
                      id="faq-description"
                      placeholder="This course covers..."
                      value={newFaq.description}
                      onChange={(e) =>
                        setNewFaq((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={handleAddFaq}>
                      Add FAQ
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAddingFaq(false);
                        setNewFaq({ title: "", description: "" });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setIsAddingFaq(true)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add FAQ
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || createBatchMutation.isPending}
          >
            {isSubmitting || createBatchMutation.isPending
              ? "Creating Course..."
              : "Create Course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
