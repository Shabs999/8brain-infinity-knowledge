import express, { Request, Response } from 'express';
import { graphRAGService } from '../services/GraphRAGService';
import { knowledgeGraphService } from '../services/KnowledgeGraphService';
import { conversationalAIService } from '../services/ConversationalAIService';

const router = express.Router();

interface VoiceQuery {
  transcript: string;
  intent?: string;
  context?: any;
  sessionId?: string;
  enableAI?: boolean;
}

/**
 * Process voice query and convert to graph search
 * POST /api/voice/query
 */
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { transcript, intent, sessionId, enableAI = true } = req.body as VoiceQuery;

    // Process voice queries with real Neo4j data

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Voice transcript is required'
      });
    }

    console.log(`🎤 Processing voice query: "${transcript}"`);
    console.log(`🎯 Detected intent: ${intent || 'auto-detect'}`);

    const startTime = Date.now();

    // Parse the natural language query
    const parsedQuery = parseNaturalLanguageQuery(transcript, intent);
    console.log(`📝 Parsed query:`, parsedQuery);

    // Execute the appropriate action based on intent
    let results: any;
    
    console.log('🎯 Executing switch case for intent:', parsedQuery.intent);
    
    switch (parsedQuery.intent) {
      case 'search':
      case 'find':
        console.log('🔍 Calling executeSearchQuery...');
        results = await executeSearchQuery(parsedQuery);
        console.log('🔍 executeSearchQuery returned:', JSON.stringify(results, null, 2));
        break;
        
      case 'count':
        results = await executeCountQuery(parsedQuery);
        break;
        
      case 'relationship':
      case 'connect':
        results = await executeRelationshipQuery(parsedQuery);
        break;
        
      case 'explain':
        results = await executeExplainQuery(parsedQuery);
        break;
        
      default:
        // Default to search
        results = await executeSearchQuery(parsedQuery);
    }

    const processingTime = Date.now() - startTime;

    // 🤖 NEW: Add conversational AI processing
    let aiResponse = null;
    if (enableAI) {
      try {
        console.log('🤖 Processing with conversational AI...');
        console.log('🤖 AI Service available check...');
        
        const aiAvailable = await conversationalAIService.isAvailable();
        console.log('🤖 AI availability:', aiAvailable);
        
        if (!aiAvailable.conversationalAI) {
          console.warn('⚠️ AI service not available, skipping AI processing');
        } else {
          const aiStartTime = Date.now();
          
          const currentSessionId = sessionId || `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          console.log('🤖 Calling processVoiceQuery with session:', currentSessionId);
          
          aiResponse = await conversationalAIService.processVoiceQuery(
            transcript,
            results,
            currentSessionId,
            'voice-user' // TODO: Use actual user ID when available
          );
          
          console.log(`🤖 AI processing completed in ${Date.now() - aiStartTime}ms`);
          console.log('🤖 AI response generated:', !!aiResponse);
        }
        
      } catch (aiError) {
        console.error('❌ AI processing failed with error:', aiError);
        console.error('❌ Error stack:', aiError.stack);
        
        // Provide a basic fallback AI response so frontend always gets something
        console.log('🔄 Providing fallback AI response');
        aiResponse = {
          response: generateFallbackResponse(results, transcript),
          model: 'fallback',
          confidence: 0.3,
          followUpSuggestions: ['Try asking again', 'Rephrase your question', 'Ask about specific topics'],
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 },
          processingTime: 0,
          error: 'AI service temporarily unavailable'
        };
      }
    }

    return res.json({
      success: true,
      message: 'Voice query processed successfully',
      data: {
        transcript,
        parsedQuery,
        results,
        aiResponse, // 🤖 NEW: Include AI response
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Voice query error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process voice query',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get voice command suggestions
 * GET /api/voice/suggestions
 */
router.get('/suggestions', async (_req: Request, res: Response) => {
  try {
    const suggestions = [
      {
        category: 'Search',
        commands: [
          'Show me all documents',
          'Find documents about [topic]',
          'Search for [concept name]',
          'Show entities related to [topic]'
        ]
      },
      {
        category: 'Relationships',
        commands: [
          'What connects [A] and [B]?',
          'Show relationships between [concepts]',
          'How is [entity] related to [concept]?',
          'Find connections to [document]'
        ]
      },
      {
        category: 'Analysis',
        commands: [
          'Explain [concept]',
          'What is [entity]?',
          'Summarize [document]',
          'Tell me about [topic]'
        ]
      },
      {
        category: 'Statistics',
        commands: [
          'How many documents do I have?',
          'Count all concepts',
          'Show me graph statistics',
          'What types of entities exist?'
        ]
      }
    ];

    return res.json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    console.error('❌ Suggestions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get suggestions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Natural Language Query Parser
function parseNaturalLanguageQuery(transcript: string, providedIntent?: string) {
  const query = transcript.toLowerCase().trim();
  
  // Intent patterns - ORDER MATTERS! More specific patterns first
  const intentPatterns = {
    count: /^(how many|count|number of|total)/i,           // PRIORITY: Count questions first
    explain: /^(what is|explain|tell me about|describe)/i, // Explain only at start
    search: /^(show|find|search|get|list|display)/i,      // Search commands
    relationship: /(connect|relate|relationship|between|link)/i, // Relationship anywhere
    filter: /(only|just|filter|type)/i                    // Filter modifiers
  };

  // Detect intent if not provided - check count patterns first
  let intent = providedIntent;
  if (!intent) {
    // Check count pattern first (highest priority)
    if (intentPatterns.count.test(query)) {
      intent = 'count';
    } else if (intentPatterns.explain.test(query)) {
      intent = 'explain';
    } else if (intentPatterns.search.test(query)) {
      intent = 'search';
    } else if (intentPatterns.relationship.test(query)) {
      intent = 'relationship';
    } else if (intentPatterns.filter.test(query)) {
      intent = 'filter';
    }
  }

  // Extract entities from query
  const entityTypes = ['document', 'concept', 'entity', 'term'];
  const detectedType = entityTypes.find(type => query.includes(type));

  // Extract quoted strings or key terms
  const quotedStrings = query.match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, '')) || [];
  const keyTerms = query
    .replace(/^(show me|find|search for|what is|how many|count)\s*/i, '')
    .replace(/\b(all|the|about|related to|between|and)\b/g, '')
    .replace(/[?!.,;:]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(term => term.length > 2);

  return {
    originalQuery: transcript,
    intent: intent || 'search',
    entityType: detectedType,
    searchTerms: [...quotedStrings, ...keyTerms].filter(Boolean),
    quotedStrings,
    filters: {
      type: detectedType
    }
  };
}

// Execute search query using the working /api/voice/data approach
async function executeSearchQuery(parsedQuery: any) {
  const { searchTerms, entityType } = parsedQuery;
  const searchQuery = searchTerms.join(' ');

  try {
    const neo4j = require('neo4j-driver');
    const uri = process.env['NEO4J_URI'] || 'bolt://localhost:7687';
    const username = process.env['NEO4J_USERNAME'] || 'neo4j';
    const password = process.env['NEO4J_PASSWORD'];
    
    if (!password) {
      throw new Error('Neo4j password not configured');
    }
    
    const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
    const session = driver.session();
    
    try {
      let results: any[] = [];
      
      // Get documents - same query as working /api/voice/data
      if (entityType === 'document' || !entityType) {
        const docResult = await session.run('MATCH (d:Document) RETURN d LIMIT 10');
        const documents = docResult.records.map((record: any) => {
          const node = record.get('d');
          return {
            id: node.properties.id,
            name: node.properties.title || node.properties.filename,
            type: 'document',
            content: node.properties.summary || node.properties.description || ''
          };
        });
        results = results.concat(documents);
      }
      
      // Get concepts - same query as working /api/voice/data  
      if ((entityType === 'concept' || !entityType) && results.length < 10) {
        const conceptResult = await session.run('MATCH (c:Concept) RETURN c LIMIT 10');
        const concepts = conceptResult.records.map((record: any) => {
          const node = record.get('c');
          return {
            id: node.properties.id,
            name: node.properties.name,
            type: 'concept', 
            content: node.properties.description || ''
          };
        });
        results = results.concat(concepts);
      }
      
      await session.close();
      await driver.close();
      
      return {
        type: 'search',
        query: searchQuery,
        entityType,
        totalResults: results.length,
        results: results,
        message: results.length > 0 ? `Found ${results.length} results` : 'No results found'
      };
      
    } catch (error) {
      await session.close();
      await driver.close();
      throw error;
    }
  } catch (error) {
    // Fallback to demo results
    return {
      type: 'search',
      query: searchQuery,
      entityType,
      totalResults: 3,
      results: [
        { id: 'demo1', name: 'BDD Discovery Book', type: 'document', content: 'Behavior Driven Development guide' },
        { id: 'demo2', name: 'BDD Concept', type: 'concept', content: 'Software development methodology' },
        { id: 'demo3', name: 'Example Mapping', type: 'concept', content: 'BDD technique for breaking down stories' }
      ],
      message: `Found 3 demo results for: ${searchQuery}`
    };
  }
}

// Execute count query
async function executeCountQuery(parsedQuery: any) {
  try {
    const stats = await knowledgeGraphService.getGraphStats();
    const { entityType } = parsedQuery;

    if (entityType) {
      const entityKey = (entityType + 's') as keyof typeof stats.nodes;
      const count = stats.nodes[entityKey] || 0;
      return {
        type: 'count',
        entityType,
        count,
        message: `You have ${count} ${entityType}${count !== 1 ? 's' : ''} in your knowledge graph.`
      };
    }

    return {
      type: 'count',
      stats: stats.nodes,
      totalNodes: Object.values(stats.nodes).reduce((sum: number, val: any) => sum + val, 0),
      message: `Your knowledge graph contains ${stats.nodes.documents} documents, ${stats.nodes.concepts} concepts, ${stats.nodes.entities} entities, and ${stats.nodes.terms} terms.`
    };
  } catch (error) {
    console.error('❌ Count query error:', error);
    
    // Return demo counts
    const demoStats = {
      documents: 3,
      concepts: 13,
      entities: 16,
      terms: 7
    };

    const { entityType } = parsedQuery;
    
    if (entityType) {
      const entityKey = (entityType + 's') as keyof typeof demoStats;
      const count = demoStats[entityKey] || 0;
      return {
        type: 'count',
        entityType,
        count,
        message: `Demo data shows ${count} ${entityType}${count !== 1 ? 's' : ''}.`
      };
    }

    return {
      type: 'count',
      stats: demoStats,
      totalNodes: Object.values(demoStats).reduce((sum, val) => sum + val, 0),
      message: `Demo knowledge graph contains ${demoStats.documents} documents, ${demoStats.concepts} concepts, ${demoStats.entities} entities, and ${demoStats.terms} terms.`
    };
  }
}

// Execute relationship query
async function executeRelationshipQuery(parsedQuery: any) {
  const { searchTerms } = parsedQuery;
  
  if (searchTerms.length < 2) {
    return {
      type: 'relationship',
      error: 'Please specify at least two items to find relationships between.',
      suggestion: 'Try: "What connects BDD and testing?"'
    };
  }

  // Query for relationships between the terms
  const results = await knowledgeGraphService.queryKnowledgeGraph(
    searchTerms.join(' AND '),
    {
      includeRelationships: true,
      maxDepth: 2
      // Voice queries work without user-specific filtering
    }
  );

  return {
    type: 'relationship',
    searchTerms,
    relationships: results.relationships,
    connectedNodes: [...results.entities, ...results.concepts],
    paths: results.paths,
    message: `Found ${results.relationships.length} relationships connecting these items.`
  };
}

// Execute explain query
async function executeExplainQuery(parsedQuery: any) {
  const { searchTerms } = parsedQuery;
  const searchQuery = searchTerms.join(' ').toLowerCase();

  try {
    // Handle common queries with predefined responses
    const commonExplanations: { [key: string]: any } = {
      'bdd': {
        name: 'BDD (Behavior Driven Development)',
        description: 'Behavior Driven Development (BDD) is a software development methodology that emphasizes collaboration between developers, testers, and business stakeholders. It uses natural language constructs to express the behavior and expected outcomes of software.',
        relatedConcepts: [
          { name: 'User Stories', description: 'Requirements written from the user\'s perspective' },
          { name: 'Acceptance Criteria', description: 'Conditions that define when a user story is complete' },
          { name: 'Gherkin', description: 'Business readable language for behavior specification' }
        ],
        relatedEntities: [
          { name: 'Cucumber', type: 'tool' },
          { name: 'Testing Framework', type: 'concept' }
        ]
      },
      'behavior driven development': {
        name: 'Behavior Driven Development',
        description: 'A development methodology focusing on the behavior of an application for business users. BDD combines practices from TDD and ATDD to provide software teams with shared tools and processes to collaborate on software development.',
        relatedConcepts: [
          { name: 'Test Driven Development', description: 'Write tests before code' },
          { name: 'Acceptance Test Driven Development', description: 'Define acceptance criteria first' }
        ]
      },
      'structured conversation': {
        name: 'Structured Conversation',
        description: 'Structured Conversation is a method used in BDD to facilitate understanding and agreement on requirements. It involves collecting examples and establishing a common language that is understood by everyone.',
        relatedConcepts: [
          { name: 'BDD', description: 'Behavior Driven Development methodology' },
          { name: 'Example Mapping', description: 'Technique for breaking down user stories' }
        ]
      }
    };

    // Check for predefined explanations
    for (const [key, explanation] of Object.entries(commonExplanations)) {
      if (searchQuery.includes(key)) {
        return {
          type: 'explain',
          item: { name: explanation.name, id: key },
          description: explanation.description,
          relatedConcepts: explanation.relatedConcepts || [],
          relatedEntities: explanation.relatedEntities || [],
          relationships: [],
          message: `Here's what I know about ${explanation.name}:`
        };
      }
    }

    // Try to search in the knowledge graph - fallback to graph-only if vector unavailable  
    const explainServiceStatus = await graphRAGService.isAvailable();
    const searchResults = await graphRAGService.enhancedSearch(searchQuery, {
      useVector: explainServiceStatus.vector,
      useGraph: true,
      maxResults: 1
      // Voice queries work without user-specific filtering
    });

    if (searchResults.results.length === 0) {
      return {
        type: 'explain',
        error: `I couldn't find specific information about "${searchQuery}".`,
        suggestion: 'Try asking about: BDD, behavior driven development, testing, or concepts in your knowledge graph.',
        message: `No information found for "${searchQuery}".`
      };
    }

    const item = searchResults.results[0];
    
    if (!item) {
      return {
        type: 'explain',
        error: `No results found for "${searchQuery}".`,
        message: `No information found for "${searchQuery}".`
      };
    }
    
    // Get related information
    const relatedInfo = await knowledgeGraphService.queryKnowledgeGraph(
      item.content || searchQuery,
      {
        includeRelationships: true,
        maxDepth: 1
        // Voice queries work without user-specific filtering
      }
    );

    return {
      type: 'explain',
      item,
      description: item.content || 'No description available.',
      relatedConcepts: relatedInfo.concepts,
      relatedEntities: relatedInfo.entities,
      relationships: relatedInfo.relationships,
      message: `Here's what I found about "${searchQuery}".`
    };
  } catch (error) {
    console.error('❌ Explain query error:', error);
    
    // Return demo explanation for BDD
    if (searchQuery.includes('bdd') || searchQuery.includes('behavior driven development')) {
      return {
        type: 'explain',
        item: { name: 'BDD (Behavior Driven Development)', id: 'bdd' },
        description: 'Behavior Driven Development (BDD) is a software development methodology that emphasizes collaboration between developers, testers, and business stakeholders. It uses natural language constructs to express the behavior and expected outcomes of software.',
        relatedConcepts: [
          { name: 'User Stories' },
          { name: 'Acceptance Criteria' },
          { name: 'Gherkin Syntax' }
        ],
        relatedEntities: [
          { name: 'Cucumber', type: 'tool' }
        ],
        relationships: [],
        message: 'Here\'s what I know about BDD (demo response):'
      };
    }

    return {
      type: 'explain',
      error: `Service unavailable. Showing demo response for "${searchQuery}".`,
      message: `Demo explanation not available for "${searchQuery}". Try asking about BDD or behavior driven development.`
    };
  }
}

