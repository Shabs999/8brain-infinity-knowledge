import { semanticSearchService } from './SemanticSearchService';
import { embeddingService } from './EmbeddingService';
import { knowledgeGraphService } from './KnowledgeGraphService';
import { entityExtractionService } from './EntityExtractionService';

// Enhanced search result that combines vector and graph information
export interface GraphRAGResult {
  id: string;
  documentId: string;
  documentName: string;
  documentType: string;
  content: string;
  score: number;
  vectorSimilarity: number;
  graphRelevance: number;
  metadata: {
    chunkIndex: number;
    textLength: number;
    createdAt: string;
    processingMethod: 'vector-only' | 'graph-enhanced' | 'graph-only';
  };
  graphContext?: {
    relatedConcepts: string[];
    relatedEntities: string[];
    relationshipTypes: string[];
    connectionPaths: Array<{
      from: string;
      to: string;
      type: string;
      confidence: number;
    }>;
  };
  highlights?: string[];
}

// Graph RAG query options
export interface GraphRAGOptions {
  useVector?: boolean;
  useGraph?: boolean;
  vectorWeight?: number; // 0.0 to 1.0 
  graphWeight?: number;  // 0.0 to 1.0
  maxResults?: number;
  graphDepth?: number;
  vectorThreshold?: number;
  graphThreshold?: number;
  userId?: string;
}

export class GraphRAGService {
  
  /**
   * Enhanced search that combines vector similarity and graph traversal
   */
  async enhancedSearch(
    query: string,
    options: GraphRAGOptions = {}
  ): Promise<{
    results: GraphRAGResult[];
    searchStats: {
      totalResults: number;
      vectorResults: number;
      graphResults: number;
      enhancedResults: number;
      processingTime: number;
      vectorTime: number;
      graphTime: number;
      mergeTime: number;
    };
  }> {
    const startTime = Date.now();
    
    const {
      useVector = true,
      useGraph = true,
      vectorWeight = 0.6,
      graphWeight = 0.4,
      maxResults = 20,
      graphDepth = 2,
      vectorThreshold = 0.5,
      userId
    } = options;

    console.log(`🔍 Graph RAG search: "${query}" (vector: ${useVector}, graph: ${useGraph})`);

    let vectorResults: any[] = [];
    let graphResults: any = null;
    let vectorTime = 0;
    let graphTime = 0;

    // Step 1: Vector search
    if (useVector && embeddingService.isAvailable()) {
      const vectorStart = Date.now();
      try {
        console.log('📊 Performing vector search...');
        const vectorResponse = await semanticSearchService.search({
          query,
          limit: maxResults * 2, // Get more results for better filtering
          threshold: vectorThreshold
        });
        vectorResults = vectorResponse.results;
        vectorTime = Date.now() - vectorStart;
        console.log(`✅ Vector search found ${vectorResults.length} results in ${vectorTime}ms`);
      } catch (error) {
        console.warn('⚠️ Vector search failed:', error);
      }
    }

    // Step 2: Graph search
    if (useGraph && await knowledgeGraphService.healthCheck()) {
      const graphStart = Date.now();
      try {
        console.log('🧠 Performing graph traversal...');
        const queryOptions: any = {
          maxDepth: graphDepth,
          limit: maxResults * 2,
          includeRelationships: true
        };
        if (userId) {
          queryOptions.userId = userId;
        }
        graphResults = await knowledgeGraphService.queryKnowledgeGraph(query, queryOptions);
        graphTime = Date.now() - graphStart;
        console.log(`✅ Graph search found ${graphResults.documents.length} documents in ${graphTime}ms`);
      } catch (error) {
        console.warn('⚠️ Graph search failed:', error);
      }
    }

    // Step 3: Merge and rank results
    const mergeStart = Date.now();
    const mergedResults = await this.mergeAndRankResults(
      query,
      vectorResults,
      graphResults,
      { vectorWeight, graphWeight, maxResults, vectorThreshold }
    );
    const mergeTime = Date.now() - mergeStart;

    const totalTime = Date.now() - startTime;

    return {
      results: mergedResults,
      searchStats: {
        totalResults: mergedResults.length,
        vectorResults: vectorResults.length,
        graphResults: graphResults?.documents.length || 0,
        enhancedResults: mergedResults.filter(r => r.metadata.processingMethod === 'graph-enhanced').length,
        processingTime: totalTime,
        vectorTime,
        graphTime,
        mergeTime
      }
    };
  }

