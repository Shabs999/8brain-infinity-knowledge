import OpenAI from 'openai';
import { TextChunk } from './TextExtractionService';

export interface EmbeddingVector {
  id: string;
  chunkId: string;
  documentId: string;
  text: string;
  embedding: number[];
  metadata: EmbeddingMetadata;
  createdAt: Date;
}

export interface EmbeddingMetadata {
  documentName: string;
  documentType: string;
  chunkIndex: number;
  textLength: number;
  wordCount: number;
  estimatedTokens: number;
  documentMetadata?: any;
}

export interface EmbeddingBatch {
  documentId: string;
  documentName: string;
  vectors: EmbeddingVector[];
  totalVectors: number;
  processingTime: number;
  totalTokensUsed: number;
  cost: number;
}

export interface SimilarityMatch {
  id: string;
  score: number;
  text: string;
  metadata: EmbeddingMetadata;
  documentName: string;
}

export class EmbeddingService {
  private openai: OpenAI | null = null;
  private readonly MODEL = 'text-embedding-ada-002';
  private readonly EMBEDDING_DIMENSIONS = 1536;
  private readonly BATCH_SIZE = 100; // Process embeddings in batches
  private readonly COST_PER_1K_TOKENS = 0.0001; // OpenAI pricing for ada-002

  constructor() {
    this.initializeOpenAI();
  }

  /**
   * Initialize OpenAI client
   */
  private initializeOpenAI(): void {
    const apiKey = process.env['OPENAI_API_KEY'];
    
    if (!apiKey) {
      console.warn('⚠️  OPENAI_API_KEY not found - Embedding features will be disabled');
      return;
    }

    try {
      this.openai = new OpenAI({
        apiKey: apiKey
      });
      console.log('🤖 OpenAI client initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI client:', error);
      this.openai = null;
    }
  }

  /**
   * Check if OpenAI service is available
   */
  isAvailable(): boolean {
    return this.openai !== null;
  }

