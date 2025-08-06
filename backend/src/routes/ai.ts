import { Router, Request, Response } from 'express';
import { aiModelService, AIModel, SummarizationRequest, QuestionGenerationRequest, ConceptExtractionRequest } from '../services/AIModelService';
import { authenticateToken } from '../middleware/auth';
import { Document } from '../models/Document';
import { knowledgeGraphService } from '../services/KnowledgeGraphService';
import { entityExtractionService } from '../services/EntityExtractionService';
import { graphRAGService } from '../services/GraphRAGService';

const router = Router();

// Get available AI models
router.get('/models', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const availableModels = aiModelService.getAvailableModels();
    const modelStatus = await aiModelService.healthCheck();
    
    return res.json({
      success: true,
      data: {
        availableModels,
        modelStatus
      }
    });
  } catch (error) {
    console.error('Error fetching AI models:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch available AI models'
    });
  }
});

// Summarize document
router.post('/summarize', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { documentId, model, summaryLength, customText } = req.body;
    
    if (!documentId && !customText) {
      return res.status(400).json({
        success: false,
        message: 'Either documentId or customText is required'
      });
    }

    let documentText = customText;
    let documentTitle = 'Custom Text';

    // If documentId is provided, fetch the document with text extraction
    if (documentId) {
      const document = await Document.findById(documentId, true); // Request text extraction
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Verify user owns the document (skip for now, no auth implemented)
      // if (document.userId !== (req.user as any).id) {
      //   return res.status(403).json({
      //     success: false,
      //     message: 'Access denied'
      //   });
      // }

      documentText = document.extractedText || document.originalText || '';
      documentTitle = document.filename;
    }

    if (!documentText || documentText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No text content available for summarization'
      });
    }

    // Truncate document to avoid rate limits (approx 8k tokens = 32k chars)
    const maxChars = model === AIModel.GPT_4 ? 10000 : 
                     model === AIModel.GPT_4_TURBO ? 25000 : 
                     50000; // GPT-3.5 has higher limits
    
    const truncatedText = documentText.length > maxChars 
      ? documentText.substring(0, maxChars) + '\n\n[Document truncated due to length...]'
      : documentText;

    const summarizationRequest: SummarizationRequest = {
      documentText: truncatedText,
      documentTitle,
      model: model || AIModel.GPT_3_5_TURBO,
      summaryLength: summaryLength || 'medium',
      prompt: '' // Will be constructed in the service
    };

    const summary = await aiModelService.summarizeDocument(summarizationRequest);

    return res.json({
      success: true,
      data: {
        summary: summary.content,
        model: summary.model,
        usage: summary.usage,
        cost: summary.cost,
        documentTitle,
        summaryLength: summaryLength || 'medium'
      }
    });

  } catch (error) {
    console.error('Error summarizing document:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to summarize document'
    });
  }
});

// Generate questions from document
router.post('/questions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { documentId, model, questionCount, difficulty, customText } = req.body;
    
    if (!documentId && !customText) {
      return res.status(400).json({
        success: false,
        message: 'Either documentId or customText is required'
      });
    }

    let documentText = customText;
    let documentTitle = 'Custom Text';

    // If documentId is provided, fetch the document with text extraction
    if (documentId) {
      const document = await Document.findById(documentId, true); // Request text extraction
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Verify user owns the document (skip for now, no auth implemented)
      // if (document.userId !== (req.user as any).id) {
      //   return res.status(403).json({
      //     success: false,
      //     message: 'Access denied'
      //   });
      // }

      documentText = document.extractedText || document.originalText || '';
      documentTitle = document.filename;
    }

    if (!documentText || documentText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No text content available for question generation'
      });
    }

    // Truncate document to avoid rate limits
    const maxChars = model === AIModel.GPT_4 ? 10000 : 
                     model === AIModel.GPT_4_TURBO ? 25000 : 
                     50000;
    
    const truncatedText = documentText.length > maxChars 
      ? documentText.substring(0, maxChars) + '\n\n[Document truncated due to length...]'
      : documentText;

    const questionRequest: QuestionGenerationRequest = {
      documentText: truncatedText,
      documentTitle,
      model: model || AIModel.GPT_3_5_TURBO,
      questionCount: questionCount || 5,
      difficulty: difficulty || 'medium',
      prompt: '' // Will be constructed in the service
    };

    const questions = await aiModelService.generateQuestions(questionRequest);

    return res.json({
      success: true,
      data: {
        questions: questions.content,
        model: questions.model,
        usage: questions.usage,
        cost: questions.cost,
        documentTitle,
        questionCount: questionCount || 5,
        difficulty: difficulty || 'medium'
      }
    });

  } catch (error) {
    console.error('Error generating questions:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate questions'
    });
  }
});