/**
 * Simple endpoint to get real Neo4j data for voice queries  
 * GET /api/voice/data
 */
router.get('/data', async (_req: Request, res: Response) => {
  try {
    const neo4j = require('neo4j-driver');
    const uri = process.env['NEO4J_URI'] || 'bolt://localhost:7687';
    const username = process.env['NEO4J_USERNAME'] || 'neo4j';
    const password = process.env['NEO4J_PASSWORD'];
    
    if (!password) {
      return res.json({
        success: false,
        message: 'Neo4j credentials not configured'
      });
    }
    
    const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
    const session = driver.session();
    
    try {
      // Get all documents
      const docResult = await session.run('MATCH (d:Document) RETURN d LIMIT 10');
      const documents = docResult.records.map((record: any) => {
        const node = record.get('d');
        return {
          id: node.properties.id,
          name: node.properties.title || node.properties.filename,
          type: 'document',
          content: node.properties.summary || node.properties.description || '',
          properties: node.properties
        };
      });
      
      // Get all concepts  
      const conceptResult = await session.run('MATCH (c:Concept) RETURN c LIMIT 10');
      const concepts = conceptResult.records.map((record: any) => {
        const node = record.get('c');
        return {
          id: node.properties.id,
          name: node.properties.name,
          type: 'concept', 
          content: node.properties.description || '',
          properties: node.properties
        };
      });
      
      return res.json({
        success: true,
        message: 'Real Neo4j data retrieved',
        data: {
          documents: documents,
          concepts: concepts,
          totalNodes: documents.length + concepts.length
        }
      });
      
    } finally {
      await session.close();
      await driver.close();
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get conversation history for a session
 * GET /api/voice/conversation/:sessionId
 */
router.get('/conversation/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }
    const history = conversationalAIService.getConversationHistory(sessionId);
    
    return res.json({
      success: true,
      data: {
        sessionId,
        messages: history,
        messageCount: history.length
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to get conversation history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Clear conversation for a session
 * DELETE /api/voice/conversation/:sessionId
 */
router.delete('/conversation/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }
    conversationalAIService.clearConversation(sessionId);
    
    return res.json({
      success: true,
      message: `Conversation ${sessionId} cleared`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to clear conversation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get AI service status
 * GET /api/voice/ai-status
 */
router.get('/ai-status', async (_req: Request, res: Response) => {
  try {
    const status = await conversationalAIService.isAvailable();
    
    return res.json({
      success: true,
      data: {
        ...status,
        features: {
          conversationalMemory: true,
          hybridModels: true,
          contextualResponses: true,
          smartFollowUps: true
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to check AI status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test endpoint to debug voice queries
 * GET /api/voice/test
 */
router.get('/test', async (_req: Request, res: Response) => {
  try {
    const neo4j = require('neo4j-driver');
    const uri = process.env['NEO4J_URI'];
    const username = process.env['NEO4J_USERNAME'] || 'neo4j';
    const password = process.env['NEO4J_PASSWORD'];
    
    if (!uri || !password) {
      return res.json({
        success: false,
        message: 'Neo4j credentials not available',
        env: { hasUri: !!uri, hasPassword: !!password }
      });
    }
    
    const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
    const session = driver.session();
    
    try {
      // Simple document query
      const result = await session.run('MATCH (d:Document) RETURN d.id as id, d.title as title LIMIT 3');
      const documents = result.records.map((record: any) => ({
        id: record.get('id'),
        title: record.get('title')
      }));
      
      return res.json({
        success: true,
        message: 'Direct Neo4j query test',
        data: {
          documentCount: documents.length,
          documents: documents
        }
      });
    } finally {
      await session.close();
      await driver.close();
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Fallback AI response generator when AI service fails
function generateFallbackResponse(results: any, query: string): string {
  if (!results) {
    return `I couldn't process your query "${query}". The AI service is temporarily unavailable, but you can still browse your results below.`;
  }

  if (results.type === 'count') {
    const total = results.totalNodes || 0;
    return `Your knowledge graph contains ${total} items. The AI assistant is temporarily unavailable, but the basic count information is shown below.`;
  }

  if (results.type === 'search' && results.results?.length > 0) {
    return `I found ${results.results.length} results for your query. The AI assistant is temporarily unavailable, but you can explore the results below.`;
  }

  if (results.message) {
    return `${results.message} (AI assistant temporarily unavailable)`;
  }

  return 'Results are shown below. The AI assistant is temporarily unavailable.';
}

export default router;