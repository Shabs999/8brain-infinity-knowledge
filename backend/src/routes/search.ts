import express, { Request, Response } from 'express';
import { embeddingService } from '../services/EmbeddingService';
import { semanticSearchService } from '../services/SemanticSearchService';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Search request interface
interface SearchRequest {
  query: string;
  limit?: number;
  filters?: {
    documentType?: string;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

// Search result interface
interface SearchResult {
  id: string;
  documentId: string;
  documentName: string;
  documentType: string;
  content: string;
  score: number;
  metadata: {
    chunkIndex: number;
    textLength: number;
    createdAt: string;
  };
  highlights?: string[];
}

/**
 * Semantic search endpoint
 * POST /api/search
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { query, limit = 10, filters } = req.body as SearchRequest;
    
    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query is required and must be a non-empty string'
      });
    }

    const trimmedQuery = query.trim();
    console.log(`🔍 Processing search query: "${trimmedQuery}"`);

    // Check if embedding service is available
    if (!embeddingService.isAvailable()) {
      return res.status(503).json({
        success: false,
        message: 'Search service temporarily unavailable. OpenAI API key not configured.'
      });
    }

    const searchStartTime = Date.now();

    try {
      // Use our in-memory semantic search service
      console.log('🔍 Using in-memory semantic search...');
      
      const searchResponse = await semanticSearchService.search({
        query: trimmedQuery,
        limit,
        threshold: 0.5 // Require at least 50% similarity for meaningful results
      });

      console.log(`✅ Found ${searchResponse.results.length} results`);

      // Format results to match expected interface
      const formattedResults: SearchResult[] = searchResponse.results.map(result => ({
        id: result.id,
        documentId: result.documentId,
        documentName: result.documentName,
        documentType: result.metadata?.documentType || 'pdf',
        content: result.chunkText,
        score: result.similarity,
        metadata: {
          chunkIndex: result.chunkIndex,
          textLength: result.chunkText.length,
          createdAt: result.metadata?.createdAt || new Date().toISOString()
        },
        highlights: generateHighlights(result.chunkText, trimmedQuery)
      }));

      const searchTime = Date.now() - searchStartTime;

      // Return successful response
      return res.json({
        success: true,
        data: {
          query: trimmedQuery,
          results: formattedResults,
          totalResults: formattedResults.length,
          searchTime,
          filters: filters || {}
        },
        message: `Found ${formattedResults.length} results in ${searchTime}ms`
      });

    } catch (searchError) {
      console.error('❌ Search processing error:', searchError);
      return res.status(500).json({
        success: false,
        message: 'Failed to process search query',
        error: searchError instanceof Error ? searchError.message : 'Unknown error'
      });
    }

  } catch (error) {
    console.error('❌ Search endpoint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Search suggestions endpoint
 * GET /api/search/suggestions
 */
router.get('/suggestions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { prefix } = req.query;
    
    if (!prefix || typeof prefix !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Prefix query parameter is required'
      });
    }

    // TODO: Implement search suggestions based on:
    // - User's search history
    // - Popular searches
    // - Document titles and keywords
    
    // For now, return mock suggestions
    const suggestions = [
      'machine learning algorithms',
      'natural language processing',
      'knowledge graph construction',
      'artificial intelligence applications',
      'deep learning models'
    ].filter(s => s.toLowerCase().startsWith(prefix.toLowerCase()));

    return res.json({
      success: true,
      data: {
        prefix,
        suggestions: suggestions.slice(0, 5)
      }
    });

  } catch (error) {
    console.error('❌ Suggestions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get suggestions'
    });
  }
});

/**
 * Search history endpoint
 * GET /api/search/history
 */
router.get('/history', authenticateToken, async (_req: Request, res: Response) => {
  try {
    // TODO: Implement search history storage and retrieval
    // For now, return empty history
    
    return res.json({
      success: true,
      data: {
        history: [],
        totalQueries: 0
      }
    });

  } catch (error) {
    console.error('❌ History error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get search history'
    });
  }
});

/**
 * Generate text highlights for search results
 */
function generateHighlights(content: string, query: string): string[] {
  const highlights: string[] = [];
  const queryWords = query.toLowerCase().split(/\s+/);
  const sentences = content.split(/[.!?]+/).filter(s => s.trim());

  // Find sentences containing query words
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    const containsQueryWord = queryWords.some(word => word && lowerSentence.includes(word));
    
    if (containsQueryWord && highlights.length < 3) {
      // Trim and add ellipsis if needed
      const trimmed = sentence.trim();
      const highlight = trimmed.length > 150 
        ? trimmed.substring(0, 150) + '...'
        : trimmed;
      highlights.push(highlight);
    }
  }

  // If no highlights found, return first sentence
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

export default router;