  /**
   * Get related documents using graph traversal
   */
  async findRelatedDocuments(
    documentId: string,
    options: {
      maxDepth?: number;
      limit?: number;
      includeVector?: boolean;
      includeGraph?: boolean;
    } = {}
  ): Promise<GraphRAGResult[]> {
    const {
      maxDepth = 2,
      limit = 10,
      includeGraph = true
    } = options;

    console.log(`🔗 Finding documents related to: ${documentId}`);

    const results: GraphRAGResult[] = [];

    // Graph-based related documents
    if (includeGraph && await knowledgeGraphService.healthCheck()) {
      try {
        const relatedDocs = await knowledgeGraphService.findRelatedDocuments(documentId, {
          maxDepth,
          limit,
          minSimilarity: 0.3
        });

        for (const doc of relatedDocs) {
          results.push({
            id: doc.id,
            documentId: doc.id,
            documentName: doc.filename,
            documentType: doc.fileType,
            content: doc.summary || '',
            score: 0.8, // High relevance from graph relationship
            vectorSimilarity: 0,
            graphRelevance: 0.8,
            metadata: {
              chunkIndex: 0,
              textLength: doc.summary?.length || 0,
              createdAt: doc.uploadedAt.toISOString(),
              processingMethod: 'graph-only'
            },
            highlights: []
          });
        }
      } catch (error) {
        console.warn('⚠️ Graph-based related documents search failed:', error);
      }
    }

    // TODO: Add vector-based similarity search for related documents
    // This would involve getting the document's embedding and finding similar embeddings

    return results.slice(0, limit);
  }

