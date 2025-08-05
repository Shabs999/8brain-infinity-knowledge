import { Router, Request, Response } from 'express';
import { aiModelService, AIModel, SummarizationRequest, QuestionGenerationRequest, ConceptExtractionRequest } from '../services/AIModelService';
import { authenticateToken } from '../middleware/auth';
import { Document } from '../models/Document';

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

    // If documentId is provided, fetch the document
    if (documentId) {
      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Verify user owns the document
      if (document.userId !== (req.user as any).id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

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

    // If documentId is provided, fetch the document
    if (documentId) {
      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Verify user owns the document
      if (document.userId !== (req.user as any).id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

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

    // If documentId is provided, fetch the document
    if (documentId) {
      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      // Verify user owns the document
      if (document.userId !== (req.user as any).id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

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

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Verify user owns the document
    if (document.userId !== (req.user as any).id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

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

// Health check for AI services
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await aiModelService.healthCheck();
    const availableModels = aiModelService.getAvailableModels();
    
    return res.json({
      success: true,
      data: {
        services: health,
        availableModels,
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