"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TEST_BULK_QUESTIONS_CSV_HEADERS,
  ALLOWED_QUESTION_TYPES,
  ALLOWED_DIFFICULTY_LEVELS,
  type TestBulkCsvRow,
} from "@/lib/constants/csv-templates";
import {
  useCreateTestSection,
  useBulkCreateSectionQuestions,
  useTestSections,
  QuestionType,
  DifficultyLevel,
  Section,
} from "@/hooks/test-series";

type CsvImportMode = "AUTO" | "QUESTIONS_ONLY" | "SECTIONS_AND_QUESTIONS";

interface CsvImportQuestionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string;
  onSuccess?: () => void;
  defaultSectionId?: string; // prefill when opened from a section
  mode?: CsvImportMode; // controls whether to force questions-only or sections+questions
}

export function CsvImportQuestionsModal({
  open,
  onOpenChange,
  testId,
  onSuccess,
  defaultSectionId,
  mode = "AUTO",
}: CsvImportQuestionsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rows, setRows] = useState<TestBulkCsvRow[]>([]);
  const [rowErrors, setRowErrors] = useState<Record<number, string[]>>({});
  const [result, setResult] = useState<{
    createdSections: number;
    createdQuestions: number;
    failed: number;
  } | null>(null);
  const [targetSectionId, setTargetSectionId] = useState<string>(
    defaultSectionId || ""
  );

  const { data: existingSectionsData } = useTestSections(testId);
  const createSectionMutation = useCreateTestSection();
  const bulkCreateQuestionsMutation = useBulkCreateSectionQuestions();

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const parseCsv = (text: string): TestBulkCsvRow[] => {
    // Minimal CSV parser with quoted-field support
    const lines = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .filter(Boolean);
    if (lines.length === 0) return [];
    const header = splitCsvLine(lines[0]);
    const rows: TestBulkCsvRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i]);
      const obj: Partial<TestBulkCsvRow> = {};
      header.forEach((h, idx) => {
        (obj as Record<string, string>)[h] = cols[idx] ?? "";
      });
      rows.push(obj as TestBulkCsvRow);
    }
    return rows;
  };

  const splitCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map((v) =>
      v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v
    );
  };

  const validateRows = (items: TestBulkCsvRow[]): Record<number, string[]> => {
    const errors: Record<number, string[]> = {};
    // Header check (allow CSV without section columns)
    const headerKeys = Object.keys(items[0] || {});
    const missingHeaders = TEST_BULK_QUESTIONS_CSV_HEADERS.filter(
      (h) => !headerKeys.includes(h)
    );
    let hasSectionColumns = headerKeys.includes("sectionName");
    if (mode === "QUESTIONS_ONLY") hasSectionColumns = false;
    if (mode === "SECTIONS_AND_QUESTIONS") hasSectionColumns = true;
    // Allow section-related headers to be optional when not provided
    const sectionHeaders = new Set([
      "sectionName",
      "sectionDescription",
      "sectionDisplayOrder",
    ]);
    const blockingMissing = missingHeaders.filter(
      (h) => !sectionHeaders.has(h)
    );
    if (blockingMissing.length > 0) {
      errors[-1] = [`Missing headers: ${blockingMissing.join(", ")}`];
      return errors;
    }

    if (
      mode === "SECTIONS_AND_QUESTIONS" &&
      !headerKeys.includes("sectionName")
    ) {
      errors[-1] = [
        "CSV must include section columns (e.g., sectionName) when using Sections + Questions mode",
      ];
      return errors;
    }

    items.forEach((row, idx) => {
      const rowErr: string[] = [];
      if (hasSectionColumns && !row.sectionName?.trim())
        rowErr.push("sectionName is required");
      if (!row.questionText?.trim()) rowErr.push("questionText is required");
      const type = (row.questionType || "").toUpperCase() as QuestionType;
      if (!ALLOWED_QUESTION_TYPES.includes(type))
        rowErr.push(
          `questionType must be one of ${ALLOWED_QUESTION_TYPES.join("/")}`
        );
      const diff = (row.difficulty || "").toUpperCase() as DifficultyLevel;
      if (!ALLOWED_DIFFICULTY_LEVELS.includes(diff))
        rowErr.push(
          `difficulty must be one of ${ALLOWED_DIFFICULTY_LEVELS.join("/")}`
        );
      const marks = Number(row.marks);
      if (!(marks > 0)) rowErr.push("marks must be a positive number");
      if (type === "MCQ" || type === "TRUE_FALSE") {
        // at least 1 correct option present
        if (!row.correctOptions?.trim())
          rowErr.push("correctOptions is required for MCQ/TRUE_FALSE");
      }
      if (rowErr.length) errors[idx] = rowErr;
    });
    return errors;
  };

  const handleReadAndPreview = async () => {
    if (!selectedFile) return;
    const text = await selectedFile.text();
    const parsed = parseCsv(text);
    setRows(parsed);
    const errs = parsed.length
      ? validateRows(parsed)
      : { [-1]: ["No data rows found"] };
    setRowErrors(errs);
    setStep(2);
  };

  const normalizeBoolean = (val?: string): boolean | undefined => {
    if (val == null) return undefined;
    const v = String(val).trim().toLowerCase();
    if (v === "true" || v === "t" || v === "1" || v === "yes" || v === "y")
      return true;
    if (v === "false" || v === "f" || v === "0" || v === "no" || v === "n")
      return false;
    return undefined;
  };

  const getOrCreateSectionId = async (
    byKey: string,
    name: string,
    description?: string,
    displayOrder?: number
  ): Promise<string> => {
    const existingRaw = Array.isArray(existingSectionsData?.data)
      ? (existingSectionsData.data as Section[])
      : [];
    const existing: Section[] = Array.isArray(existingRaw) ? existingRaw : [];
    const safeTargetName = String(name ?? "")
      .trim()
      .toLowerCase();
    const found = existing.find(
      (s) =>
        String(s?.name ?? "")
          .trim()
          .toLowerCase() === safeTargetName
    );
    if (found) return found.id;
    const created = await createSectionMutation.mutateAsync({
      testId,
      data: {
        name,
        description: description || undefined,
        displayOrder:
          displayOrder && Number(displayOrder) > 0
            ? Number(displayOrder)
            : undefined,
      },
    });
    return created?.data?.id || created?.id;
  };

  const runImport = async () => {
    setIsProcessing(true);
    try {
      let createdSections = 0;
      let createdQuestions = 0;
      let failed = 0;

      // Cache of section name -> id to avoid creating duplicates in same import
      const sectionIdByName = new Map<string, string>();
      // Track initial section IDs before import
      const beforeSectionIds = new Set(
        Array.isArray(existingSectionsData?.data)
          ? (existingSectionsData.data as Section[]).map((s) => s.id)
          : []
      );

      // Determine if CSV has section columns
      const headerKeys = Object.keys(rows[0] || {});
      let hasSectionColumns = headerKeys.includes("sectionName");
      if (mode === "QUESTIONS_ONLY") hasSectionColumns = false;
      if (mode === "SECTIONS_AND_QUESTIONS") hasSectionColumns = true;
      const fallbackSectionName = "__NO_SECTION__";

      if (!hasSectionColumns) {
        // Must select an existing section; do not create sections
        if (!targetSectionId) {
          setIsProcessing(false);
          alert("Please select a target section for these questions.");
          return;
        }
      }

      // Step 1: Get/create all sections first
      const validRows: Array<{ row: TestBulkCsvRow; index: number }> = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (rowErrors[i]?.length) {
          failed++;
          continue;
        }
        const sectionKey = hasSectionColumns
          ? (row.sectionName || "").trim()
          : fallbackSectionName;
        if (!sectionKey) {
          failed++;
          continue;
        }

        if (hasSectionColumns) {
          let sectionId = sectionIdByName.get(sectionKey);
          if (!sectionId) {
            sectionId = await getOrCreateSectionId(
              sectionKey,
              row.sectionName,
              row.sectionDescription,
              row.sectionDisplayOrder
                ? Number(row.sectionDisplayOrder)
                : undefined
            );
            sectionIdByName.set(sectionKey, sectionId);
            // Check if this is a newly created section
            if (!beforeSectionIds.has(sectionId)) {
              createdSections += 1;
            }
          }
        } else {
          // For no-section CSV, map all to the chosen section
          if (!sectionIdByName.has(sectionKey)) {
            sectionIdByName.set(sectionKey, targetSectionId);
          }
        }

        validRows.push({ row, index: i });
      }

      // Step 2: Group questions by section ID
      const questionsBySection = new Map<
        string,
        Array<{
          text: string;
          imageUrl?: string;
          type: QuestionType;
          difficulty: DifficultyLevel;
          marks: number;
          negativeMarks: number;
          explanation?: string;
          options?: Array<{ text: string; isCorrect: boolean }>;
        }>
      >();

      for (const { row, index } of validRows) {
        const sectionKey = hasSectionColumns
          ? (row.sectionName || "").trim()
          : fallbackSectionName;
        const sectionId = sectionIdByName.get(sectionKey);
        if (!sectionId) continue;

        const type = (row.questionType || "").toUpperCase() as QuestionType;
        const difficulty = (
          row.difficulty || ""
        ).toUpperCase() as DifficultyLevel;
        const marks = Number(row.marks);
        const negativeMarks = row.negativeMarks ? Number(row.negativeMarks) : 0;

        let options: Array<{ text: string; isCorrect: boolean }> | undefined =
          undefined;
        if (type === "MCQ") {
          const correctSet = new Set(
            (row.correctOptions || "")
              .split(/\s*,\s*/)
              .map((s) => s.trim().toUpperCase())
          );
          const optTexts = [row.optionA, row.optionB, row.optionC, row.optionD];
          options = optTexts
            .map((text, idx) => ({
              text: text || "",
              isCorrect: correctSet.has(String.fromCharCode(65 + idx)),
            }))
            .filter((o) => o.text.trim());
        } else if (type === "TRUE_FALSE") {
          const correct = normalizeBoolean(row.correctOptions);
          options = [
            { text: "True", isCorrect: correct === true },
            { text: "False", isCorrect: correct === false },
          ];
        }

        const questionData = {
          text: row.questionText,
          imageUrl: row.questionImageUrl || undefined,
          type,
          difficulty,
          marks,
          negativeMarks,
          explanation: row.explanation || undefined,
          options,
        };

        if (!questionsBySection.has(sectionId)) {
          questionsBySection.set(sectionId, []);
        }
        questionsBySection.get(sectionId)!.push(questionData);
      }

      // Step 3: Bulk create questions for each section
      for (const [sectionId, questions] of questionsBySection.entries()) {
        try {
          await bulkCreateQuestionsMutation.mutateAsync({
            sectionId,
            questions,
          });
          createdQuestions += questions.length;
        } catch (_error) {
          // If bulk creation fails, count all questions in that section as failed
          failed += questions.length;
        }
      }

      setResult({ createdSections, createdQuestions, failed });
      setStep(3);
      onSuccess?.();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setSelectedFile(null);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === "SECTIONS_AND_QUESTIONS"
              ? "Bulk Upload: Sections + Questions"
              : mode === "QUESTIONS_ONLY"
              ? "Bulk Upload: Questions Only"
              : "Import Questions via CSV"}
          </DialogTitle>
          <DialogDescription>
            {mode === "SECTIONS_AND_QUESTIONS"
              ? "Upload a CSV that contains section columns to create sections and their questions."
              : mode === "QUESTIONS_ONLY"
              ? "Upload a CSV without section columns to add questions into a selected section."
              : "Upload a CSV to create multiple sections and questions in one go."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 flex-1 overflow-y-auto pr-1">
          <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
            <div className="text-sm">
              <div className="font-medium">CSV Template</div>
              <div className="text-muted-foreground">
                Download and fill the sample
              </div>
            </div>
            <a href="/csv-templates/test-bulk-questions.csv" download>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </a>
          </div>

          {step === 1 && (
            <div className="space-y-2">
              <Label htmlFor="csvFile">CSV File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleSelectFile}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" /> Choose
                </Button>
              </div>
              {selectedFile && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Badge variant="outline">{selectedFile.name}</Badge>
                  <span>({Math.round(selectedFile.size / 1024)} KB)</span>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {/* If CSV has no section columns, require selecting target section */}
              {(mode === "QUESTIONS_ONLY" ||
                (rows.length > 0 && !("sectionName" in (rows[0] || {})))) && (
                <div className="space-y-2 p-3 border rounded-md bg-muted/30">
                  <Label>Target Section</Label>
                  <Select
                    value={targetSectionId}
                    onValueChange={(v) => setTargetSectionId(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Array.isArray(existingSectionsData?.data)
                        ? (existingSectionsData?.data as Section[])
                        : []
                      ).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {rowErrors[-1] ? (
                <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/30 bg-destructive/10">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium mb-1">CSV Errors</div>
                    <ul className="list-disc pl-5 text-destructive">
                      {rowErrors[-1].map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto overflow-x-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="text-left p-2">#</th>
                        <th className="text-left p-2">Section</th>
                        <th className="text-left p-2">Question</th>
                        <th className="text-left p-2">Type</th>
                        <th className="text-left p-2">Diff</th>
                        <th className="text-left p-2">Marks</th>
                        <th className="text-left p-2">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 align-top">{i + 1}</td>
                          <td className="p-2 align-top">{r.sectionName}</td>
                          <td className="p-2 align-top max-w-[320px] truncate">
                            {r.questionText}
                          </td>
                          <td className="p-2 align-top">{r.questionType}</td>
                          <td className="p-2 align-top">{r.difficulty}</td>
                          <td className="p-2 align-top">{r.marks}</td>
                          <td className="p-2 align-top">
                            {rowErrors[i]?.length ? (
                              <ul className="list-disc pl-5 text-destructive">
                                {rowErrors[i].map((e, idx) => (
                                  <li key={idx}>{e}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="inline-flex items-center text-emerald-600">
                                <CheckCircle2 className="h-4 w-4 mr-1" /> OK
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {step === 3 && result && (
            <div className="space-y-3">
              <div className="p-3 rounded-md border bg-muted/30">
                <div className="text-sm font-medium mb-2">Import Summary</div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    Sections created:{" "}
                    <span className="font-semibold">
                      {result.createdSections}
                    </span>
                  </div>
                  <div>
                    Questions created:{" "}
                    <span className="font-semibold">
                      {result.createdQuestions}
                    </span>
                  </div>
                  <div>
                    Failed rows:{" "}
                    <span className="font-semibold">{result.failed}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 1 && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleReadAndPreview} disabled={!selectedFile}>
                Continue
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={isProcessing}
              >
                Back
              </Button>
              <Button
                onClick={runImport}
                disabled={
                  !!rowErrors[-1] ||
                  isProcessing ||
                  ((mode === "QUESTIONS_ONLY" ||
                    (rows.length > 0 && !("sectionName" in (rows[0] || {})))) &&
                    !targetSectionId)
                }
              >
                {isProcessing ? "Importing..." : "Start Import"}
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  setSelectedFile(null);
                  setRows([]);
                  setRowErrors({});
                  setResult(null);
                  setStep(1);
                }}
              >
                Close
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
