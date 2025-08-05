import express, { Request, Response } from 'express';
import { databaseManager } from '../services/DatabaseManager';

const router = express.Router();

// Database health check endpoint
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await databaseManager.healthCheck();
    
    const status = health.overall ? 200 : 503;
    
    return res.status(status).json({
      success: health.overall,
      message: health.overall ? 'All databases healthy' : 'Some databases are unhealthy',
      data: {
        databases: {
          vector: {
            name: 'Pinecone',
            healthy: health.vector,
            status: health.vector ? 'connected' : 'disconnected'
          },
          graph: {
            name: 'Neo4j',
            healthy: health.graph,
            status: health.graph ? 'connected' : 'disconnected'
          }
        },
        overall: health.overall,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Database health check error:', error);
    return res.status(503).json({
      success: false,
      message: 'Database health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// System statistics endpoint
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await databaseManager.getSystemStats();
    
    return res.json({
      success: true,
      data: {
        vector: {
          service: 'Pinecone',
          vectorCount: stats.vector.vectorCount,
          indexFullness: `${(stats.vector.indexFullness * 100).toFixed(2)}%`,
          dimension: stats.vector.dimension
        },
        graph: {
          service: 'Neo4j',
          userCount: stats.graph.userCount,
          documentCount: stats.graph.documentCount,
          conceptCount: stats.graph.conceptCount,
          relationshipCount: stats.graph.relationshipCount
        },
        summary: {
          totalDocuments: stats.graph.documentCount,
          totalConcepts: stats.graph.conceptCount,
          totalVectors: stats.vector.vectorCount,
          totalRelationships: stats.graph.relationshipCount
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Database stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve database statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Database initialization endpoint (for development/setup)
router.post('/initialize', async (_req: Request, res: Response) => {
  try {
    if (databaseManager.isInitialized()) {
      return res.json({
        success: true,
        message: 'Databases already initialized'
      });
    }

    await databaseManager.initialize();
    
    return res.json({
      success: true,
      message: 'Databases initialized successfully',
      data: {
        vector: 'Pinecone index created/verified',
        graph: 'Neo4j schema and constraints created',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database initialization failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Vector database specific endpoints
router.get('/vector/stats', async (_req: Request, res: Response) => {
  try {
    const vectorService = databaseManager.getVectorService();
    const stats = await vectorService.getIndexStats();
    
    return res.json({
      success: true,
      data: {
        service: 'Pinecone',
        indexName: process.env['PINECONE_INDEX_NAME'] || '8brain-vectors',
        vectorCount: stats.vectorCount,
        indexFullness: stats.indexFullness,
        dimension: stats.dimension,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Vector stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve vector database statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Graph database specific endpoints  
router.get('/graph/stats', async (_req: Request, res: Response) => {
  try {
    const graphService = databaseManager.getGraphService();
    const stats = await graphService.getGraphStats();
    
    return res.json({
      success: true,
      data: {
        service: 'Neo4j',
        userCount: stats.userCount,
        documentCount: stats.documentCount,
        conceptCount: stats.conceptCount,
        relationshipCount: stats.relationshipCount,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Graph stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve graph database statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;