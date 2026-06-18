"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Clock,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Globe,
  Calendar,
  Rocket,
} from "@/components/icons";
import {
  useTestSeries,
  useDeleteTestSeries,
  useTestsByTestSeries,
  TestSeries,
} from "@/hooks/test-series";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { TestListSection } from "./test-list-section";
import { EditTestSeriesModal } from "./edit-test-series-modal";

interface TestSeriesDetailPageProps {
  basePath?: "admin" | "teacher";
}

export function TestSeriesDetailPage({
  basePath = "admin",
}: TestSeriesDetailPageProps) {
  const params = useParams();
  const router = useRouter();
  const testSeriesId = params.id as string;
  const [activeTab, setActiveTab] = useState("overview");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Data fetching
  const {
    data: testSeriesData,
    isLoading,
    refetch: refetchTestSeries,
  } = useTestSeries(testSeriesId);
  const { data: testsData, refetch: refetchTests } =
    useTestsByTestSeries(testSeriesId);

  // Mutations
  const deleteMutation = useDeleteTestSeries();

  const testSeries = testSeriesData?.data as TestSeries | undefined;
  const tests = Array.isArray(testsData?.data) ? testsData.data : [];
  const categoryLabel = testSeries?.category?.parent?.name
    ? `${testSeries.category.parent.name} / ${testSeries.category.name}`
    : testSeries?.category?.name || testSeries?.exam || "Uncategorized";

  const handleGoBack = () => {
    router.push(`/${basePath}/test-series`);
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(testSeriesId);
      router.push(`/${basePath}/test-series`);
    } catch (error) {
      console.error("Failed to delete test series:", error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not published";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!testSeries) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            Assessment Bundle Not Found
          </h3>
          <Button onClick={handleGoBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bundles
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" onClick={handleGoBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Bundles
          </Button>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-4">
              {testSeries.imageUrl && (
                <img
                  src={testSeries.imageUrl}
                  alt={testSeries.title}
                  className="h-20 w-20 shrink-0 rounded-lg object-cover border"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {testSeries.title}
                </h1>
                <div className="flex items-center space-x-3 mt-2">
                  <Badge variant="outline" className="text-sm">
                    {categoryLabel}
                  </Badge>
                  <Badge
                    variant={testSeries.isPublished ? "default" : "secondary"}
                    className={
                      testSeries.isPublished
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        : ""
                    }
                  >
                    {testSeries.isPublished ? (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Published
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1 h-3 w-3" />
                        Draft
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground mt-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>{testSeries.testCount} Tests</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>{testSeries.totalQuestions} Questions</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>{testSeries.durationDays} Days Access</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Created {formatDate(testSeries.createdAt)}</span>
              </div>
              {testSeries.isPublished && testSeries.publishedAt && (
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4" />
                  <span>Published {formatDate(testSeries.publishedAt)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tests">
            Tests
            {testSeries.testCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {testSeries.testCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="space-y-6">
            {/* Description Card */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                {testSeries.description?.html ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground test-series-description"
                    dangerouslySetInnerHTML={{
                      __html: testSeries.description.html,
                    }}
                  />
                ) : (
                  <p className="text-muted-foreground">
                    No description provided
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Features Card */}
            {testSeries.description?.features &&
              testSeries.description.features.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {testSeries.description.features.map((feature, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <CheckCircle className="h-5 w-5 shrink-0 text-green-600 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
          </div>
        </TabsContent>

        {/* Tests Tab */}
        <TabsContent value="tests" className="space-y-6">
          <TestListSection
            testSeriesId={testSeriesId}
            tests={tests}
            onRefetch={() => {
              refetchTests();
              refetchTestSeries();
            }}
            basePath={basePath}
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <EditTestSeriesModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        testSeries={testSeries}
        onSuccess={() => {
          refetchTestSeries();
        }}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              assessment bundle and all associated assessments, sections, and
              questions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        /* Override inline styles in dark mode for test series description */
        .dark .test-series-description div[style],
        .dark .test-series-description p[style],
        .dark .test-series-description span[style] {
          background: hsl(var(--background)) !important;
          color: hsl(var(--foreground)) !important;
        }
      `}</style>
    </div>
  );
}
