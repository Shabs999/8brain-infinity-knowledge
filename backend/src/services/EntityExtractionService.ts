import { aiModelService, AIModel } from './AIModelService';

// Types for extracted entities
export interface ExtractedEntity {
  name: string;
  type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'DATE' | 'PRODUCT' | 'EVENT' | 'CONCEPT';
  description?: string;
  aliases?: string[];
  confidence: number; // 0.0 to 1.0
  positions: number[]; // Character positions in text where entity appears
  metadata?: Record<string, any>;
}

export interface ExtractedConcept {
  name: string;
  description: string;
  category: string; // 'Technology', 'Science', 'Business', etc.
  importance: number; // 0.0 to 1.0
  confidence: number;
  relatedTerms: string[];
}

export interface ExtractedRelationship {
  from: string; // Entity/concept name
  to: string;   // Entity/concept name
  type: 'MENTIONS' | 'RELATES_TO' | 'DEFINES' | 'CAUSES' | 'ENABLES' | 'PART_OF';
  context: string; // Context where relationship was found
  confidence: number;
}

export interface ExtractedTerm {
  value: string;
  definition?: string;
  domain: string;
  importance: number;
  frequency: number;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  concepts: ExtractedConcept[];
  relationships: ExtractedRelationship[];
  terms: ExtractedTerm[];
  summary: string;
  processingTime: number;
  cost: number;
}

export class EntityExtractionService {
  private model: AIModel = AIModel.GPT_4; // Use GPT-4 for better extraction

