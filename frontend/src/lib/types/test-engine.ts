export type EngineQuestion = {
  id: string;
  text: string;
  type: "MCQ" | "TRUE_FALSE" | "NUMERICAL" | "FILL_BLANK";
  options?: Array<{
    id: string;
    text: string;
    isCorrect?: boolean;
    imageUrl?: string;
  }>;
  imageUrl?: string;
  marks: number;
  negativeMarks: number;
};

export type EngineSection = {
  id: string;
  name: string;
  questions: EngineQuestion[];
};

export type TestData = {
  durationMinutes: number;
  sections: EngineSection[];
};
