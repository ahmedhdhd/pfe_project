const QUIZ_OPTION_IDS = new Set(['a', 'b', 'c', 'd']);

export function validateGeneratedAssignmentQuestion(question: {
  type: string;
  options: unknown[];
  correctAnswer: Record<string, unknown>;
}): string | null {
  if (question.type === 'QUIZ') {
    const options = question.options;
    if (options.length < 2) {
      return 'QUIZ questions must have at least 2 options';
    }
    const optionIds = options.map((opt: any) => String(opt?.id || '').toLowerCase());
    if (!optionIds.every((id) => QUIZ_OPTION_IDS.has(id) || id.length > 0)) {
      return 'QUIZ options must have valid ids';
    }
    const correctOptionId = String(question.correctAnswer.optionId || '');
    if (!optionIds.includes(correctOptionId)) {
      return 'QUIZ correctAnswer.optionId must match an option id';
    }
    return null;
  }

  if (question.type === 'TRUE_FALSE') {
    if (typeof question.correctAnswer.value !== 'boolean') {
      return 'TRUE_FALSE correctAnswer.value must be a boolean';
    }
    return null;
  }

  if (question.type === 'SHORT_ANSWER') {
    const text = String(question.correctAnswer.text || '').trim();
    if (!text) {
      return 'SHORT_ANSWER correctAnswer.text is required';
    }
    return null;
  }

  return null;
}
