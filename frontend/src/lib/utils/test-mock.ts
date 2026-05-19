import { EngineSection, TestData } from "@/lib/types/test-engine";

// Returns deterministic mock test data for demos and local development
export function generateMockTest(): TestData {
  const options = ["A", "B", "C", "D"];

  // Sample questions for better mock experience
  const sampleQuestions = [
    {
      text: "What is the value of x if 2x + 5 = 15?",
      type: "MCQ" as const,
      options: ["5", "10", "15", "20"],
    },
    {
      text: "Which of the following is a prime number?",
      type: "MCQ" as const,
      options: ["4", "6", "7", "8"],
    },
    {
      text: "The speed of light in vacuum is approximately?",
      type: "MCQ" as const,
      options: ["3 × 10⁸ m/s", "3 × 10⁹ m/s", "3 × 10¹⁰ m/s", "3 × 10¹¹ m/s"],
    },
    {
      text: "What is the chemical symbol for Gold?",
      type: "MCQ" as const,
      options: ["Go", "Gd", "Au", "Ag"],
    },
    {
      text: "Fill in the blank: The capital of France is ____.",
      type: "FILL_BLANK" as const,
    },
    {
      text: "What is 15 × 8? (Enter numerical value)",
      type: "NUMERICAL" as const,
    },
    {
      text: "True or False: The Earth revolves around the Sun.",
      type: "TRUE_FALSE" as const,
      options: ["True", "False"],
    },
  ];

  const sections: EngineSection[] = Array.from({ length: 3 }).map((_, si) => ({
    id: `section-${si + 1}`,
    name: `Section ${si + 1}`,
    questions: Array.from({ length: 10 }).map((__, qi) => {
      const questionIndex = (si * 10 + qi) % sampleQuestions.length;
      const sample = sampleQuestions[questionIndex];

      return {
        id: `q-${si + 1}-${qi + 1}`,
        text: `Q${qi + 1}. ${sample.text}`,
        type: sample.type,
        imageUrl:
          qi === 0 && si === 0
            ? "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d?w=1200&q=80&auto=format&fit=crop"
            : undefined,
        options:
          sample.type === "MCQ" || sample.type === "TRUE_FALSE"
            ? (sample.options || options).map((o, oi) => ({
                id: `opt-${si}-${qi}-${oi}`,
                text: `${o}`,
                imageUrl:
                  qi === 0 && si === 0 && oi === 0
                    ? "https://images.unsplash.com/photo-1520975922203-b8ad9a8a8d2a?w=800&q=80&auto=format&fit=crop"
                    : undefined,
              }))
            : undefined,
        marks: 4,
        negativeMarks: 1,
      };
    }),
  }));
  return { durationMinutes: 60, sections };
}
