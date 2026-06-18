"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Upload as UploadIcon,
  Eye,
  Layers as LayersIcon,
  Pencil,
  Trash,
} from "@/components/icons";
import { EditSectionModal } from "./edit-section-modal";
import { BulkAddQuestionsModal } from "./bulk-add-questions-modal";
import { CsvImportQuestionsModal } from "./csv-import-questions-modal";
import { useDeleteSection } from "@/hooks/test-series";
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
  Trash2,
  Plus,
  FileText,
  Clock,
  CheckCircle,
  List,
  HelpCircle,
  Settings,
  Edit,
  Save,
  X,
} from "@/components/icons";
import {
  useTest,
  useDeleteTest,
  useUpdateTest,
  useTestSections,
  Test,
  Section,
} from "@/hooks/test-series";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { CreateSectionModal } from "./create-section-modal";
import { CreateQuestionModal } from "./create-question-modal";
import { useTestDetails } from "@/hooks/test-series";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { decodeHtmlEntities } from "@/lib/utils";

interface TestDetailPageProps {
  basePath?: "admin" | "teacher";
}

export function TestDetailPage({ basePath = "admin" }: TestDetailPageProps) {
  const params = useParams();
  const router = useRouter();
  const testSeriesId = params.id as string;
  const testId = params.testId as string;
  const [activeTab, setActiveTab] = useState("sections");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateSectionModalOpen, setIsCreateSectionModalOpen] =
    useState(false);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [isCreateQuestionModalOpen, setIsCreateQuestionModalOpen] =
    useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvMode, setCsvMode] = useState<
    "AUTO" | "QUESTIONS_ONLY" | "SECTIONS_AND_QUESTIONS"
  >("AUTO");
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [instructionsContent, setInstructionsContent] = useState("");

  // Data fetching
  const { data: testData, isLoading, refetch: refetchTest } = useTest(testId);
  const { data: detailsData, refetch: refetchTestDetails } =
    useTestDetails(testId);
  const { data: sectionsData, refetch: refetchSections } =
    useTestSections(testId);

  // Mutations
  const deleteMutation = useDeleteTest();
  const updateMutation = useUpdateTest();

  const details = detailsData?.data as
    | (Test & { sections?: Section[] })
    | undefined;
  const test = (details as Test) || (testData?.data as Test | undefined);
  const sections =
    (details?.sections as Section[]) || (sectionsData?.data as Section[]) || [];

  // Initialize instructions content when test loads or when not editing
  useEffect(() => {
    if (!isEditingInstructions && test) {
      setInstructionsContent(test.instructions?.html || "");
    }
  }, [test?.instructions?.html, isEditingInstructions]);

  const handleGoBack = () => {
    router.push(`/${basePath}/test-series/${testSeriesId}`);
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(testId);
      router.push(`/${basePath}/test-series/${testSeriesId}`);
    } catch (error) {
      console.error("Failed to delete test:", error);
    }
  };

  const handleCreateSection = () => {
    setSelectedSection(null);
    setIsCreateSectionModalOpen(true);
  };

  const handleCreateQuestion = (section: Section) => {
    setSelectedSection(section);
    setIsCreateQuestionModalOpen(true);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleStartEditInstructions = () => {
    setInstructionsContent(test?.instructions?.html || "");
    setIsEditingInstructions(true);
  };

  const handleCancelEditInstructions = () => {
    setInstructionsContent(test?.instructions?.html || "");
    setIsEditingInstructions(false);
  };

  const handleSaveInstructions = async () => {
    if (!test) return;

    try {
      const result = await updateMutation.mutateAsync({
        id: testId,
        data: {
          instructions: instructionsContent
            ? {
                html: instructionsContent,
              }
            : {},
        },
      });

      // Update local state immediately from response
      if (result?.data?.instructions?.html) {
        setInstructionsContent(result.data.instructions.html);
      } else {
        setInstructionsContent("");
      }

      setIsEditingInstructions(false);

      // Refetch both queries to ensure we have the latest data
      await Promise.all([refetchTest(), refetchTestDetails()]);
    } catch (error) {
      console.error("Failed to update instructions:", error);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!test) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Test Not Found</h3>
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
            <h1 className="text-3xl font-bold tracking-tight mb-4">
              {test.title}
            </h1>
            <div className="flex items-center flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>{test.durationMinutes} minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4" />
                <span>{test.totalMarks} marks</span>
              </div>
              <div className="flex items-center space-x-2">
                <List className="h-4 w-4" />
                <span>{test.sectionCount} sections</span>
              </div>
              <div className="flex items-center space-x-2">
                <HelpCircle className="h-4 w-4" />
                <span>{test.questionCount} questions</span>
              </div>
            </div>
            <div className="flex items-center space-x-3 mt-4">
              <Badge
                variant={test.isPublished ? "default" : "secondary"}
                className={
                  test.isPublished
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                    : ""
                }
              >
                {test.isPublished ? (
                  <>
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Published
                  </>
                ) : (
                  <>
                    <Settings className="mr-1 h-3 w-3" />
                    Draft
                  </>
                )}
              </Badge>
              {test.isFree && (
                <Badge variant="outline" className="bg-blue-50">
                  Free
                </Badge>
              )}
            </div>
          </div>

          <div className="flex space-x-2">
            <Button
              variant={test.isPublished ? "secondary" : "default"}
              onClick={async () => {
                try {
                  await updateMutation.mutateAsync({
                    id: testId,
                    data: { isPublished: !test.isPublished },
                  });
                  refetchTest();
                } catch (e) {}
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending
                ? "Saving..."
                : test.isPublished
                ? "Unpublish"
                : "Publish"}
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
        <TabsList>
          <TabsTrigger value="sections">
            Sections
            {sections.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {sections.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Sections Tab */}
        <TabsContent value="sections" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold mb-2">
                    Sections
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Organize questions into sections for better structure
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={handleCreateSection} size="lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Section
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => {
                      setCsvMode("SECTIONS_AND_QUESTIONS");
                      setIsCsvModalOpen(true);
                    }}
                  >
                    <UploadIcon className="mr-2 h-4 w-4" />
                    Add Bulk Upload
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sections.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16 border-2 border-dashed border-muted-foreground/30 rounded-xl bg-muted/30"
                >
                  <List className="h-16 w-16 mx-auto text-muted-foreground/50 mb-6" />
                  <h3 className="text-xl font-semibold mb-2">
                    No Sections Yet
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Create your first section to start adding questions.
                    Sections help organize your test content logically.
                  </p>
                  <Button onClick={handleCreateSection} size="lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Section
                  </Button>
                </motion.div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Section</TableHead>
                        <TableHead>Questions</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="cursor-pointer hover:bg-muted/50">
                      {sections.map((section) => (
                        <SectionTableRow
                          key={section.id}
                          section={section}
                          testId={testId}
                          testSeriesId={testSeriesId}
                          basePath={basePath}
                          onCreateQuestion={() => handleCreateQuestion(section)}
                          onRefetch={() => {
                            refetchSections();
                            refetchTest();
                          }}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          {/* Instructions Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Instructions</CardTitle>
                {!isEditingInstructions && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartEditInstructions}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Instructions
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditingInstructions ? (
                <div className="space-y-4">
                  <RichTextEditor
                    content={instructionsContent}
                    onChange={setInstructionsContent}
                    placeholder="Enter test instructions for students..."
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEditInstructions}
                      disabled={updateMutation.isPending}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveInstructions}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {updateMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              ) : test.instructions?.html ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground test-instructions"
                  dangerouslySetInnerHTML={{
                    __html: decodeHtmlEntities(test.instructions.html),
                  }}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No instructions provided</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={handleStartEditInstructions}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Add Instructions
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">
                    Show Answers After Submit
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {test.showAnswersAfterSubmit ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Allow Review</p>
                  <p className="text-sm text-muted-foreground">
                    {test.allowReview ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Shuffle Questions</p>
                  <p className="text-sm text-muted-foreground">
                    {test.shuffleQuestions ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(test.createdAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreateSectionModal
        open={isCreateSectionModalOpen}
        onOpenChange={setIsCreateSectionModalOpen}
        testId={testId}
        onSuccess={() => {
          refetchSections();
          refetchTest();
          setIsCreateSectionModalOpen(false);
        }}
      />

      {selectedSection && (
        <CreateQuestionModal
          open={isCreateQuestionModalOpen}
          onOpenChange={setIsCreateQuestionModalOpen}
          sectionId={selectedSection.id}
          onSuccess={() => {
            refetchSections();
            refetchTest();
            setIsCreateQuestionModalOpen(false);
            setSelectedSection(null);
          }}
        />
      )}

      <CsvImportQuestionsModal
        open={isCsvModalOpen}
        onOpenChange={setIsCsvModalOpen}
        testId={testId}
        mode={csvMode}
        onSuccess={() => {
          refetchSections();
          refetchTest();
        }}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Test</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this test? This action cannot be
              undone and will delete all sections and questions.
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
    </div>
  );
}

function SectionTableRow({
  section,
  testId,
  testSeriesId,
  basePath = "admin",
  onRefetch,
}: {
  section: Section;
  testId: string;
  testSeriesId: string;
  basePath?: "admin" | "teacher";
  onCreateQuestion: () => void;
  onRefetch: () => void;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isQuestionsOnlyImportOpen, setIsQuestionsOnlyImportOpen] =
    useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const deleteSectionMutation = useDeleteSection();

  const handleDeleteSection = async () => {
    try {
      await deleteSectionMutation.mutateAsync(section.id);
      setIsDeleteOpen(false);
      onRefetch();
    } catch {}
  };

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex flex-col">
            <span className="font-medium">{section.name}</span>
            {section.description && (
              <span className="text-muted-foreground text-xs line-clamp-1">
                {section.description}
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>{section.questionCount}</TableCell>
        <TableCell>{section.totalMarks}</TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link
                  href={`/${basePath}/test-series/${testSeriesId}/tests/${testId}/sections/${section.id}/questions`}
                >
                  <span className="inline-flex items-center">
                    <Eye className="mr-2 h-4 w-4" /> View Questions
                  </span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsBulkAddOpen(true)}>
                <LayersIcon className="mr-2 h-4 w-4" /> Add Questions
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsQuestionsOnlyImportOpen(true)}
              >
                <UploadIcon className="mr-2 h-4 w-4" /> Bulk Upload Questions
                (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit Section
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash className="mr-2 h-4 w-4" /> Delete Section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <EditSectionModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        section={section}
        onSuccess={() => {
          onRefetch();
          setIsEditOpen(false);
        }}
      />

      <BulkAddQuestionsModal
        open={isBulkAddOpen}
        onOpenChange={setIsBulkAddOpen}
        sectionId={section.id}
        onSuccess={() => {
          onRefetch();
          setIsBulkAddOpen(false);
        }}
      />

      <CsvImportQuestionsModal
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        testId={testId}
        defaultSectionId={section.id}
        mode="SECTIONS_AND_QUESTIONS"
        onSuccess={() => {
          onRefetch();
          setIsImportOpen(false);
        }}
      />

      <CsvImportQuestionsModal
        open={isQuestionsOnlyImportOpen}
        onOpenChange={setIsQuestionsOnlyImportOpen}
        testId={testId}
        defaultSectionId={section.id}
        mode="QUESTIONS_ONLY"
        onSuccess={() => {
          onRefetch();
          setIsQuestionsOnlyImportOpen(false);
        }}
      />

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Section</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this section? This will also
              delete all questions in this section. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteSection}
              variant="destructive"
              disabled={deleteSectionMutation.isPending}
            >
              {deleteSectionMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