  /**
   * Extract entities, concepts, and relationships from document text
   */
  async extractFromDocument(
    documentText: string,
    documentTitle?: string,
    options: {
      maxEntities?: number;
      maxConcepts?: number;
      maxRelationships?: number;
      model?: AIModel;
    } = {}
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    
    const {
      maxEntities = 50,
      maxConcepts = 20,
      maxRelationships = 30,
      model = this.model
    } = options;

    try {
      // Step 1: Extract entities
      console.log('🔍 Extracting entities...');
      const entities = await this.extractEntities(documentText, documentTitle, maxEntities, model);
      
      // Step 2: Extract concepts
      console.log('💡 Extracting concepts...');
      const concepts = await this.extractConcepts(documentText, documentTitle, maxConcepts, model);
      
      // Step 3: Extract relationships
      console.log('🔗 Extracting relationships...');
      const relationships = await this.extractRelationships(
        documentText, 
        [...entities.map(e => e.name), ...concepts.map(c => c.name)],
        maxRelationships,
        model
      );
      
      // Step 4: Extract key terms
      console.log('📝 Extracting key terms...');
      const terms = await this.extractTerms(documentText, documentTitle, model);
      
      // Step 5: Generate summary
      console.log('📄 Generating summary...');
      const summary = await this.generateSummary(documentText, documentTitle, model);

      const processingTime = Date.now() - startTime;
      const cost = this.estimateCost(documentText.length, model);

      return {
        entities,
        concepts,
        relationships,
        terms,
        summary,
        processingTime,
        cost
      };

    } catch (error) {
      console.error('❌ Entity extraction failed:', error);
      throw new Error(`Entity extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract named entities from text
   */
  private async extractEntities(
    text: string,
    title?: string,
    maxEntities = 50,
    model = this.model
  ): Promise<ExtractedEntity[]> {
    const prompt = `Extract named entities from the following document. Return a JSON array of entities with the specified format.

Document Title: ${title || 'Unknown'}

Document Text:
${this.truncateText(text, 8000)}

Extract up to ${maxEntities} entities. For each entity, provide:
- name: The entity name
- type: One of PERSON, ORGANIZATION, LOCATION, DATE, PRODUCT, EVENT, CONCEPT
- description: Brief description of the entity
- confidence: Confidence score 0.0-1.0
- aliases: Alternative names/spellings (if any)

Return ONLY a valid JSON array:`;

    const response = await aiModelService.generateCompletion({
      prompt,
      model,
      temperature: 0.3,
      maxTokens: 2000,
      systemPrompt: 'You are an expert entity extraction system. Return only valid JSON arrays without additional text.'
    });

    try {
      const entities = JSON.parse(response.content);
      return this.validateEntities(entities);
    } catch (error) {
      console.warn('Failed to parse entities JSON, attempting fallback parsing');
      return this.fallbackEntityParsing(response.content);
    }
  }

  /**
   * Extract concepts from text
   */
  private async extractConcepts(
    text: string,
    title?: string,
    maxConcepts = 20,
    model = this.model
  ): Promise<ExtractedConcept[]> {
    const prompt = `Extract key concepts and topics from the following document. Return a JSON array of concepts.

Document Title: ${title || 'Unknown'}

Document Text:
${this.truncateText(text, 8000)}

Extract up to ${maxConcepts} concepts. For each concept, provide:
- name: The concept name
- description: Detailed description
- category: Category (Technology, Science, Business, Arts, etc.)
- importance: Importance score 0.0-1.0
- confidence: Confidence score 0.0-1.0
- relatedTerms: Array of related terms

Focus on substantive concepts rather than simple keywords.

Return ONLY a valid JSON array:`;

    const response = await aiModelService.generateCompletion({
      prompt,
      model,
      temperature: 0.3,
      maxTokens: 2000,
      systemPrompt: 'You are an expert concept extraction system. Return only valid JSON arrays without additional text.'
    });

    try {
      const concepts = JSON.parse(response.content);
      return this.validateConcepts(concepts);
    } catch (error) {
      console.warn('Failed to parse concepts JSON, attempting fallback parsing');
      return this.fallbackConceptParsing(response.content);
    }
  }

  /**
   * Extract relationships between entities and concepts
   */
  private async extractRelationships(
    text: string,
    entitiesAndConcepts: string[],
    maxRelationships = 30,
    model = this.model
  ): Promise<ExtractedRelationship[]> {
    if (entitiesAndConcepts.length < 2) return [];

    const prompt = `Analyze relationships between the following entities and concepts in the given text.

Entities and Concepts: ${entitiesAndConcepts.slice(0, 30).join(', ')}

Document Text:
${this.truncateText(text, 6000)}

Extract up to ${maxRelationships} relationships. For each relationship, provide:
- from: Source entity/concept name
- to: Target entity/concept name
- type: One of MENTIONS, RELATES_TO, DEFINES, CAUSES, ENABLES, PART_OF
- context: Brief context explaining the relationship
- confidence: Confidence score 0.0-1.0

Only include relationships that are explicitly mentioned or strongly implied in the text.

Return ONLY a valid JSON array:`;

    const response = await aiModelService.generateCompletion({
      prompt,
      model,
      temperature: 0.2,
      maxTokens: 1500,
      systemPrompt: 'You are an expert relationship extraction system. Return only valid JSON arrays without additional text.'
    });

    try {
      const relationships = JSON.parse(response.content);
      return this.validateRelationships(relationships, entitiesAndConcepts);
    } catch (error) {
      console.warn('Failed to parse relationships JSON, returning empty array');
      return [];
    }
  }

  /**
   * Extract key terms and their definitions
   */
  private async extractTerms(
    text: string,
    title?: string,
    model = this.model
  ): Promise<ExtractedTerm[]> {
    const prompt = `Extract key technical terms, jargon, and domain-specific vocabulary from the document.

Document Title: ${title || 'Unknown'}

Document Text:
${this.truncateText(text, 6000)}

For each term, provide:
- value: The term itself
- definition: Definition or explanation (if available in text)
- domain: Field or domain (e.g., "Computer Science", "Medicine", "Business")
- importance: Importance score 0.0-1.0
- frequency: Estimated frequency in the document

Return ONLY a valid JSON array:`;

    const response = await aiModelService.generateCompletion({
      prompt,
      model,
      temperature: 0.3,
      maxTokens: 1000,
      systemPrompt: 'You are an expert terminology extraction system. Return only valid JSON arrays without additional text.'
    });

    try {
      const terms = JSON.parse(response.content);
      return this.validateTerms(terms);
    } catch (error) {
      console.warn('Failed to parse terms JSON, returning empty array');
      return [];
    }
  }

  /**
   * Generate a comprehensive summary for the document
   */
  private async generateSummary(
    text: string,
    title?: string,
    model = this.model
  ): Promise<string> {
    const response = await aiModelService.summarizeDocument({
      documentText: this.truncateText(text, 10000),
      documentTitle: title || 'Unknown Document',
      model,
      summaryLength: 'medium',
      prompt: ''
    });

    return response.content;
  }

  // Validation and utility methods
  private validateEntities(entities: any[]): ExtractedEntity[] {
    return entities.filter(e => 
      e.name && 
      e.type && 
      ['PERSON', 'ORGANIZATION', 'LOCATION', 'DATE', 'PRODUCT', 'EVENT', 'CONCEPT'].includes(e.type)
    ).map(e => ({
      name: e.name,
      type: e.type,
      description: e.description || '',
      aliases: e.aliases || [],
      confidence: Math.min(Math.max(e.confidence || 0.5, 0), 1),
      positions: e.positions || [],
      metadata: e.metadata || {}
    }));
  }

  private validateConcepts(concepts: any[]): ExtractedConcept[] {
    return concepts.filter(c => c.name && c.description).map(c => ({
      name: c.name,
      description: c.description,
      category: c.category || 'General',
      importance: Math.min(Math.max(c.importance || 0.5, 0), 1),
      confidence: Math.min(Math.max(c.confidence || 0.5, 0), 1),
      relatedTerms: c.relatedTerms || []
    }));
  }

  private validateRelationships(relationships: any[], validEntities: string[]): ExtractedRelationship[] {
    const validEntitySet = new Set(validEntities.map(e => e.toLowerCase()));
    
    return relationships.filter(r => 
      r.from && 
      r.to && 
      r.type &&
      validEntitySet.has(r.from.toLowerCase()) &&
      validEntitySet.has(r.to.toLowerCase()) &&
      ['MENTIONS', 'RELATES_TO', 'DEFINES', 'CAUSES', 'ENABLES', 'PART_OF'].includes(r.type)
    ).map(r => ({
      from: r.from,
      to: r.to,
      type: r.type,
      context: r.context || '',
      confidence: Math.min(Math.max(r.confidence || 0.5, 0), 1)
    }));
  }

  private validateTerms(terms: any[]): ExtractedTerm[] {
    return terms.filter(t => t.value).map(t => ({
      value: t.value,
      definition: t.definition || '',
      domain: t.domain || 'General',
      importance: Math.min(Math.max(t.importance || 0.5, 0), 1),
      frequency: Math.max(t.frequency || 1, 1)
    }));
  }

  private fallbackEntityParsing(content: string): ExtractedEntity[] {
    // Simple fallback parsing if JSON fails
    const lines = content.split('\n').filter(line => line.trim());
    return lines.slice(0, 20).map((line) => ({
      name: line.trim(),
      type: 'CONCEPT' as const,
      description: '',
      aliases: [],
      confidence: 0.3,
      positions: [],
      metadata: {}
    }));
  }

  private fallbackConceptParsing(content: string): ExtractedConcept[] {
    // Simple fallback parsing if JSON fails
    const lines = content.split('\n').filter(line => line.trim());
    return lines.slice(0, 10).map((line) => ({
      name: line.trim(),
      description: 'Extracted concept',
      category: 'General',
      importance: 0.5,
      confidence: 0.3,
      relatedTerms: []
    }));
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...[truncated]';
  }

  private estimateCost(textLength: number, model: AIModel): number {
    // Rough estimation based on token count and model pricing
    const estimatedTokens = textLength / 4; // Rough token estimation
    const baseCost = model === AIModel.GPT_4 ? 0.03 : 0.002; // Per 1k tokens
    return (estimatedTokens / 1000) * baseCost;
  }
}

// Export singleton instance
export const entityExtractionService = new EntityExtractionService();