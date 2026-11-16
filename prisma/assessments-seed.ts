import type { Prisma, PrismaClient } from "../src/generated/prisma/client";
import type { AssessmentStatus } from "../src/generated/prisma/enums";

/**
 * Server-side port of frontend config/admin-assessments.ts (initialAssessments)
 * and config/admin-assessment-seeds.ts (careerReadinessSections). The document
 * builder mirrors lib/admin-assessment-store.ts createInitialDocument so the
 * seeded JSONB matches what the editor produces.
 */
type SeedAssessment = {
  slug: string;
  title: string;
  status: AssessmentStatus;
  questions: number;
  sections: number;
};

type SeedSection = {
  id: string;
  title: string;
  questions: { id: string; prompt: string; type: string; required: boolean }[];
};

type SeedDocument = {
  resultText: string;
  settings: { introduction: string; allowRetake: boolean };
  sections: SeedSection[];
};

const CAREER_READINESS_SECTIONS = [
  {
    title: "Self-awareness",
    questions: [
      "I can clearly name my top three strengths.",
      "I know which kinds of work give me energy.",
      "I regularly ask for feedback on my work.",
      "I understand how my values shape my career choices.",
    ],
  },
  {
    title: "Communication",
    questions: [
      "I communicate my ideas clearly to others.",
      "I listen carefully before responding.",
      "I adapt my communication style to my audience.",
      "I feel comfortable asking questions when something is unclear.",
    ],
  },
  {
    title: "Problem solving",
    questions: [
      "I break complex challenges into manageable steps.",
      "I consider multiple options before making a decision.",
      "I use feedback to improve my approach.",
      "I stay focused when a problem is difficult.",
    ],
  },
  {
    title: "Adaptability",
    questions: [
      "I adjust quickly when priorities change.",
      "I stay open to new ways of working.",
      "I can remain productive during uncertainty.",
      "I learn from setbacks and apply those lessons.",
    ],
  },
  {
    title: "Goal setting",
    questions: [
      "I set clear goals for my professional development.",
      "I break long-term goals into practical actions.",
      "I regularly review my progress.",
      "I ask for support when I need help reaching a goal.",
    ],
  },
] as const;

const SALES_ALIGNMENT_SECTIONS = [
  {
    title: "Sales Performance",
    description: "The execution and results of your salespeople.",
    questions: [
      {
        id: "sales-target-achievement",
        prompt:
          "Our salespeople consistently meet their individual sales targets.",
      },
      {
        id: "sales-execution",
        prompt:
          "Our salespeople effectively communicate value, handle objections, and move opportunities toward a decision.",
      },
      {
        id: "prospect-follow-up",
        prompt:
          "Our salespeople consistently follow up with qualified prospects within established timeframes.",
      },
    ],
  },
  {
    title: "Sales Systems",
    description: "The processes and information supporting your team.",
    questions: [
      {
        id: "sales-process",
        prompt:
          "Our sales team consistently follows a clearly defined sales process.",
      },
      {
        id: "lead-quality",
        prompt:
          "Our lead generation efforts consistently produce opportunities that fit our target customer.",
      },
      {
        id: "crm-accuracy",
        prompt:
          "Our CRM accurately reflects the status and next steps of each sales opportunity.",
      },
      {
        id: "performance-visibility",
        prompt:
          "Our KPI dashboard makes performance problems visible early enough to take action.",
      },
    ],
  },
  {
    title: "Sales Leadership",
    description: "The coaching and accountability that sustain progress.",
    questions: [
      {
        id: "individual-coaching",
        prompt:
          "Our sales leaders regularly coach representatives based on their individual performance needs.",
      },
      {
        id: "accountability",
        prompt:
          "Our sales leaders hold team members accountable for clear expectations, agreed actions, and results.",
      },
      {
        id: "sustaining-improvements",
        prompt:
          "Our sales leaders verify that agreed improvements remain in use over time.",
      },
    ],
  },
] as const;

const INITIAL_ASSESSMENTS: SeedAssessment[] = [
  {
    slug: "career-readiness",
    title: "Career Readiness Assessment",
    status: "PUBLISHED",
    questions: 20,
    sections: 5,
  },
  {
    slug: "leadership-potential",
    title: "Leadership Potential",
    status: "DRAFT",
    questions: 12,
    sections: 4,
  },
  {
    slug: "team-wellbeing",
    title: "Team Wellbeing Check",
    status: "PUBLISHED",
    questions: 15,
    sections: 3,
  },
  {
    slug: "customer-service-skills",
    title: "Customer Service Skills",
    status: "ARCHIVED",
    questions: 18,
    sections: 4,
  },
  {
    slug: "sales-alignment",
    title: "Sales Alignment Assessment",
    status: "PUBLISHED",
    questions: 10,
    sections: 3,
  },
  {
    slug: "sales-leadership-effectiveness",
    title: "Sales Leadership Effectiveness",
    status: "ARCHIVED",
    questions: 16,
    sections: 4,
  },
  {
    slug: "team-performance-review",
    title: "Team Performance Review",
    status: "ARCHIVED",
    questions: 14,
    sections: 4,
  },
  {
    slug: "client-success-readiness",
    title: "Client Success Readiness",
    status: "ARCHIVED",
    questions: 11,
    sections: 3,
  },
  {
    slug: "sales-process-maturity",
    title: "Sales Process Maturity",
    status: "ARCHIVED",
    questions: 22,
    sections: 5,
  },
  {
    slug: "revenue-growth-planning",
    title: "Revenue Growth Planning",
    status: "ARCHIVED",
    questions: 13,
    sections: 3,
  },
];