  /**
   * Extract and process document for graph RAG
   */
  async processDocumentForGraphRAG(
    documentId: string,
    documentText: string,
    documentTitle?: string,
    userId?: string
  ): Promise<{
    success: boolean;
    extractionResults?: any;
    processingTime: number;
    cost?: number;
  }> {
    console.log(`🧠 Processing document for Graph RAG: ${documentId}`);
    
    const startTime = Date.now();

    try {
      // Extract knowledge from document
      const extractionResults = await entityExtractionService.extractFromDocument(
        documentText,
        documentTitle
      );

      // Create graph document structure
      const graphDocument = {
        id: documentId,
        filename: documentTitle || `document-${documentId}`,
        title: documentTitle || `Document ${documentId}`,
        uploadedAt: new Date(),
        fileType: 'unknown',
        fileSize: documentText.length,
        userId: userId || 'unknown',
        summary: extractionResults.summary
      };

      // Store in knowledge graph
      await knowledgeGraphService.storeExtractionResults(graphDocument, extractionResults);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        extractionResults,
        processingTime,
        cost: extractionResults.cost
      };

    } catch (error) {
      console.error('❌ Document processing for Graph RAG failed:', error);
      return {
        success: false,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Advanced query understanding using entity extraction
   */
  async analyzeQuery(query: string): Promise<{
    entities: Array<{ name: string; type: string; confidence: number }>;
    concepts: Array<{ name: string; category: string; importance: number }>;
    queryType: 'factual' | 'conceptual' | 'relational' | 'exploratory';
    suggestedGraphDepth: number;
  }> {
    console.log(`🔍 Analyzing query for Graph RAG: "${query}"`);

    try {
      // Use entity extraction to understand the query
      const extractionResults = await entityExtractionService.extractFromDocument(
        query,
        'User Query',
        { maxEntities: 10, maxConcepts: 5, maxRelationships: 5 }
      );

      // Determine query type based on extracted content
      let queryType: 'factual' | 'conceptual' | 'relational' | 'exploratory' = 'exploratory';
      let suggestedGraphDepth = 2;

      if (extractionResults.entities.length > extractionResults.concepts.length) {
        queryType = 'factual';
        suggestedGraphDepth = 1;
      } else if (extractionResults.concepts.length > 3) {
        queryType = 'conceptual';
        suggestedGraphDepth = 2;
      } else if (extractionResults.relationships.length > 2) {
        queryType = 'relational';
        suggestedGraphDepth = 3;
      }

      return {
        entities: extractionResults.entities.map(e => ({
          name: e.name,
          type: e.type,
          confidence: e.confidence
        })),
        concepts: extractionResults.concepts.map(c => ({
          name: c.name,
          category: c.category,
          importance: c.importance
        })),
        queryType,
        suggestedGraphDepth
      };

    } catch (error) {
      console.warn('⚠️ Query analysis failed, using defaults:', error);
      return {
        entities: [],
        concepts: [],
        queryType: 'exploratory',
        suggestedGraphDepth: 2
      };
    }
  }

  // Private helper methods

  /**
   * Merge vector and graph results with intelligent ranking
   */
  private async mergeAndRankResults(
    query: string,
    vectorResults: any[],
    graphResults: any,
    options: {
      vectorWeight: number;
      graphWeight: number;
      maxResults: number;
      vectorThreshold: number;
    }
  ): Promise<GraphRAGResult[]> {
    const { vectorWeight, graphWeight, maxResults, vectorThreshold } = options;
    const mergedResults: GraphRAGResult[] = [];
    const seenDocuments = new Set<string>();

    // Process vector results
    for (const vResult of vectorResults) {
      if (vResult.similarity >= vectorThreshold) {
        const result: GraphRAGResult = {
          id: vResult.id,
          documentId: vResult.documentId,
          documentName: vResult.documentName,
          documentType: vResult.metadata?.documentType || 'pdf',
          content: vResult.chunkText,
          score: vResult.similarity * vectorWeight,
          vectorSimilarity: vResult.similarity,
          graphRelevance: 0,
          metadata: {
            chunkIndex: vResult.chunkIndex,
            textLength: vResult.chunkText.length,
            createdAt: vResult.metadata?.createdAt || new Date().toISOString(),
            processingMethod: 'vector-only'
          },
          highlights: this.generateHighlights(vResult.chunkText, query)
        };

        mergedResults.push(result);
        seenDocuments.add(vResult.documentId);
      }
    }

    // Process graph results and enhance existing vector results
    if (graphResults && graphResults.documents) {
      for (const gDoc of graphResults.documents) {
        const existingResult = mergedResults.find(r => r.documentId === gDoc.id);
        
        if (existingResult) {
          // Enhance existing vector result with graph context
          existingResult.graphRelevance = 0.8; // High graph relevance
          existingResult.score = (existingResult.vectorSimilarity * vectorWeight) + (0.8 * graphWeight);
          existingResult.metadata.processingMethod = 'graph-enhanced';
          existingResult.graphContext = {
            relatedConcepts: graphResults.concepts.map((c: any) => c.name),
            relatedEntities: graphResults.entities.map((e: any) => e.name),
            relationshipTypes: graphResults.relationships.map((r: any) => r.type),
            connectionPaths: graphResults.relationships
          };
        } else if (!seenDocuments.has(gDoc.id)) {
          // Add new graph-only result
          const result: GraphRAGResult = {
            id: gDoc.id,
            documentId: gDoc.id,
            documentName: gDoc.filename,
            documentType: gDoc.fileType,
            content: gDoc.summary || '',
            score: 0.7 * graphWeight, // Graph relevance score
            vectorSimilarity: 0,
            graphRelevance: 0.7,
            metadata: {
              chunkIndex: 0,
              textLength: gDoc.summary?.length || 0,
              createdAt: gDoc.uploadedAt.toISOString(),
              processingMethod: 'graph-only'
            },
            graphContext: {
              relatedConcepts: graphResults.concepts.map((c: any) => c.name),
              relatedEntities: graphResults.entities.map((e: any) => e.name),
              relationshipTypes: graphResults.relationships.map((r: any) => r.type),
              connectionPaths: graphResults.relationships
            },
            highlights: []
          };

          mergedResults.push(result);
          seenDocuments.add(gDoc.id);
        }
      }
    }

    // Sort by combined score and return top results
    return mergedResults
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * Generate text highlights for search results
   */
  private generateHighlights(content: string, query: string): string[] {
    const highlights: string[] = [];
    const queryWords = query.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());

    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      const containsQueryWord = queryWords.some(word => word && lowerSentence.includes(word));
      
      if (containsQueryWord && highlights.length < 3) {
        const trimmed = sentence.trim();
        const highlight = trimmed.length > 150 
          ? trimmed.substring(0, 150) + '...'
          : trimmed;
        highlights.push(highlight);
      }
    }

    if (highlights.length === 0 && sentences.length > 0) {
      const firstSentence = sentences[0]?.trim() || '';
      if (firstSentence) {
        highlights.push(
          firstSentence.length > 150 
            ? firstSentence.substring(0, 150) + '...'
            : firstSentence
        );
      }
    }

    return highlights;
  }

  /**
   * Check if Graph RAG services are available
   */
  async isAvailable(): Promise<{
    vector: boolean;
    graph: boolean;
    graphRAG: boolean;
  }> {
    const vectorAvailable = embeddingService.isAvailable();
    const graphAvailable = await knowledgeGraphService.healthCheck();
    
    return {
      vector: vectorAvailable,
      graph: graphAvailable,
      graphRAG: vectorAvailable || graphAvailable // Graph RAG is available if either service works
    };
  }
}

// Export singleton instance
export const graphRAGService = new GraphRAGService();