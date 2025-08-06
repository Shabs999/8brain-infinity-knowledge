import express, { Request, Response } from 'express';
import { knowledgeGraphService } from '../services/KnowledgeGraphService';
import { entityExtractionService } from '../services/EntityExtractionService';
import { graphRAGService } from '../services/GraphRAGService';
import { authenticateToken } from '../middleware/auth';
import { Document } from '../models/Document';

const router = express.Router();

/**
 * Process a document and extract knowledge graph data
 * POST /api/graph/process/:documentId
 */
router.post('/process/:documentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const { forceReprocess = false } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }

    console.log(`🧠 Processing document for knowledge graph: ${documentId}`);

    // Get the document
    const doc = await Document.findById(documentId, true); // Extract text
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if document has already been processed
    if (!forceReprocess && doc.metadata?.graphProcessed) {
      return res.json({
        success: true,
        message: 'Document already processed for knowledge graph',
        data: {
          documentId,
          processed: true,
          lastProcessed: doc.metadata.graphProcessedAt
        }
      });
    }

    const startTime = Date.now();

    try {
      // Extract entities, concepts, and relationships
      console.log('🔍 Extracting knowledge from document...');
      const extractionResults = await entityExtractionService.extractFromDocument(
        doc.extractedText || '',
        doc.originalName || doc.filename
      );

      // Create graph document data
      const graphDocument = {
        id: doc.id,
        filename: doc.filename,
        title: doc.originalName || doc.filename,
        uploadedAt: new Date(doc.uploadedAt || new Date()),
        fileType: doc.fileType || 'unknown',
        fileSize: doc.fileSize || 0,
        userId: (req.user as any)?.userId || 'unknown',
        summary: extractionResults.summary
      };

      // Store in knowledge graph
      console.log('📊 Storing extraction results in knowledge graph...');
      await knowledgeGraphService.storeExtractionResults(graphDocument, extractionResults);

      // Update document metadata to mark as processed
      await Document.updateMetadata(documentId, {
        graphProcessed: true,
        graphProcessedAt: new Date().toISOString(),
        entitiesCount: extractionResults.entities.length,
        conceptsCount: extractionResults.concepts.length,
        relationshipsCount: extractionResults.relationships.length
      });

      const processingTime = Date.now() - startTime;

      return res.json({
        success: true,
        message: 'Document processed successfully for knowledge graph',
        data: {
          documentId,
          processingTime,
          extractionResults: {
            entities: extractionResults.entities.length,
            concepts: extractionResults.concepts.length,
            relationships: extractionResults.relationships.length,
            terms: extractionResults.terms.length,
            summary: extractionResults.summary,
            cost: extractionResults.cost
          }
        }
      });

    } catch (extractionError) {
      console.error('❌ Knowledge extraction failed:', extractionError);
      return res.status(500).json({
        success: false,
        message: 'Failed to extract knowledge from document',
        error: extractionError instanceof Error ? extractionError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('❌ Graph processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process document for knowledge graph',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Query the knowledge graph
 * POST /api/graph/query
 */
router.post('/query', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { 
      query, 
      maxDepth = 2, 
      limit = 20, 
      includeRelationships = true 
    } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query is required and must be a non-empty string'
      });
    }

    console.log(`🔍 Querying knowledge graph: "${query}"`);

    const startTime = Date.now();

    const results = await knowledgeGraphService.queryKnowledgeGraph(query.trim(), {
      userId: (req.user as any)?.userId || undefined,
      maxDepth,
      limit,
      includeRelationships
    });

    const queryTime = Date.now() - startTime;

    return res.json({
      success: true,
      message: `Found ${results.documents.length} related documents`,
      data: {
        query: query.trim(),
        results,
        queryTime,
        options: { maxDepth, limit, includeRelationships }
      }
    });

  } catch (error) {
    console.error('❌ Graph query error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to query knowledge graph',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Find documents related to a specific document
 * GET /api/graph/related/:documentId
 */
router.get('/related/:documentId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const { 
      maxDepth = 2, 
      limit = 10, 
      minSimilarity = 0.3 
    } = req.query;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }

    console.log(`🔗 Finding documents related to: ${documentId}`);

    const relatedDocuments = await knowledgeGraphService.findRelatedDocuments(documentId, {
      maxDepth: Number(maxDepth),
      limit: Number(limit),
      minSimilarity: Number(minSimilarity)
    });

    return res.json({
      success: true,
      message: `Found ${relatedDocuments.length} related documents`,
      data: {
        documentId,
        relatedDocuments,
        options: { maxDepth, limit, minSimilarity }
      }
    });

  } catch (error) {
    console.error('❌ Related documents error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to find related documents',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get knowledge graph statistics
 * GET /api/graph/stats
 */
router.get('/stats', authenticateToken, async (_req: Request, res: Response) => {
  try {
    console.log('📊 Getting knowledge graph statistics...');

    // Check if Neo4j is available
    const isHealthy = await knowledgeGraphService.healthCheck();
    
    if (!isHealthy) {
      return res.json({
        success: true,
        message: 'Knowledge graph not available',
        data: {
          available: false,
          message: 'Neo4j connection not configured or unavailable'
        }
      });
    }

    // Get basic stats (this would need to be implemented in KnowledgeGraphService)
    const stats = {
      available: true,
      nodes: {
        documents: 0,
        concepts: 0,
        entities: 0,
        terms: 0
      },
      relationships: {
        total: 0,
        types: {}
      },
      lastUpdated: new Date().toISOString()
    };

    return res.json({
      success: true,
      message: 'Knowledge graph statistics retrieved',
      data: stats
    });

  } catch (error) {
    console.error('❌ Graph stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get knowledge graph statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Enhanced search using both vector and graph context (Graph RAG)
 * POST /api/graph/search
 */
router.post('/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { 
      query,
      useVector = true,
      useGraph = true,
      vectorWeight = 0.6,
      graphWeight = 0.4,
      maxResults = 10,
      vectorThreshold = 0.5,
      graphThreshold = 0.3
    } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query is required and must be a non-empty string'
      });
    }

    console.log(`🧠 Graph RAG search: "${query}"`);

    // Check service availability
    const availability = await graphRAGService.isAvailable();
    if (!availability.graphRAG) {
      return res.status(503).json({
        success: false,
        message: 'Graph RAG services are not available',
        details: {
          vector: availability.vector,
          graph: availability.graph
        }
      });
    }

    // Analyze query to optimize search strategy
    const queryAnalysis = await graphRAGService.analyzeQuery(query.trim());
    const adaptiveGraphDepth = queryAnalysis.suggestedGraphDepth;

    // Perform Graph RAG search
    const searchResults = await graphRAGService.enhancedSearch(query.trim(), {
      useVector,
      useGraph,
      vectorWeight,
      graphWeight,
      maxResults,
      graphDepth: adaptiveGraphDepth,
      vectorThreshold,
      graphThreshold,
      userId: (req.user as any)?.userId
    });

    return res.json({
      success: true,
      message: `Found ${searchResults.results.length} results using Graph RAG`,
      data: {
        query: query.trim(),
        results: searchResults.results,
        searchStats: searchResults.searchStats,
        queryAnalysis,
        options: {
          useVector,
          useGraph,
          vectorWeight,
          graphWeight,
          maxResults,
          graphDepth: adaptiveGraphDepth,
          vectorThreshold,
          graphThreshold
        }
      }
    });

  } catch (error) {
    console.error('❌ Graph RAG search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to perform Graph RAG search',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Analyze query to understand entities, concepts, and search strategy
 * POST /api/graph/analyze-query
 */
router.post('/analyze-query', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query is required and must be a non-empty string'
      });
    }

    console.log(`🔍 Analyzing query: "${query}"`);

    const analysis = await graphRAGService.analyzeQuery(query.trim());

    return res.json({
      success: true,
      message: 'Query analyzed successfully',
      data: {
        query: query.trim(),
        analysis
      }
    });

  } catch (error) {
    console.error('❌ Query analysis error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to analyze query',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Find related documents using Graph RAG
 * GET /api/graph/related/:documentId/enhanced
 */
router.get('/related/:documentId/enhanced', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;
    const { 
      maxDepth = 2, 
      limit = 10, 
      includeVector = true,
      includeGraph = true
    } = req.query;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }

    console.log(`🔗 Finding enhanced related documents for: ${documentId}`);

    const relatedDocuments = await graphRAGService.findRelatedDocuments(documentId, {
      maxDepth: Number(maxDepth),
      limit: Number(limit),
      includeVector: includeVector === 'true',
      includeGraph: includeGraph === 'true'
    });

    return res.json({
      success: true,
      message: `Found ${relatedDocuments.length} related documents using Graph RAG`,
      data: {
        documentId,
        relatedDocuments,
        options: { maxDepth, limit, includeVector, includeGraph }
      }
    });

  } catch (error) {
    console.error('❌ Enhanced related documents error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to find enhanced related documents',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get concepts and entities for a specific document
 * GET /api/graph/document/:documentId/knowledge
 */
router.get('/document/:documentId/knowledge', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { documentId } = req.params;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }

    console.log(`📚 Getting knowledge data for document: ${documentId}`);

    // Query the knowledge graph for all entities and concepts related to this document
    const graphResults = await knowledgeGraphService.queryKnowledgeGraph(`document:${documentId}`, {
      userId: (req.user as any)?.userId || undefined,
      maxDepth: 1,
      limit: 100,
      includeRelationships: true
    });

    return res.json({
      success: true,
      message: 'Document knowledge data retrieved',
      data: {
        documentId,
        concepts: graphResults.concepts,
        entities: graphResults.entities,
        relationships: graphResults.relationships,
        totalConcepts: graphResults.concepts.length,
        totalEntities: graphResults.entities.length,
        totalRelationships: graphResults.relationships.length
      }
    });

  } catch (error) {
    console.error('❌ Document knowledge error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get document knowledge data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;