  /**
   * Generate embeddings for a batch of text chunks
   */
  async generateEmbeddings(
    chunks: TextChunk[], 
    documentId: string, 
    documentName: string,
    documentType: string,
    documentMetadata?: any
  ): Promise<EmbeddingBatch> {
    if (!this.openai) {
      throw new Error('OpenAI service not available. Please set OPENAI_API_KEY environment variable.');
    }

    const startTime = Date.now();
    console.log(`🧠 Generating embeddings for ${chunks.length} chunks from ${documentName}`);

    try {
      const vectors: EmbeddingVector[] = [];
      let totalTokensUsed = 0;

      // Process chunks in batches to avoid rate limits
      for (let i = 0; i < chunks.length; i += this.BATCH_SIZE) {
        const batch = chunks.slice(i, i + this.BATCH_SIZE);
        const batchTexts = batch.map(chunk => chunk.text);

        console.log(`  📦 Processing batch ${Math.floor(i / this.BATCH_SIZE) + 1}/${Math.ceil(chunks.length / this.BATCH_SIZE)}`);

        // Generate embeddings for this batch
        const response = await this.openai.embeddings.create({
          model: this.MODEL,
          input: batchTexts,
          encoding_format: 'float'
        });

        // Process each embedding in the response
        response.data.forEach((embeddingData, index) => {
          const chunk = batch[index];
          const embedding = embeddingData.embedding;

          // Validate embedding dimensions
          if (embedding.length !== this.EMBEDDING_DIMENSIONS) {
            throw new Error(`Invalid embedding dimensions: expected ${this.EMBEDDING_DIMENSIONS}, got ${embedding.length}`);
          }

          const vector: EmbeddingVector = {
            id: this.generateVectorId(documentId, chunk.id),
            chunkId: chunk.id,
            documentId,
            text: chunk.text,
            embedding,
            metadata: {
              documentName,
              documentType,
              chunkIndex: chunk.index,
              textLength: chunk.text.length,
              wordCount: chunk.wordCount,
              estimatedTokens: chunk.tokens,
              documentMetadata
            },
            createdAt: new Date()
          };

          vectors.push(vector);
        });

        // Track token usage
        totalTokensUsed += response.usage.total_tokens;

        // Add small delay between batches to respect rate limits
        if (i + this.BATCH_SIZE < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      const processingTime = Date.now() - startTime;
      const cost = this.calculateCost(totalTokensUsed);

      const embeddingBatch: EmbeddingBatch = {
        documentId,
        documentName,
        vectors,
        totalVectors: vectors.length,
        processingTime,
        totalTokensUsed,
        cost
      };

      console.log(`✅ Embedding generation completed for ${documentName}:`);
      console.log(`   🎯 Generated ${vectors.length} vectors`);
      console.log(`   📊 Used ${totalTokensUsed.toLocaleString()} tokens`);
      console.log(`   💰 Cost: $${cost.toFixed(4)}`);
      console.log(`   ⏱️  Processing time: ${processingTime}ms`);

      return embeddingBatch;

    } catch (error) {
      console.error(`❌ Embedding generation failed for ${documentName}:`, error);
      throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embedding for a single query text
   */
  async generateQueryEmbedding(queryText: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI service not available');
    }

    console.log(`🔍 Generating query embedding for: "${queryText.substring(0, 50)}..."`);

    try {
      const response = await this.openai.embeddings.create({
        model: this.MODEL,
        input: [queryText],
        encoding_format: 'float'
      });

      const embedding = response.data[0].embedding;

      if (embedding.length !== this.EMBEDDING_DIMENSIONS) {
        throw new Error(`Invalid embedding dimensions: expected ${this.EMBEDDING_DIMENSIONS}, got ${embedding.length}`);
      }

      console.log(`✅ Query embedding generated (${embedding.length} dimensions)`);
      return embedding;

    } catch (error) {
      console.error('❌ Query embedding generation failed:', error);
      throw new Error(`Failed to generate query embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Find similar vectors using cosine similarity
   */
  findSimilarVectors(
    queryEmbedding: number[], 
    candidateVectors: EmbeddingVector[], 
    topK: number = 10,
    minSimilarity: number = 0.7
  ): SimilarityMatch[] {
    console.log(`🔍 Searching ${candidateVectors.length} vectors for top ${topK} matches`);

    const similarities = candidateVectors.map(vector => {
      const similarity = this.calculateCosineSimilarity(queryEmbedding, vector.embedding);
      
      return {
        id: vector.id,
        score: similarity,
        text: vector.text,
        metadata: vector.metadata,
        documentName: vector.metadata.documentName
      };
    });

    // Filter by minimum similarity and sort by score
    const matches = similarities
      .filter(match => match.score >= minSimilarity)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    console.log(`✅ Found ${matches.length} matches above ${minSimilarity} similarity threshold`);
    
    return matches;
  }

  /**
   * Generate unique vector ID
   */
  private generateVectorId(documentId: string, chunkId: string): string {
    return `vec_${documentId}_${chunkId}`;
  }

  /**
   * Calculate cost based on token usage
   */
  private calculateCost(totalTokens: number): number {
    return (totalTokens / 1000) * this.COST_PER_1K_TOKENS;
  }

  /**
   * Get embedding model information
   */
  getModelInfo() {
    return {
      model: this.MODEL,
      dimensions: this.EMBEDDING_DIMENSIONS,
      costPer1KTokens: this.COST_PER_1K_TOKENS,
      maxBatchSize: this.BATCH_SIZE
    };
  }

  /**
   * Validate embedding vector
   */
  validateEmbedding(embedding: number[]): boolean {
    return (
      Array.isArray(embedding) &&
      embedding.length === this.EMBEDDING_DIMENSIONS &&
      embedding.every(val => typeof val === 'number' && !isNaN(val))
    );
  }

  /**
   * Normalize embedding vector (optional, OpenAI embeddings are already normalized)
   */
  normalizeEmbedding(embedding: number[]): number[] {
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? embedding.map(val => val / magnitude) : embedding;
  }
}

export const embeddingService = new EmbeddingService();