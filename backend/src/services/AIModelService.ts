import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Supported AI models enum
export enum AIModel {
  GPT_4 = 'gpt-4',
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_3_5_TURBO = 'gpt-3.5-turbo',
  CLAUDE_3_SONNET = 'claude-3-sonnet-20240229',
  CLAUDE_3_HAIKU = 'claude-3-haiku-20240307'
}

// Base interface for AI responses
export interface AIResponse {
  content: string;
  model: AIModel;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
}

// Base interface for AI requests
export interface AIRequest {
  prompt: string;
  model: AIModel;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  context?: string;
}

// Summarization request interface
export interface SummarizationRequest extends AIRequest {
  documentText: string;
  documentTitle?: string;
  summaryLength?: 'short' | 'medium' | 'long';
}

// Question generation request interface
export interface QuestionGenerationRequest extends AIRequest {
  documentText: string;
  documentTitle?: string;
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

// Concept extraction request interface
export interface ConceptExtractionRequest extends AIRequest {
  documentText: string;
  documentTitle?: string;
  maxConcepts?: number;
}

// AI Model Service class
export class AIModelService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;

  constructor() {
    // Initialize OpenAI if API key is available
    if (process.env['OPENAI_API_KEY']) {
      this.openai = new OpenAI({ apiKey: process.env['OPENAI_API_KEY'] });
    }

    // Initialize Anthropic if API key is available
    if (process.env['ANTHROPIC_API_KEY']) {
      this.anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });
    }
  }

  // Check if a model is available
  public isModelAvailable(model: AIModel): boolean {
    if (model.startsWith('gpt')) {
      return this.openai !== null;
    }
    if (model.startsWith('claude')) {
      return this.anthropic !== null;
    }
    return false;
  }

  // Get available models
  public getAvailableModels(): AIModel[] {
    const available: AIModel[] = [];
    
    if (this.openai) {
      available.push(AIModel.GPT_4, AIModel.GPT_4_TURBO, AIModel.GPT_3_5_TURBO);
    }
    
    if (this.anthropic) {
      available.push(AIModel.CLAUDE_3_SONNET, AIModel.CLAUDE_3_HAIKU);
    }
    
    return available;
  }

  // Generic chat completion method
  public async generateCompletion(request: AIRequest): Promise<AIResponse> {
    if (!this.isModelAvailable(request.model)) {
      throw new Error(`Model ${request.model} is not available. Missing API key.`);
    }

    if (request.model.startsWith('gpt')) {
      return this.generateOpenAICompletion(request);
    } else if (request.model.startsWith('claude')) {
      return this.generateAnthropicCompletion(request);
    }

    throw new Error(`Unsupported model: ${request.model}`);
  }

  // OpenAI completion
  private async generateOpenAICompletion(request: AIRequest): Promise<AIResponse> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized');
    }

    const messages: any[] = [];
    
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    
    if (request.context) {
      messages.push({ role: 'user', content: `Context: ${request.context}` });
    }
    
    messages.push({ role: 'user', content: request.prompt });

    const response = await this.openai.chat.completions.create({
      model: request.model,
      messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 1000,
    });

    const usage = response.usage;
    const cost = this.calculateOpenAICost(request.model, usage?.total_tokens || 0);

    return {
      content: response.choices[0]?.message?.content || '',
      model: request.model,
      usage: usage ? {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens
      } : {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      },
      cost
    };
  }

  // Anthropic completion
  private async generateAnthropicCompletion(request: AIRequest): Promise<AIResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic not initialized');
    }

    const messages: Anthropic.MessageParam[] = [];
    
    if (request.context) {
      messages.push({ role: 'user', content: `Context: ${request.context}` });
    }
    
    messages.push({ role: 'user', content: request.prompt });

    const response = await this.anthropic.messages.create({
      model: request.model,
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature || 0.7,
      ...(request.systemPrompt && { system: request.systemPrompt }),
      messages
    });

    const usage = response.usage;
    const cost = this.calculateAnthropicCost(request.model, usage.input_tokens + usage.output_tokens);

    return {
      content: response.content[0]?.type === 'text' ? response.content[0].text : '',
      model: request.model,
      usage: {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens
      },
      cost
    };
  }

  // Document Summarization
  public async summarizeDocument(request: SummarizationRequest): Promise<AIResponse> {
    const lengthInstructions = {
      short: 'in 2-3 sentences',
      medium: 'in 1-2 paragraphs (4-6 sentences)',
      long: 'in 3-4 paragraphs with key details'
    };

    const systemPrompt = `You are an expert document summarizer. Create clear, concise summaries that capture the main ideas and key points.`;
    
    const prompt = `Please summarize the following document ${lengthInstructions[request.summaryLength || 'medium']}:

Title: ${request.documentTitle || 'Untitled Document'}

Document Content:
${request.documentText}

Summary:`;

    return this.generateCompletion({
      ...request,
      prompt,
      systemPrompt,
      temperature: 0.3 // Lower temperature for more focused summaries
    });
  }

  // Question Generation
  public async generateQuestions(request: QuestionGenerationRequest): Promise<AIResponse> {
    const difficultyInstructions = {
      easy: 'basic comprehension questions that test understanding of main ideas',
      medium: 'analytical questions that require understanding of relationships and implications',
      hard: 'complex questions that require critical thinking and synthesis of multiple concepts'
    };

    const systemPrompt = `You are an expert educator who creates thoughtful questions to help people better understand and engage with content.`;
    
    const prompt = `Based on the following document, generate ${request.questionCount || 5} ${difficultyInstructions[request.difficulty || 'medium']}:

Title: ${request.documentTitle || 'Untitled Document'}

Document Content:
${request.documentText}

Please format your response as a numbered list of questions:`;

    return this.generateCompletion({
      ...request,
      prompt,
      systemPrompt,
      temperature: 0.8 // Higher temperature for more creative questions
    });
  }

  // Concept Extraction
  public async extractConcepts(request: ConceptExtractionRequest): Promise<AIResponse> {
    const systemPrompt = `You are an expert knowledge analyst who identifies and extracts key concepts, topics, and themes from documents.`;
    
    const prompt = `Analyze the following document and extract the ${request.maxConcepts || 10} most important concepts, topics, or themes. Focus on substantive ideas rather than just keywords.

Title: ${request.documentTitle || 'Untitled Document'}

Document Content:
${request.documentText}

Please format your response as a JSON array of concepts, where each concept has a "name" and "description":
[
  {
    "name": "Concept Name",
    "description": "Brief explanation of the concept and its relevance to the document"
  }
]`;

    return this.generateCompletion({
      ...request,
      prompt,
      systemPrompt,
      temperature: 0.4 // Moderate temperature for balanced extraction
    });
  }

  // Cost calculation for OpenAI models
  private calculateOpenAICost(model: AIModel, tokens: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 }, // per 1K tokens
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 }
    };

    const price = pricing[model];
    if (!price) return 0;

    // Simplified cost calculation (assumes 50/50 split input/output)
    return ((tokens / 1000) * (price.input + price.output)) / 2;
  }

  // Cost calculation for Anthropic models
  private calculateAnthropicCost(model: AIModel, tokens: number): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 }, // per 1K tokens
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 }
    };

    const price = pricing[model];
    if (!price) return 0;

    // Simplified cost calculation (assumes 50/50 split input/output)
    return ((tokens / 1000) * (price.input + price.output)) / 2;
  }

  // Health check for AI services
  public async healthCheck(): Promise<{ [key: string]: boolean }> {
    const health: { [key: string]: boolean } = {};
    
    try {
      if (this.openai) {
        // Test OpenAI connection
        await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 5
        });
        health['openai'] = true;
      } else {
        health['openai'] = false;
      }
    } catch (error) {
      health['openai'] = false;
    }

    try {
      if (this.anthropic) {
        // Test Anthropic connection
        await this.anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Hello' }]
        });
        health['anthropic'] = true;
      } else {
        health['anthropic'] = false;
      }
    } catch (error) {
      health['anthropic'] = false;
    }

    return health;
  }
}

// Export singleton instance
export const aiModelService = new AIModelService();