// Extract concepts from document
router.post('/concepts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { documentId, model, maxConcepts, customText } = req.body;
    
    if (!documentId && !customText) {
      return res.status(400).json({
        success: false,
        message: 'Either documentId or customText is required'
      });
    }

    let documentText = customText;
    let documentTitle = 'Custom Text';

    // If documentId is provided, fetch the document with text extraction
    if (documentId) {
      const document = await Document.findById(documentId, true); // Request text extraction
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Verify user owns the document (skip for now, no auth implemented)
      // if (document.userId !== (req.user as any).id) {
      //   return res.status(403).json({
      //     success: false,
      //     message: 'Access denied'
      //   });
      // }

      documentText = document.extractedText || document.originalText || '';
      documentTitle = document.filename;
    }

    if (!documentText || documentText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No text content available for concept extraction'
      });
    }

    // Truncate document to avoid rate limits
    const maxChars = model === AIModel.GPT_4 ? 10000 : 
                     model === AIModel.GPT_4_TURBO ? 25000 : 
                     50000;
    
    const truncatedText = documentText.length > maxChars 
      ? documentText.substring(0, maxChars) + '\n\n[Document truncated due to length...]'
      : documentText;

    const conceptRequest: ConceptExtractionRequest = {
      documentText: truncatedText,
      documentTitle,
      model: model || AIModel.GPT_3_5_TURBO,
      maxConcepts: maxConcepts || 10,
      prompt: '' // Will be constructed in the service
    };

    const concepts = await aiModelService.extractConcepts(conceptRequest);

    // Try to parse JSON response
    let parsedConcepts: any = [];
    try {
      parsedConcepts = JSON.parse(concepts.content);
    } catch (parseError) {
      // If JSON parsing fails, return raw content
      parsedConcepts = concepts.content;
    }

    return res.json({
      success: true,
      data: {
        concepts: parsedConcepts,
        rawResponse: concepts.content,
        model: concepts.model,
        usage: concepts.usage,
        cost: concepts.cost,
        documentTitle,
        maxConcepts: maxConcepts || 10
      }
    });

  } catch (error) {
    console.error('Error extracting concepts:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to extract concepts'
    });
  }
});

