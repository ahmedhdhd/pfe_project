export const TEST_BULK_QUESTIONS_CSV_HEADERS = [
  "sectionName",
  "sectionDescription",
  "sectionDisplayOrder",
  "questionDisplayOrder",
  "questionText",
  "questionImageUrl",
  "questionType",
  "difficulty",
  "marks",
  "negativeMarks",
  "explanation",
  "explanationImageUrl",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "correctOptions",
] as const;

export const ALLOWED_QUESTION_TYPES = [
  "MCQ",
  "TRUE_FALSE",
  "FILL_BLANK",
  "NUMERICAL",
] as const;

export const ALLOWED_DIFFICULTY_LEVELS = ["EASY", "MEDIUM", "HARD"] as const;

export type TestBulkCsvRow = {
  sectionName: string;
  sectionDescription?: string;
  sectionDisplayOrder?: number | string;
  questionDisplayOrder?: number | string;
  questionText: string;
  questionImageUrl?: string;
  questionType: (typeof ALLOWED_QUESTION_TYPES)[number];
  difficulty: (typeof ALLOWED_DIFFICULTY_LEVELS)[number];
  marks: number | string;
  negativeMarks?: number | string;
  explanation?: string;
  explanationImageUrl?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOptions?: string; // e.g. "A" or "A,B" or "True"
};
