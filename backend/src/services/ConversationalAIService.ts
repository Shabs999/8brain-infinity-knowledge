import { AIModel, AIModelService } from './AIModelService';

// Conversation message interface
export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    graphResults?: any;
    processingTime?: number;
    model?: string;
  };
}

// Conversation context interface
export interface ConversationContext {
  sessionId: string;
  userId?: string | undefined;
  messages: ConversationMessage[];
  lastGraphResults?: any;
  lastQuery?: string;
  preferences?: {
    primaryModel: AIModel;
    fallbackModel: AIModel;
    temperature: number;
    maxTokens: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// AI response with conversation context
export interface ConversationalResponse {
  response: string;
  model: AIModel;
  confidence: number;
  followUpSuggestions: string[];
  graphContext?: {
    relevantConcepts: string[];
    relatedDocuments: string[];
    suggestedQueries: string[];
  };
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
  processingTime: number;
}

export class ConversationalAIService {
  private aiModelService: AIModelService;
  private conversations: Map<string, ConversationContext> = new Map();
  private readonly MAX_CONTEXT_MESSAGES = 10; // Keep last 10 exchanges
  private readonly CONTEXT_CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.aiModelService = new AIModelService();
    this.startContextCleanup();
  }

  /**
   * Process a voice query with conversational AI
   */
  async processVoiceQuery(
    query: string,
    graphResults: any,
    sessionId: string,
    userId?: string
  ): Promise<ConversationalResponse> {
    const startTime = Date.now();
    
    console.log(`🤖 Processing conversational AI query: "${query}"`);
    
    // Get or create conversation context
    let context = this.conversations.get(sessionId);
    if (!context) {
      context = this.createNewConversation(sessionId, userId);
    }

    // Add user message to conversation
    context.messages.push({
      role: 'user',
      content: query,
      timestamp: new Date(),
      metadata: { graphResults }
    });

    // Store graph results for context
    context.lastGraphResults = graphResults;
    context.lastQuery = query;
    context.updatedAt = new Date();

    try {
      // Generate AI response with conversation context
      const aiResponse = await this.generateContextualResponse(context, graphResults);
      
      // Add AI response to conversation
      context.messages.push({
        role: 'assistant',
        content: aiResponse.response,
        timestamp: new Date(),
        metadata: {
          model: aiResponse.model,
          processingTime: aiResponse.processingTime
        }
      });

      // Trim conversation to keep memory manageable
      this.trimConversationHistory(context);

      // Update conversation in memory
      this.conversations.set(sessionId, context);

      return {
        ...aiResponse,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Conversational AI error:', error);
      
      // Fallback response  
      return {
        response: this.generateSmartFallbackResponse(query, graphResults),
        model: AIModel.GPT_3_5_TURBO,
        confidence: 0.5,
        followUpSuggestions: this.generateBasicFollowUps(query, graphResults),
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 },
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Generate contextual AI response using hybrid OpenAI + Claude approach
   */
  private async generateContextualResponse(
    context: ConversationContext,
    graphResults: any
  ): Promise<ConversationalResponse> {
    const systemPrompt = this.buildSystemPrompt(context, graphResults);
    const conversationHistory = this.buildConversationPrompt(context);

    // Try OpenAI first (primary)
    try {
      console.log('🎯 Using OpenAI for conversational response');
      const response = await this.aiModelService.generateCompletion({
        prompt: conversationHistory,
        model: AIModel.GPT_4,
        systemPrompt,
        temperature: 0.7,
        maxTokens: 500
      });

      return {
        response: response.content,
        model: response.model,
        confidence: 0.9,
        followUpSuggestions: this.generateSmartFollowUps(context, graphResults),
        graphContext: this.extractGraphContext(graphResults),
        usage: {
          promptTokens: response.usage.promptTokens,
          completionTokens: response.usage.completionTokens,
          totalTokens: response.usage.totalTokens,
          cost: response.cost || 0
        },
        processingTime: 0 // Will be set by caller
      };

    } catch (openaiError) {
      console.warn('⚠️ OpenAI failed, trying Claude fallback:', openaiError);
      
      // Fallback to Claude
      try {
        const claudeResponse = await this.aiModelService.generateCompletion({
          prompt: conversationHistory,
          model: AIModel.CLAUDE_3_SONNET,
          systemPrompt,
          temperature: 0.7,
          maxTokens: 500
        });

        return {
          response: claudeResponse.content,
          model: claudeResponse.model,
          confidence: 0.8,
          followUpSuggestions: this.generateSmartFollowUps(context, graphResults),
          graphContext: this.extractGraphContext(graphResults),
          usage: {
            promptTokens: claudeResponse.usage.promptTokens,
            completionTokens: claudeResponse.usage.completionTokens,
            totalTokens: claudeResponse.usage.totalTokens,
            cost: claudeResponse.cost || 0
          },
          processingTime: 0
        };

      } catch (claudeError) {
        console.error('❌ Both OpenAI and Claude failed:', { openaiError, claudeError });
        throw new Error('All AI services unavailable');
      }
    }
  }

  /**
   * Build system prompt with graph context
   */
  private buildSystemPrompt(_context: ConversationContext, graphResults: any): string {
    return `You are an intelligent knowledge assistant for 8Brain, helping users explore their personal knowledge graph through natural conversation.

CONTEXT:
- User has a knowledge graph containing documents, concepts, entities, and relationships
- Current query returned ${graphResults?.totalResults || 0} results
- You can see the full conversation history
- Provide helpful, conversational responses that enhance understanding

KNOWLEDGE GRAPH RESULTS:
${this.formatGraphResultsForPrompt(graphResults)}

INSTRUCTIONS:
1. Be conversational and helpful, not robotic
2. Reference specific results from the knowledge graph
3. Explain connections between concepts when relevant
4. Suggest related questions the user might want to ask
5. If asked "tell me more", elaborate on the most recent results
6. Keep responses concise but informative (2-3 sentences max)
7. Use the user's own documents and concepts in your explanations

CONVERSATION STYLE:
- Natural and friendly
- Reference specific document titles and concepts
- Make connections explicit
- Encourage further exploration`;
  }

  /**
   * Build conversation prompt from message history
   */
  private buildConversationPrompt(context: ConversationContext): string {
    const recentMessages = context.messages.slice(-6); // Last 3 exchanges
    
    return recentMessages
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n') + '\n\nASSISTANT:';
  }

  /**
   * Format graph results for AI prompt
   */
  private formatGraphResultsForPrompt(graphResults: any): string {
    if (!graphResults || !graphResults.results) {
      return 'No specific results returned.';
    }

    const results = graphResults.results.slice(0, 3); // Top 3 results
    return results
      .map((result: any, index: number) => 
        `${index + 1}. ${result.name} (${result.type}): ${result.content?.substring(0, 150)}...`
      )
      .join('\n');
  }

  /**
   * Generate smart follow-up suggestions based on context and results
   */
  private generateSmartFollowUps(context: ConversationContext, graphResults: any): string[] {
    const suggestions: string[] = [];
    
    if (graphResults?.results?.length > 0) {
      const firstResult = graphResults.results[0];
      
      // Content-specific suggestions
      if (firstResult.type === 'document') {
        suggestions.push(`Tell me more about "${firstResult.name}"`);
        suggestions.push("What concepts are related to this document?");
        suggestions.push("Summarize the key insights from this");
      } else if (firstResult.type === 'concept') {
        suggestions.push(`How does ${firstResult.name} connect to other concepts?`);
        suggestions.push(`What documents discuss ${firstResult.name}?`);
        suggestions.push("Explain this concept in simple terms");
      }
    }

    // Context-aware suggestions
    if (context.messages.length > 2) {
      suggestions.push("What else should I know about this topic?");
      suggestions.push("Show me related documents");
    }

    // Generic helpful suggestions
    suggestions.push("What are my knowledge gaps in this area?");
    suggestions.push("Find similar concepts");

    return suggestions.slice(0, 4); // Return top 4 suggestions
  }

  /**
   * Generate basic follow-ups for fallback scenarios
   */
  private generateBasicFollowUps(_query: string, graphResults: any): string[] {
    const suggestions = [
      "Tell me more about these results",
      "What else is related to this?",
      "Show me similar concepts",
      "Explain this in more detail"
    ];

    if (graphResults?.results?.length > 0) {
      const firstResult = graphResults.results[0];
      suggestions.unshift(`Tell me about "${firstResult.name}"`);
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Extract graph context for frontend display
   */
  private extractGraphContext(graphResults: any): any {
    if (!graphResults?.results) return undefined;

    const concepts = graphResults.results
      .filter((r: any) => r.type === 'concept')
      .map((r: any) => r.name)
      .slice(0, 5);

    const documents = graphResults.results
      .filter((r: any) => r.type === 'document')
      .map((r: any) => r.name)
      .slice(0, 3);

    return {
      relevantConcepts: concepts,
      relatedDocuments: documents,
      suggestedQueries: [
        "What connects these concepts?",
        "Show me relationships between these",
        "Find patterns in this knowledge"
      ]
    };
  }

  /**
   * Generate smart fallback response based on query type
   */
  private generateSmartFallbackResponse(query: string, graphResults: any): string {
    const lowerQuery = query.toLowerCase();

    // Handle count queries
    if (lowerQuery.includes('how many') || lowerQuery.includes('count')) {
      if (graphResults?.totalNodes) {
        return `Your knowledge graph contains ${graphResults.totalNodes} total items: ${graphResults.stats?.documents || 0} documents, ${graphResults.stats?.concepts || 0} concepts, ${graphResults.stats?.entities || 0} entities, and ${graphResults.stats?.terms || 0} terms.`;
      }
      if (graphResults?.totalResults) {
        return `I found ${graphResults.totalResults} items matching your query.`;
      }
    }

    // Handle search queries  
    if (graphResults?.results?.length > 0) {
      const types = [...new Set(graphResults.results.map((r: any) => r.type))];
      return `I found ${graphResults.results.length} results including ${types.join(', ')}. ${graphResults.message || 'Would you like me to explain any of these?'}`;
    }

    // Handle explain queries
    if (graphResults?.description) {
      return `${graphResults.description} Would you like to know more about related concepts?`;
    }

    // Default fallback
    return this.generateFallbackInsight(graphResults);
  }

  /**
   * Generate fallback insight when AI is unavailable
   */
  private generateFallbackInsight(graphResults: any): string {
    if (!graphResults?.results?.length) {
      return "Try asking about specific concepts or documents in your knowledge graph.";
    }

    const types = [...new Set(graphResults.results.map((r: any) => r.type))];
    const typeText = types.join(', ');
    
    return `I found ${typeText} related to your query. Would you like me to explain any of these in more detail?`;
  }

  /**
   * Create new conversation context
   */
  private createNewConversation(sessionId: string, userId?: string): ConversationContext {
    return {
      sessionId,
      userId,
      messages: [{
        role: 'system',
        content: 'Hello! I\'m your 8Brain knowledge assistant. I can help you explore your documents and discover connections between concepts.',
        timestamp: new Date()
      }],
      preferences: {
        primaryModel: AIModel.GPT_4,
        fallbackModel: AIModel.CLAUDE_3_SONNET,
        temperature: 0.7,
        maxTokens: 500
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Trim conversation history to manage memory
   */
  private trimConversationHistory(context: ConversationContext): void {
    if (context.messages.length > this.MAX_CONTEXT_MESSAGES) {
      // Keep system message and recent exchanges
      const systemMessages = context.messages.filter(m => m.role === 'system');
      const recentMessages = context.messages
        .filter(m => m.role !== 'system')
        .slice(-this.MAX_CONTEXT_MESSAGES + systemMessages.length);
      
      context.messages = [...systemMessages, ...recentMessages];
    }
  }

  /**
   * Get conversation history for a session
   */
  getConversationHistory(sessionId: string): ConversationMessage[] {
    const context = this.conversations.get(sessionId);
    return context?.messages || [];
  }

  /**
   * Clear conversation for a session
   */
  clearConversation(sessionId: string): void {
    this.conversations.delete(sessionId);
  }

  /**
   * Periodic cleanup of old conversations
   */
  private startContextCleanup(): void {
    setInterval(() => {
      const cutoff = new Date(Date.now() - this.CONTEXT_CLEANUP_INTERVAL);
      
      for (const [sessionId, context] of this.conversations.entries()) {
        if (context.updatedAt < cutoff) {
          this.conversations.delete(sessionId);
          console.log(`🧹 Cleaned up conversation: ${sessionId}`);
        }
      }
    }, this.CONTEXT_CLEANUP_INTERVAL);
  }

  /**
   * Get service availability status
   */
  async isAvailable(): Promise<{
    openai: boolean;
    claude: boolean;
    conversationalAI: boolean;
  }> {
    const openaiAvailable = !!process.env['OPENAI_API_KEY'];
    const claudeAvailable = !!process.env['ANTHROPIC_API_KEY'];
    
    return {
      openai: openaiAvailable,
      claude: claudeAvailable,
      conversationalAI: openaiAvailable || claudeAvailable
    };
  }
}

// Export singleton instance
export const conversationalAIService = new ConversationalAIService();