// Analyze document (combined analysis)
router.post('/analyze', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { documentId, model, includeAnalysis } = req.body;
    
    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }

    const document = await Document.findById(documentId, true); // Request text extraction
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Verify user owns the document (skip for now, no auth implemented)
    // if (document.userId !== (req.user as any).id) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Access denied'
    //   });
    // }

    const documentText = document.extractedText || document.originalText || '';
    const documentTitle = document.filename;

    if (!documentText || documentText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No text content available for analysis'
      });
    }

    const selectedModel = model || AIModel.GPT_3_5_TURBO;
    const analysis: any = {};
    let totalCost = 0;

    // Generate summary if requested
    if (!includeAnalysis || includeAnalysis.summary !== false) {
      try {
        const summary = await aiModelService.summarizeDocument({
          documentText,
          documentTitle,
          model: selectedModel,
          summaryLength: 'medium',
          prompt: ''
        });
        analysis.summary = summary.content;
        totalCost += summary.cost || 0;
      } catch (error) {
        analysis.summary = { error: 'Failed to generate summary' };
      }
    }

    // Generate questions if requested
    if (includeAnalysis && includeAnalysis.questions) {
      try {
        const questions = await aiModelService.generateQuestions({
          documentText,
          documentTitle,
          model: selectedModel,
          questionCount: 5,
          difficulty: 'medium',
          prompt: ''
        });
        analysis.questions = questions.content;
        totalCost += questions.cost || 0;
      } catch (error) {
        analysis.questions = { error: 'Failed to generate questions' };
      }
    }

    // Extract concepts if requested
    if (includeAnalysis && includeAnalysis.concepts) {
      try {
        const concepts = await aiModelService.extractConcepts({
          documentText,
          documentTitle,
          model: selectedModel,
          maxConcepts: 8,
          prompt: ''
        });
        
        try {
          analysis.concepts = JSON.parse(concepts.content);
        } catch (parseError) {
          analysis.concepts = concepts.content;
        }
        totalCost += concepts.cost || 0;
      } catch (error) {
        analysis.concepts = { error: 'Failed to extract concepts' };
      }
    }

    return res.json({
      success: true,
      data: {
        documentId,
        documentTitle,
        model: selectedModel,
        analysis,
        totalCost,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error analyzing document:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to analyze document'
    });
  }
});

