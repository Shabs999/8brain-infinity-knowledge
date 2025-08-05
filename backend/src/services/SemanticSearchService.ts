import { EmbeddingVector } from './EmbeddingService';
import { embeddingService } from './EmbeddingService';

export interface SearchResult {
  id: string;
  documentId: string;
  documentName: string;
  chunkText: string;
  similarity: number;
  chunkIndex: number;
  metadata?: any;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
  documentIds?: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  totalFound: number;
  queryVector?: number[];
  processingTime: number;
  query: string;
}

export class SemanticSearchService {
  // In-memory storage for embeddings (temporary until Pinecone integration)
  private embeddings: Map<string, EmbeddingVector[]> = new Map();

  constructor() {
    console.log('🔍 SemanticSearchService initialized');
  }

  // Store embeddings for search (temporary method)
  public storeEmbeddings(documentId: string, embeddings: EmbeddingVector[]): void {
    this.embeddings.set(documentId, embeddings);
    console.log(`📦 Stored ${embeddings.length} embeddings for document ${documentId}`);
  }

  // Get all stored embeddings
  public getAllEmbeddings(): EmbeddingVector[] {
    const allEmbeddings: EmbeddingVector[] = [];
    for (const embeddings of this.embeddings.values()) {
      allEmbeddings.push(...embeddings);
    }
    return allEmbeddings;
  }

  // Calculate cosine similarity between two vectors
  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (!vectorA || !vectorB) {
      return 0;
    }
    
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      const a = vectorA[i] || 0;
      const b = vectorB[i] || 0;
      dotProduct += a * b;
      magnitudeA += a * a;
      magnitudeB += b * b;
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Perform semantic search
  public async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Performing semantic search for: "${request.query}"`);

      // Generate embedding for the search query
      if (!embeddingService.isAvailable()) {
        throw new Error('Embedding service not available. OpenAI API key required.');
      }

      // Create a temporary chunk for the query
      const queryChunk = {
        id: 'query',
        text: request.query,
        index: 0,
        startChar: 0,
        endChar: request.query.length,
        startPosition: 0,
        endPosition: request.query.length,
        tokens: request.query.split(' ').length,
        wordCount: request.query.split(' ').length
      };

      const queryEmbedding = await embeddingService.generateEmbeddings(
        [queryChunk],
        'query',
        'Search Query',
        'text/plain'
      );

      if (queryEmbedding.vectors.length === 0) {
        throw new Error('Failed to generate query embedding');
      }

      const queryVector = queryEmbedding.vectors[0]?.embedding;
      if (!queryVector) {
        throw new Error('Failed to generate query embedding vector');
      }

      // Get all stored embeddings
      const allEmbeddings = this.getAllEmbeddings();
      
      if (allEmbeddings.length === 0) {
        return {
          results: [],
          totalFound: 0,
          queryVector,
          processingTime: Date.now() - startTime,
          query: request.query
        };
      }

      // Calculate similarities
      const similarities: Array<{
        embedding: EmbeddingVector;
        similarity: number;
      }> = [];

      for (const embedding of allEmbeddings) {
        // Filter by document IDs if specified
        if (request.documentIds && request.documentIds.length > 0) {
          if (!request.documentIds.includes(embedding.documentId)) {
            continue;
          }
        }

        const similarity = this.cosineSimilarity(queryVector, embedding.embedding);
        
        // Apply threshold filter - use higher threshold for better relevance
        const threshold = request.threshold || 0.5; // Raised from 0.1 to 0.5 (50% similarity minimum)
        if (similarity >= threshold) {
          similarities.push({ embedding, similarity });
        }
      }

      // Sort by similarity (highest first)
      similarities.sort((a, b) => b.similarity - a.similarity);

      // Apply limit
      const limit = request.limit || 10;
      const topResults = similarities.slice(0, limit);

      // Format results
      const results: SearchResult[] = topResults.map(item => ({
        id: item.embedding.id,
        documentId: item.embedding.documentId,
        documentName: item.embedding.metadata?.documentName || 'Unknown Document',
        chunkText: item.embedding.text,
        similarity: item.similarity,
        chunkIndex: item.embedding.metadata?.chunkIndex || 0,
        metadata: item.embedding.metadata
      }));

      const processingTime = Date.now() - startTime;

      console.log(`✅ Search completed: ${results.length} results in ${processingTime}ms`);
      console.log(`   Top similarity: ${results[0]?.similarity.toFixed(4) || 'N/A'}`);

      return {
        results,
        totalFound: similarities.length,
        queryVector,
        processingTime,
        query: request.query
      };

    } catch (error) {
      console.error('❌ Semantic search error:', error);
      throw error;
    }
  }

  // Get search statistics
  public getStats(): {
    totalDocuments: number;
    totalEmbeddings: number;
    documentsWithEmbeddings: string[];
  } {
    const allEmbeddings = this.getAllEmbeddings();
    const documentIds = Array.from(this.embeddings.keys());
    
    return {
      totalDocuments: documentIds.length,
      totalEmbeddings: allEmbeddings.length,
      documentsWithEmbeddings: documentIds
    };
  }

  // Health check
  public async healthCheck(): Promise<{
    available: boolean;
    embeddingServiceAvailable: boolean;
    stats: any;
  }> {
    return {
      available: true,
      embeddingServiceAvailable: embeddingService.isAvailable(),
      stats: this.getStats()
    };
  }
}

// Export singleton instance
export const semanticSearchService = new SemanticSearchService();