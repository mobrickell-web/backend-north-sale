export const ASSESSMENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export const ASSESSMENT_QUESTION_TYPES = [
  "scale",
  "five-point-scale",
  "yes-no",
  "short-answer",
  "multiple-choice",
] as const;

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
