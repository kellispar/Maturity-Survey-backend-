import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { BaseAiService, PromptOptions, SurveyData } from '../base-ai.service';

@Injectable()
export class OpenAiService extends BaseAiService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    super();
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Implementation of the abstract generateText method for OpenAI
   */
  async generateText(prompt: string, options?: PromptOptions): Promise<string> {
    try {
      this.logger.log('Generating text with Google GenAI');

      const response = await this.openai.responses.create({
        model: options?.model || 'gpt-4o-mini',
        input: prompt,
        temperature: options?.temperature || 0.5,
        max_output_tokens: options?.maxTokens || 1000,
      });

      return response.output_text || '';
    } catch (error) {
      this.logger.error('Error generating text with OpenAI', error);
      throw new Error(`Failed to generate text with OpenAI: ${error}`);
    }
  }

  /**
   * Generate Mermaid diagram with specific OpenAI optimizations
   */
  async generateOptimizedMermaidDiagram(
    surveySummaryResult: string,
  ): Promise<string> {
    const options: PromptOptions = {
      model: 'gpt-4o-mini',
      temperature: 0.1, // Lower temperature for more consistent diagram syntax
      maxTokens: 800,
    };
    return this.generateMermaidDiagram(surveySummaryResult, options);
  }

  /**
   * Generate comprehensive analysis with Google GenAI's strengths
   */
  async generateDetailedAnalysis(surveyData: SurveyData): Promise<string> {
    const options: PromptOptions = {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 2000,
    };
    return this.generateRecommendations(surveyData, options);
  }
}
