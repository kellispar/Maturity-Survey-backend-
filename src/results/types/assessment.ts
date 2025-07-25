export type AssessmentResult = {
  category: string;
  maturityLevel: string;
};

export type AssessmentPDF = {
  assessmentResults: AssessmentResult[];
  overallScore: number;
  rationale: string;
  surveyName: string;
};
