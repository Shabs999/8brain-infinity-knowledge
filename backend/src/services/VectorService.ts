import { Pinecone } from '@pinecone-database/pinecone';

// Local type definitions to avoid import issues
interface VectorRecord {
  id: string;
  values: number[];
  metadata: {
    userId: string;
    documentId: string;
    content: string;
    concepts: string[];
    chunkIndex: number;
  };
}

export class VectorService {
  private pinecone: Pinecone;
  private indexName: string;

  constructor() {
    const apiKey = process.env['PINECONE_API_KEY'];
    
    if (!apiKey) {
      console.warn('⚠️  PINECONE_API_KEY not found - Pinecone features will be disabled');
      this.pinecone = null as any; // Will be handled in methods
      this.indexName = process.env['PINECONE_INDEX_NAME'] || '8brain-vectors';
      return;
    }

    try {
      this.pinecone = new Pinecone({
        apiKey,
        environment: process.env['PINECONE_ENVIRONMENT'] || 'us-east-1'
      });
      this.indexName = process.env['PINECONE_INDEX_NAME'] || '8brain-vectors';
    } catch (error) {
      console.error('Failed to initialize Pinecone client:', error);
      this.pinecone = null as any;
      this.indexName = process.env['PINECONE_INDEX_NAME'] || '8brain-vectors';
    }
  }

  async initialize(): Promise<void> {
    if (!this.pinecone) {
      console.log('📊 Pinecone client not available - skipping initialization');
      return;
    }

    try {
      console.log(`📊 Pinecone client initialized for index: ${this.indexName}`);
    } catch (error) {
      console.error('Failed to initialize Pinecone:', error);
      throw error;
    }
  }

  async upsert(vectors: VectorRecord[]): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      // Transform VectorRecord to Pinecone format
      const pineconeVectors = vectors.map(vector => ({
        id: vector.id,
        values: vector.values,
        metadata: {
          userId: vector.metadata.userId,
          documentId: vector.metadata.documentId,
          content: vector.metadata.content,
          concepts: JSON.stringify(vector.metadata.concepts),
          chunkIndex: vector.metadata.chunkIndex
        }
      }));

      await index.upsert(pineconeVectors);
      console.log(`Upserted ${vectors.length} vectors to Pinecone`);
    } catch (error) {
      console.error('Failed to upsert vectors:', error);
      throw error;
    }
  }

  async similaritySearch(
    queryVector: number[],
    options: {
      topK?: number;
      filter?: Record<string, any>;
      includeMetadata?: boolean;
    } = {}
  ): Promise<Array<{
    id: string;
    score: number;
    metadata?: Record<string, any>;
  }>> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      const queryOptions: any = {
        vector: queryVector,
        topK: options.topK || 10,
        includeMetadata: options.includeMetadata !== false
      };

      if (options.filter) {
        queryOptions.filter = options.filter;
      }

      const response = await index.query(queryOptions);

      return response.matches?.map(match => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata as Record<string, any>
      })) || [];
    } catch (error) {
      console.error('Failed to perform similarity search:', error);
      throw error;
    }
  }

  async deleteVectors(vectorIds: string[]): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);
      await index.deleteMany(vectorIds);
      console.log(`Deleted ${vectorIds.length} vectors from Pinecone`);
    } catch (error) {
      console.error('Failed to delete vectors:', error);
      throw error;
    }
  }

  async deleteByFilter(filter: Record<string, any>): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);
      await index.deleteMany({ filter });
      console.log('Deleted vectors by filter:', filter);
    } catch (error) {
      console.error('Failed to delete vectors by filter:', error);
      throw error;
    }
  }

  async getIndexStats(): Promise<{
    vectorCount: number;
    indexFullness: number;
    dimension: number;
  }> {
    if (!this.pinecone) {
      return {
        vectorCount: 0,
        indexFullness: 0,
        dimension: 1536
      };
    }

    try {
      const index = this.pinecone.index(this.indexName);
      const stats = await index.describeIndexStats();
      
      return {
        vectorCount: stats.totalRecordCount || 0,
        indexFullness: 0, // Not available in newer Pinecone API
        dimension: stats.dimension || 1536
      };
    } catch (error) {
      console.error('Failed to get index stats:', error);
      return {
        vectorCount: 0,
        indexFullness: 0,
        dimension: 1536
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.pinecone) {
      return false;
    }

    try {
      await this.getIndexStats();
      return true;
    } catch (error) {
      console.error('Pinecone health check failed:', error);
      return false;
    }
  }
}