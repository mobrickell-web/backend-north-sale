import { BadRequestException, Injectable } from "@nestjs/common";

export type AssessmentQuestion = {
  id: string;
  prompt: string;
  type: string;
  required: boolean;
  options?: string[];
  helperText?: string;
  lowLabel?: string;
  highLabel?: string;
};

export type AssessmentSection = {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  questions: AssessmentQuestion[];
};

export type AssessmentDocument = {
  resultText: string;
  settings: { introduction: string; allowRetake: boolean };
  sections: AssessmentSection[];
};

/** Raw UI answers: scale 1–10, five-point 1–5, yes-no boolean/string, mc index, short-answer string. */
export type RawAnswers = Record<string, number | string | boolean>;

export type ClientSafeResult = {
  overallScore: number;
  sectionBreakdowns: Array<{
    id: string;
    number: string;
    title: string;
    description?: string;
    score: number;
    hasScores: boolean;
  }>;
  scoredQuestions: Array<{
    id: string;
    number: number;
    prompt: string;
    sectionId: string;
    sectionTitle: string;
    score: number;
  }>;
  review: Array<{
    id: string;
    number: number;
    prompt: string;
    sectionTitle: string;
    score: number;
  }>;
  allSame: boolean;
  resultText: string;
};

const CLOSER_REVIEW_MAX_SCORE = 7;

@Injectable()
export class AssessmentScoringService {
  scoreDocument(
    document: AssessmentDocument,
    rawAnswers: RawAnswers,
  ): ClientSafeResult {
    this.assertRequiredAnswered(document, rawAnswers);

    const flattened = this.flattenQuestions(document.sections);
    const normalizedScores: Record<string, number> = {};

    for (const question of flattened) {
      const raw = rawAnswers[question.id];
      if (raw === undefined || raw === null || raw === "") continue;
      if (question.type === "short-answer") continue;
      const score = this.normalizeScore(question, raw);
      if (score !== null) normalizedScores[question.id] = score;
    }

    const sectionBreakdowns = document.sections.map((section, index) => {
      const sectionScaleQuestions = section.questions.filter(
        (q) =>
          q.type === "scale" ||
          q.type === "five-point-scale" ||
          q.type === "yes-no",
      );
      const sectionScores = sectionScaleQuestions
        .map((q) => normalizedScores[q.id])
        .filter((s): s is number => s != null);

      return {
        id: section.id,
        number: String(index + 1).padStart(2, "0"),
        title: section.title,
        description: section.description,
        score: this.average(sectionScores),
        hasScores: sectionScores.length > 0,
      };
    });

    const scoredQuestions = flattened
      .filter((q) => normalizedScores[q.id] != null)
      .map((q) => ({
        id: q.id,
        number: q.number,
        prompt: q.prompt,
        sectionId: q.sectionId,
        sectionTitle: q.sectionTitle,
        score: normalizedScores[q.id],
      }));

    const totalScoredPoints = scoredQuestions.reduce(
      (sum, item) => sum + item.score,
      0,
    );
    const maxScoredPoints = scoredQuestions.length * 10;
    const overallScore =
      maxScoredPoints > 0
        ? Math.round((totalScoredPoints / maxScoredPoints) * 100)
        : 0;

    const sorted = [...scoredQuestions].sort((a, b) =>
      a.score !== b.score ? a.score - b.score : a.number - b.number,
    );
    const allSame =
      sorted.length > 1 && sorted[0].score === sorted[sorted.length - 1].score;

    let review: ClientSafeResult["review"] = [];
    if (!allSame && sorted.length > 0) {
      const thirdLowest =
        sorted.length >= 3 ? sorted[2].score : sorted[sorted.length - 1].score;
      review = scoredQuestions
        .filter(
          (item) =>
            item.score <= thirdLowest && item.score <= CLOSER_REVIEW_MAX_SCORE,
        )
        .sort((a, b) =>
          a.score !== b.score ? a.score - b.score : a.number - b.number,
        )
        .map((item) => ({
          id: item.id,
          number: item.number,
          prompt: item.prompt,
          sectionTitle: item.sectionTitle,
          score: item.score,
        }));
    }

    return {
      overallScore,
      sectionBreakdowns,
      scoredQuestions,
      review,
      allSame,
      resultText: document.resultText ?? "",
    };
  }

