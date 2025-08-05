import { VectorService } from './VectorService';
import { GraphService } from './GraphService';

export class DatabaseManager {
  private vectorService: VectorService;
  private graphService: GraphService;
  private initialized = false;

  constructor() {
    this.vectorService = new VectorService();
    this.graphService = new GraphService();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('🔄 Initializing database connections...');

    try {
      // Initialize vector database (Pinecone)
      console.log('📊 Connecting to Pinecone vector database...');
      await this.vectorService.initialize();

      // Initialize graph database (Neo4j)
      console.log('🔗 Connecting to Neo4j graph database...');
      await this.graphService.initialize();

      this.initialized = true;
      console.log('🚀 Database services initialized (connections will be established when credentials are provided)');

    } catch (error) {
      console.warn('⚠️  Database initialization completed with warnings:', error instanceof Error ? error.message : 'Unknown error');
      this.initialized = true; // Still mark as initialized so app can start
    }
  }

  getVectorService(): VectorService {
    if (!this.initialized) {
      throw new Error('DatabaseManager not initialized. Call initialize() first.');
    }
    return this.vectorService;
  }

  getGraphService(): GraphService {
    if (!this.initialized) {
      throw new Error('DatabaseManager not initialized. Call initialize() first.');
    }
    return this.graphService;
  }

  async healthCheck(): Promise<{
    vector: boolean;
    graph: boolean;
    overall: boolean;
  }> {
    try {
      const [vectorHealthy, graphHealthy] = await Promise.all([
        this.vectorService.healthCheck(),
        this.graphService.healthCheck()
      ]);

      return {
        vector: vectorHealthy,
        graph: graphHealthy,
        overall: vectorHealthy && graphHealthy
      };
    } catch (error) {
      console.error('Database health check failed:', error);
      return {
        vector: false,
        graph: false,
        overall: false
      };
    }
  }

  async getSystemStats(): Promise<{
    vector: {
      vectorCount: number;
      indexFullness: number;
      dimension: number;
    };
    graph: {
      userCount: number;
      documentCount: number;
      conceptCount: number;
      relationshipCount: number;
    };
  }> {
    try {
      const [vectorStats, graphStats] = await Promise.all([
        this.vectorService.getIndexStats(),
        this.graphService.getGraphStats()
      ]);

      return {
        vector: vectorStats,
        graph: graphStats
      };
    } catch (error) {
      console.error('Failed to get system stats:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      await this.graphService.close();
      console.log('Database connections closed');
    } catch (error) {
      console.error('Error closing database connections:', error);
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
export const databaseManager = new DatabaseManager();