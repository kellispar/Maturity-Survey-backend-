import { Injectable, Logger } from '@nestjs/common';
import { AssessmentPDF, AssessmentResult } from 'src/results/types/assessment';

export interface SurveyAnswer {
  question: {
    text: string;
    category: string;
    description?: string;
  };
  value: number;
}

export interface SurveyData {
  survey: {
    name: string;
    description?: string;
    id: number;
  };
  answers: SurveyAnswer[];
  maturityScore: number;
}

export interface PromptOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

@Injectable()
export abstract class BaseAiService {
  protected readonly logger = new Logger(BaseAiService.name);

  /**
   * Abstract method that each AI service must implement to generate text
   */
  abstract generateText(
    prompt: string,
    options?: PromptOptions,
  ): Promise<string>;

  /**
   * Generate mermaid diagram syntax from survey data
   */
  async generateMermaidDiagram(
    surveySummaryResult: string,
    options?: PromptOptions,
  ): Promise<string> {
    const prompt = this.createMermaidPrompt(surveySummaryResult);
    return this.generateText(prompt, options);
  }

  /**
   * Generate improvement recommendations from survey data
   */
  async generateRecommendations(
    surveyData: SurveyData,
    options?: PromptOptions,
  ): Promise<string> {
    const prompt = this.createRecommendationsPrompt(surveyData);
    return this.generateText(prompt, options);
  }

  /**
   * Create a prompt for generating Mermaid diagram syntax
   */
  protected createMermaidPrompt(surveySummaryResult: string): string {
    const prompt = `
    You are an expert GRC (Governance, Risk, and Compliance) process designer. Your task is to analyze a risk summary and create a simple, high-level, 3 to 4-step remediation process flow. The output must be ONLY the Mermaid.js 'graph TD' syntax. Do not include any other text, explanations, or markdown formatting.

    The process flow should represent the logical steps a company would take to address the identified weakness.

    ---
    **EXAMPLE 1**

    **Input Summary:**
    An assessment of the Third-Party Risk Management program has revealed inconsistencies in the due diligence process. This gap creates a potential for unmitigated vendor risk.

    **Desired Output:**
    graph TD
      A[Start: Review Current Process] --> B(Action: Define Standardized TPRM Framework);
      B --> C{Decision: Secure Stakeholder Approval};
      C --> D[End: Implement & Train Staff];

    ---
    **EXAMPLE 2**

    **Input Summary:**
    The assessment identified a critical gap in IT asset management. There is no central inventory of hardware, leading to security vulnerabilities and inefficient license management.

    **Desired Output:**
    graph TD
      A[Start: Identify All Data Sources] --> B(Action: Implement CMDB Discovery Tool);
      B --> C(Action: Populate & Validate Asset Inventory);
      C --> D[End: Establish Ongoing Governance];

    ---
    **ACTUAL TASK**

    **Input Summary:**

    ${surveySummaryResult}

    **Desired Output:**
    `;

    return prompt;
  }

  /**
   * Create a prompt for generating improvement recommendations
   */
  protected createRecommendationsPrompt(surveyData: SurveyData): string {
    const { survey, answers, maturityScore } = surveyData;

    const prompt = `
    You are an expert GRC (Governance, Risk, and Compliance) consultant tasked with writing a formal executive summary for a client's Integrated Risk Management (IRM) maturity assessment. Your tone must be professional, direct, and focused on business impact. The summary should be a single, concise paragraph of no more than 4 sentences.
4
    ---
    **EXAMPLE**

    **Input Data:**
    - Program: Third-Party Risk Management
    - Low-Score Finding: Inconsistent due diligence process. (Score: 2/5)

    **Desired Output:**
    An assessment of the Third-Party Risk Management program has revealed inconsistencies in the due diligence process. This gap creates a potential for unmitigated vendor risk, which could lead to operational disruptions and reputational damage. It is recommended to standardize the due diligence framework immediately.

    ---
    **ACTUAL TASK**

    **Input Data:**
    - Program: ${survey.name}
    - Overall Maturity Score: ${maturityScore}/5
    - Low-Score Findings: ${answers
        .filter((a) => a.value <= 3)
        .map(
          (a) =>
            `${a.question.text} ${a.question.description ? `${a.question.description}` : ''} (Score: ${a.value}/5)`,
        )
        .join(', ') || 'None'
      }
  `;

    return prompt;
  }

  protected generateTransitionAssessmentPrompt(
    assessmentPDF: AssessmentPDF,
  ): string {
    const { surveyName, overallScore, assessmentResults } = assessmentPDF;

    const prompt = `
      You are an expert GRC (Governance, Risk, and Compliance) consultant writing a formal assessment report. Your specialty is helping organizations transition to enterprise platforms like ServiceNow. Your tone should be professional, insightful, and prescriptive.

      You will be given a JSON object containing the results of a client's "Risk Transition Assessment," including the program name, a total score, and a list of qualitative responses.

      Your task is to generate a structured JSON response with two keys: "interpretation" and "rationale".

      1.  The **interpretation** should be a single, high-level sentence that summarizes the overall situation and states the primary recommendation.
      2.  The **rationale** should be a slightly longer, more detailed explanation (2-3 sentences). It must synthesize the qualitative responses to explain *why* the recommendation is appropriate. It should identify both the positive signs (e.g., "some automation") and the clear weaknesses (e.g., "informal oversight," "mixed reporting") to provide a balanced view.

      Here is the assessment data:
      {
        "programName": "${surveyName}",
        "totalScore": ${overallScore},
        "responses": ${JSON.stringify(this.convertToAssessmentResult(assessmentResults), null, 2)}
      }

      Based on this data, provide your response as a single, minified JSON object with the keys "interpretation" and "rationale". The JSON response should be structured as follows:
      {
        "interpretation": "Your high-level summary and primary recommendation here.",
        "rationale": "Your detailed explanation synthesizing the qualitative responses."
      }
      
      DO NOT include any other text, explanations, or markdown formatting. The output must be ONLY the JSON object, starting with a single opening curly brace and ending with a single closing curly brace.
    `;

    return prompt;
  }

  /**
   * Group answers by category for better analysis
   */
  protected groupAnswersByCategory(
    answers: SurveyAnswer[],
  ): Record<string, SurveyAnswer[]> {
    const result: Record<string, SurveyAnswer[]> = {};

    answers.forEach((answer) => {
      const category = answer.question.category;
      if (!result[category]) {
        result[category] = [];
      }
      result[category].push(answer);
    });

    return result;
  }

  /**
   * Calculate average score for a category
   */
  protected calculateCategoryAverage(categoryAnswers: SurveyAnswer[]): number {
    if (!categoryAnswers || categoryAnswers.length === 0) {
      return 0;
    }

    const sum = categoryAnswers.reduce((acc, answer) => {
      return acc + (answer.value || 0);
    }, 0);

    return sum / categoryAnswers.length;
  }

  private convertToAssessmentResult(assessmentResults: AssessmentResult[]) {
    return assessmentResults.reduce((acc, result) => {
      acc[result.category] = result.maturityLevel;
      return acc;
    }, {});
  }
}
