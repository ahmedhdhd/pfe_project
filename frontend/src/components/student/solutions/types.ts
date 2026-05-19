/**
 * Type definitions for solutions components
 */

export type SolutionAnswer = {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOptionId?: string | null;
  textAnswer?: string | null;
  isCorrect: boolean;
  marksAwarded: number;
  timeSpentSeconds: number;
  isMarkedForReview: boolean;
  isSkipped: boolean;
  answeredAt: string;
  createdAt: string;
  question: {
    id: string;
    sectionId: string;
    organizationId: string;
    text: string;
    imageUrl?: string | null;
    type: string;
    difficulty?: string;
    marks: number;
    negativeMarks: number;
    explanation?: string;
    explanationImageUrl?: string | null;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
    options: Array<{
      id: string;
      questionId: string;
      text: string;
      imageUrl?: string | null;
      displayOrder: number;
      isCorrect: boolean;
      createdAt: string;
    }>;
  };
  selectedOption?: {
    id: string;
    questionId: string;
    text: string;
    imageUrl?: string | null;
    displayOrder: number;
    isCorrect: boolean;
    createdAt: string;
  } | null;
};