function buildDocument(assessment: SeedAssessment): SeedDocument {
  if (assessment.slug === "sales-alignment") {
    return {
      resultText:
        "Based on your assessment of your organization’s current performance. These results identify areas for discussion and closer review; they do not independently verify performance or predict revenue growth.",
      settings: {
        introduction: "Rate your organization as it stands today.",
        allowRetake: true,
      },
      sections: SALES_ALIGNMENT_SECTIONS.map((section, sIndex) => ({
        id: `sales-alignment-section-${sIndex + 1}`,
        title: section.title,
        description: section.description,
        instructions: "",
        questions: section.questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          type: "scale",
          required: true,
          lowLabel: "Strongly disagree",
          highLabel: "Strongly agree",
        })),
      })),
    };
  }

  const sectionCount =
    assessment.slug === "career-readiness" ? 5 : assessment.sections;
  const questionsPerSection = Math.floor(assessment.questions / sectionCount);
  const extraQuestions = assessment.questions % sectionCount;

  const sections: SeedSection[] = Array.from(
    { length: sectionCount },
    (_, sectionIndex) => {
      const seed =
        assessment.slug === "career-readiness"
          ? CAREER_READINESS_SECTIONS[sectionIndex]
          : undefined;
      const title = seed?.title ?? `Section ${sectionIndex + 1}`;
      const id = `${assessment.slug}-section-${sectionIndex + 1}`;
      const questionCount =
        questionsPerSection + (sectionIndex < extraQuestions ? 1 : 0);

      return {
        id,
        title,
        questions: Array.from(
          { length: questionCount },
          (_, questionIndex) => ({
            id: `${id}-question-${questionIndex + 1}`,
            prompt:
              seed?.questions[questionIndex] ?? `Question ${questionIndex + 1}`,
            type: "scale",
            required: true,
          }),
        ),
      };
    },
  );

  return {
    resultText: "",
    settings: { introduction: "", allowRetake: false },
    sections,
  };
}

/** Idempotent by slug: existing rows are left untouched unless upgrading initial placeholder seed. */
export async function seedAssessments(prisma: PrismaClient): Promise<void> {
  for (const assessment of INITIAL_ASSESSMENTS) {
    const document = buildDocument(assessment);
    const existing = await prisma.assessment.findUnique({
      where: { slug: assessment.slug },
    });

    if (!existing) {
      await prisma.assessment.create({
        data: {
          slug: assessment.slug,
          title: assessment.title,
          status: assessment.status,
          isClientPrimary:
            assessment.slug === "sales-alignment" &&
            assessment.status === "PUBLISHED",
          document: document as unknown as Prisma.InputJsonValue,
          publishedAt: assessment.status === "PUBLISHED" ? new Date() : null,
        },
      });
    } else if (
      assessment.slug === "sales-alignment" &&
      JSON.stringify(existing.document).includes('"prompt":"Question 1"')
    ) {
      await prisma.assessment.update({
        where: { slug: assessment.slug },
        data: {
          document: document as unknown as Prisma.InputJsonValue,
        },
      });
    }
  }

  // Ensure a client-facing primary when none is set yet.
  const hasPrimary = await prisma.assessment.findFirst({
    where: { isClientPrimary: true },
    select: { id: true },
  });
  if (!hasPrimary) {
    const salesAlignment = await prisma.assessment.findFirst({
      where: { slug: "sales-alignment", status: "PUBLISHED" },
      select: { id: true },
    });
    const fallback = salesAlignment
      ? null
      : await prisma.assessment.findFirst({
          where: { status: "PUBLISHED" },
          orderBy: { updatedAt: "desc" },
          select: { id: true },
        });
    const targetId = salesAlignment?.id ?? fallback?.id;
    if (targetId) {
      await prisma.assessment.update({
        where: { id: targetId },
        data: { isClientPrimary: true },
      });
    }
  }

  console.log(
    `Assessments seeded: ${INITIAL_ASSESSMENTS.length} (idempotent by slug)`,
  );
}