  /** Client GET edition: questions + settings/resultText only (no scoring config). */
  toClientDocument(document: AssessmentDocument): AssessmentDocument {
    return {
      resultText: document.resultText ?? "",
      settings: {
        introduction: document.settings?.introduction ?? "",
        allowRetake: Boolean(document.settings?.allowRetake),
      },
      sections: (document.sections ?? []).map((section) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        instructions: section.instructions,
        questions: (section.questions ?? []).map((question) => ({
          id: question.id,
          prompt: question.prompt,
          type: question.type,
          required: Boolean(question.required),
          helperText: question.helperText,
          lowLabel: question.lowLabel,
          highLabel: question.highLabel,
          options: question.options,
        })),
      })),
    };
  }

  parseDocument(raw: unknown): AssessmentDocument {
    if (!raw || typeof raw !== "object") {
      throw new BadRequestException("Assessment document is invalid");
    }
    const doc = raw as AssessmentDocument;
    if (!Array.isArray(doc.sections)) {
      throw new BadRequestException("Assessment document is invalid");
    }
    return doc;
  }

  private assertRequiredAnswered(
    document: AssessmentDocument,
    rawAnswers: RawAnswers,
  ): void {
    for (const section of document.sections) {
      for (const question of section.questions) {
        if (!question.required) continue;
        const value = rawAnswers[question.id];
        if (question.type === "short-answer") {
          if (typeof value !== "string" || !value.trim()) {
            throw new BadRequestException(
              `Missing required answer for question ${question.id}`,
            );
          }
          continue;
        }
        if (value === undefined || value === null || value === "") {
          throw new BadRequestException(
            `Missing required answer for question ${question.id}`,
          );
        }
      }
    }
  }

  private normalizeScore(
    question: AssessmentQuestion,
    raw: number | string | boolean,
  ): number | null {
    switch (question.type) {
      case "scale": {
        const value = Number(raw);
        if (!Number.isInteger(value) || value < 1 || value > 10) {
          throw new BadRequestException(
            `Invalid scale answer for ${question.id}`,
          );
        }
        return value;
      }
      case "five-point-scale": {
        const value = Number(raw);
        if (!Number.isInteger(value) || value < 1 || value > 5) {
          throw new BadRequestException(
            `Invalid five-point answer for ${question.id}`,
          );
        }
        return value * 2;
      }
      case "yes-no": {
        if (raw === true || raw === "yes" || raw === "Yes" || raw === 1) {
          return 10;
        }
        if (raw === false || raw === "no" || raw === "No" || raw === 0) {
          return 1;
        }
        throw new BadRequestException(
          `Invalid yes-no answer for ${question.id}`,
        );
      }
      case "multiple-choice": {
        const index = Number(raw);
        const options = question.options ?? [];
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index >= options.length ||
          options.length === 0
        ) {
          throw new BadRequestException(
            `Invalid multiple-choice answer for ${question.id}`,
          );
        }
        return Math.round(((index + 1) / options.length) * 10);
      }
      default:
        return null;
    }
  }

  private flattenQuestions(sections: AssessmentSection[]) {
    const out: Array<
      AssessmentQuestion & {
        number: number;
        sectionId: string;
        sectionTitle: string;
      }
    > = [];
    let number = 1;
    for (const section of sections) {
      for (const question of section.questions ?? []) {
        out.push({
          ...question,
          number,
          sectionId: section.id,
          sectionTitle: section.title,
        });
        number += 1;
      }
    }
    return out;
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
}