// Graph-enhanced document analysis
router.post('/analyze-graph', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { 
      documentId, 
      model, 
      includeAnalysis = {
        summary: true,
        questions: true,
        concepts: true,
        entities: true,
        relationships: true,
        graphContext: true
      },
    } = req.body;
    
    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required'
      });
    }

    console.log(`🧠 Graph-enhanced analysis for document: ${documentId}`);

    const document = await Document.findById(documentId, true);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const documentText = document.extractedText || document.originalText || '';
    const documentTitle = document.originalName || document.filename;

    if (!documentText || documentText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No text content available for analysis'
      });
    }

    const selectedModel = model || AIModel.GPT_4;
    const analysis: any = {};
    let totalCost = 0;
    const startTime = Date.now();

    // Step 1: Extract knowledge graph data
    let extractionResults = null;
    if (includeAnalysis.entities || includeAnalysis.relationships || includeAnalysis.concepts) {
      try {
        console.log('🔍 Extracting entities, concepts, and relationships...');
        extractionResults = await entityExtractionService.extractFromDocument(
          documentText,
          documentTitle,
          { model: selectedModel }
        );
        totalCost += extractionResults.cost || 0;

        if (includeAnalysis.entities) {
          analysis.entities = extractionResults.entities;
        }
        if (includeAnalysis.concepts) {
          analysis.concepts = extractionResults.concepts;
        }
        if (includeAnalysis.relationships) {
          analysis.relationships = extractionResults.relationships;
        }
      } catch (error) {
        console.warn('⚠️ Knowledge extraction failed:', error);
        analysis.extractionError = 'Failed to extract knowledge graph data';
      }
    }

    // Step 2: Traditional AI analysis with graph context
    if (includeAnalysis.summary) {
      try {
        let summaryPrompt = '';
        if (extractionResults) {
          const topConcepts = extractionResults.concepts.slice(0, 5).map(c => c.name).join(', ');
          const topEntities = extractionResults.entities.slice(0, 5).map(e => e.name).join(', ');
          summaryPrompt = `\n\nKey concepts in this document: ${topConcepts}\nKey entities: ${topEntities}\n\nPlease incorporate these key concepts and entities into your summary.`;
        }

        const summary = await aiModelService.summarizeDocument({
          documentText,
          documentTitle,
          model: selectedModel,
          summaryLength: 'medium',
          prompt: summaryPrompt
        });
        analysis.summary = summary.content;
        totalCost += summary.cost || 0;
      } catch (error) {
        analysis.summary = { error: 'Failed to generate summary' };
      }
    }

    if (includeAnalysis.questions) {
      try {
        let questionPrompt = '';
        if (extractionResults) {
          const keyRelationships = extractionResults.relationships.slice(0, 3)
            .map(r => `${r.from} ${r.type} ${r.to}`).join(', ');
          questionPrompt = `\n\nKey relationships: ${keyRelationships}\n\nGenerate questions that explore these relationships and concepts.`;
        }

        const questions = await aiModelService.generateQuestions({
          documentText,
          documentTitle,
          model: selectedModel,
          questionCount: 5,
          difficulty: 'medium',
          prompt: questionPrompt
        });
        analysis.questions = questions.content;
        totalCost += questions.cost || 0;
      } catch (error) {
        analysis.questions = { error: 'Failed to generate questions' };
      }
    }

    // Step 3: Get graph context from knowledge graph
    if (includeAnalysis.graphContext && await knowledgeGraphService.healthCheck()) {
      try {
        console.log('🔗 Getting graph context...');
        
        // Find related documents
        const relatedDocuments = await knowledgeGraphService.findRelatedDocuments(documentId, {
          maxDepth: 2,
          limit: 5,
          minSimilarity: 0.3
        });

        // Get document knowledge data
        const documentKnowledge = await knowledgeGraphService.queryKnowledgeGraph(`document:${documentId}`, {
          userId: (req.user as any)?.userId || undefined,
          maxDepth: 1,
          limit: 50,
          includeRelationships: true
        });

        analysis.graphContext = {
          relatedDocuments: relatedDocuments.slice(0, 5),
          documentConcepts: documentKnowledge.concepts,
          documentEntities: documentKnowledge.entities,
          conceptRelationships: documentKnowledge.relationships,
          totalRelatedDocs: relatedDocuments.length
        };
      } catch (error) {
        console.warn('⚠️ Graph context retrieval failed:', error);
        analysis.graphContext = { error: 'Graph context not available' };
      }
    }

    // Step 4: Store extraction results in knowledge graph if available
    if (extractionResults && await knowledgeGraphService.healthCheck() && !analysis.extractionError) {
      try {
        const graphDocument = {
          id: document.id,
          filename: document.filename,
          title: documentTitle,
          uploadedAt: new Date(document.uploadedAt || new Date()),
          fileType: document.fileType || 'unknown',
          fileSize: document.fileSize || 0,
          userId: (req.user as any)?.userId || 'unknown',
          summary: extractionResults.summary
        };

        await knowledgeGraphService.storeExtractionResults(graphDocument, extractionResults);
        
        // Update document metadata
        await Document.updateMetadata(documentId, {
          graphProcessed: true,
          graphProcessedAt: new Date().toISOString(),
          entitiesCount: extractionResults.entities.length,
          conceptsCount: extractionResults.concepts.length,
          relationshipsCount: extractionResults.relationships.length
        });

        analysis.graphProcessed = true;
      } catch (error) {
        console.warn('⚠️ Failed to store in knowledge graph:', error);
        analysis.graphProcessed = false;
      }
    }

    const processingTime = Date.now() - startTime;

    return res.json({
      success: true,
      data: {
        documentId,
        documentTitle,
        model: selectedModel,
        analysis,
        totalCost,
        processingTime,
        timestamp: new Date().toISOString(),
        enhancedWithGraph: true
      }
    });

  } catch (error) {
    console.error('Error in graph-enhanced analysis:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to perform graph-enhanced analysis'
    });
  }
});

// Context-aware question answering using Graph RAG
router.post('/ask', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { 
      question, 
      documentId, 
      useGraphContext = true,
      model = AIModel.GPT_4,
      maxContextDocuments = 3
    } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Question is required and must be a non-empty string'
      });
    }

    console.log(`❓ Context-aware question: "${question}"`);

    let contextDocuments: Array<{id: string; title: string; content: string}> = [];
    let graphContext: any = null;

    // If documentId provided, get that document plus related ones
    if (documentId) {
      const primaryDoc = await Document.findById(documentId, true);
      if (primaryDoc) {
        contextDocuments.push({
          id: primaryDoc.id,
          title: primaryDoc.originalName || primaryDoc.filename,
          content: primaryDoc.extractedText || primaryDoc.originalText || ''
        });

        // Get related documents using Graph RAG
        if (useGraphContext) {
          try {
            const relatedDocs = await graphRAGService.findRelatedDocuments(documentId, {
              maxDepth: 2,
              limit: maxContextDocuments - 1,
              includeGraph: true,
              includeVector: true
            });

            for (const doc of relatedDocs) {
              contextDocuments.push({
                id: doc.documentId,
                title: doc.documentName,
                content: doc.content
              });
            }

            // Get graph context for the question
            const questionAnalysis = await graphRAGService.analyzeQuery(question);
            graphContext = questionAnalysis;
          } catch (error) {
            console.warn('⚠️ Failed to get graph context for question:', error);
          }
        }
      }
    } else if (useGraphContext) {
      // No specific document - use Graph RAG to find relevant documents
      try {
        const searchResults = await graphRAGService.enhancedSearch(question, {
          maxResults: maxContextDocuments,
          useVector: true,
          useGraph: true
        });

        contextDocuments = searchResults.results.map(result => ({
          id: result.documentId,
          title: result.documentName,
          content: result.content
        }));

        graphContext = searchResults.searchStats;
      } catch (error) {
        console.warn('⚠️ Graph RAG search failed for question:', error);
      }
    }

    // Build context-aware prompt
    let contextPrompt = `Question: ${question}\n\n`;
    
    if (contextDocuments.length > 0) {
      contextPrompt += `Relevant Documents:\n`;
      contextDocuments.forEach((doc, index) => {
        contextPrompt += `\nDocument ${index + 1}: ${doc.title}\n${doc.content.substring(0, 2000)}...\n`;
      });
    }

    if (graphContext) {
      if (graphContext.entities && Array.isArray(graphContext.entities)) {
        contextPrompt += `\nKey Entities: ${graphContext.entities.map((e: any) => e.name).join(', ')}\n`;
      }
      if (graphContext.concepts && Array.isArray(graphContext.concepts)) {
        contextPrompt += `Key Concepts: ${graphContext.concepts.map((c: any) => c.name).join(', ')}\n`;
      }
    }

    contextPrompt += `\nPlease answer the question based on the provided context. If the answer cannot be found in the context, please say so clearly.`;

    // Generate answer using AI
    const response = await aiModelService.generateCompletion({
      prompt: contextPrompt,
      model,
      temperature: 0.3,
      maxTokens: 1000,
      systemPrompt: 'You are a helpful assistant that answers questions based on provided document context. Be precise and cite specific information from the documents when possible.'
    });

    return res.json({
      success: true,
      data: {
        question: question.trim(),
        answer: response.content,
        contextDocuments: contextDocuments.map(doc => ({
          id: doc.id,
          title: doc.title
        })),
        graphContext: graphContext ? {
          usedGraphRAG: true,
          entityCount: Array.isArray(graphContext.entities) ? graphContext.entities.length : 0,
          conceptCount: Array.isArray(graphContext.concepts) ? graphContext.concepts.length : 0
        } : { usedGraphRAG: false },
        model: response.model,
        usage: response.usage,
        cost: response.cost,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error answering question:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to answer question'
    });
  }
});

// Health check for AI services
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await aiModelService.healthCheck();
    const availableModels = aiModelService.getAvailableModels();
    const graphAvailable = await knowledgeGraphService.healthCheck();
    const graphRAGAvailable = await graphRAGService.isAvailable();
    
    return res.json({
      success: true,
      data: {
        services: health,
        availableModels,
        graphServices: {
          knowledgeGraph: graphAvailable,
          graphRAG: graphRAGAvailable
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error checking AI service health:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check AI service health'
    });
  }
});

export default router;