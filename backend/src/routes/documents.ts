import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { textExtractionService, TextExtractionService } from '../services/TextExtractionService';
import { embeddingService } from '../services/EmbeddingService';
import { vectorService } from '../services/VectorService';
import { Document } from '../models/Document';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter for supported document types
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = ['.pdf', '.docx', '.txt', '.md'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (TextExtractionService.isSupported(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    return cb(null, true);
  } else {
    return cb(new Error(`Unsupported file type. Supported: PDF, DOCX, TXT, MD`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10 // Maximum 10 files per upload
  }
});

// Document upload endpoint
router.post('/upload', authenticateToken, upload.array('documents', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided'
      });
    }

    // Process each uploaded file with text extraction
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        const documentId = uuidv4();
        
        try {
          console.log(`🧠 Processing document: ${file.originalname}`);
          
          // Step 1: Extract text from the uploaded document
          const extractedDocument = await textExtractionService.extractText(
            file.path,
            file.mimetype
          );
          
          console.log(`✅ Text extraction completed for ${file.originalname}`);
          console.log(`   📝 Extracted ${extractedDocument.textLength} characters`);
          console.log(`   📦 Created ${extractedDocument.chunks.length} chunks`);
          
          let vectorProcessing: {
            status: 'pending' | 'completed' | 'partial' | 'failed';
            message: string;
          } = {
            status: 'pending',
            message: 'Ready for embedding generation'
          };
          
          let embeddingResults = null;

          // Step 2: Generate embeddings if OpenAI is available
          if (embeddingService.isAvailable()) {
            try {
              console.log(`🤖 Generating embeddings for ${file.originalname}...`);
              
              const embeddingBatch = await embeddingService.generateEmbeddings(
                extractedDocument.chunks,
                documentId,
                file.originalname,
                file.mimetype,
                extractedDocument.metadata
              );

              console.log(`✅ Embedding generation completed for ${file.originalname}`);
              console.log(`   🎯 Generated ${embeddingBatch.totalVectors} vectors`);
              console.log(`   💰 Cost: $${embeddingBatch.cost.toFixed(4)}`);
              console.log(`   📊 Tokens used: ${embeddingBatch.totalTokensUsed.toLocaleString()}`);

              // Step 3: Store vectors in Pinecone if available
              try {
                await vectorService.storeBatch(embeddingBatch);
                
                vectorProcessing = {
                  status: 'completed',
                  message: `Generated ${embeddingBatch.totalVectors} vectors and stored in Pinecone`
                };

                embeddingResults = {
                  vectorCount: embeddingBatch.totalVectors,
                  tokensUsed: embeddingBatch.totalTokensUsed,
                  cost: embeddingBatch.cost,
                  processingTime: embeddingBatch.processingTime
                };

              } catch (vectorError) {
                console.warn(`⚠️  Vector storage failed: ${vectorError}`);
                vectorProcessing = {
                  status: 'partial',
                  message: `Embeddings generated but vector storage failed: ${vectorError instanceof Error ? vectorError.message : 'Unknown error'}`
                };

                embeddingResults = {
                  vectorCount: embeddingBatch.totalVectors,
                  tokensUsed: embeddingBatch.totalTokensUsed,
                  cost: embeddingBatch.cost,
                  processingTime: embeddingBatch.processingTime,
                  storageError: vectorError instanceof Error ? vectorError.message : 'Unknown error'
                };
              }

            } catch (embeddingError) {
              console.error(`❌ Embedding generation failed: ${embeddingError}`);
              vectorProcessing = {
                status: 'failed',
                message: `Embedding generation failed: ${embeddingError instanceof Error ? embeddingError.message : 'Unknown error'}`
              };
            }
          } else {
            console.log(`⚠️  OpenAI not available - skipping embedding generation`);
          }
          
          // Store document in mock database
          const userId = (req.user as any)?.id || 'demo-user';
          const document = await Document.create({
            filename: file.originalname,
            userId: userId,
            extractedText: extractedDocument.extractedText,
            originalText: extractedDocument.extractedText,
            fileSize: file.size,
            fileType: file.mimetype
          });

          // Enhanced metadata with complete processing results
          const metadata = {
            id: documentId,
            originalName: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            status: 'processed' as const,
            path: file.path,
            documentId: document._id, // Include database document ID
            
            // Text extraction results
            textExtraction: {
              extractedText: extractedDocument.extractedText,
              textLength: extractedDocument.textLength,
              chunkCount: extractedDocument.chunks.length,
              processingTime: extractedDocument.processingTime,
              metadata: extractedDocument.metadata
            },
            
            // Vector processing results
            vectorProcessing,
            embeddingResults,
            
            // Next phase: Knowledge graph processing
            graphProcessing: {
              status: 'pending' as const, 
              message: 'Ready for knowledge graph construction'
            }
          };

          return metadata;
          
        } catch (error) {
          console.error(`❌ Text extraction failed for ${file.originalname}:`, error);
          
          // Return metadata with error status
          return {
            id: documentId,
            originalName: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            status: 'failed' as const,
            path: file.path,
            error: error instanceof Error ? error.message : 'Text extraction failed'
          };
        }
      })
    );

    return res.json({
      success: true,
      message: `Successfully uploaded ${files.length} file(s)`,
      data: {
        files: processedFiles,
        totalFiles: files.length,
        totalSize: files.reduce((sum, file) => sum + file.size, 0)
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      const files = req.files as Express.Multer.File[];
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Upload failed'
    });
  }
});

// Get all user documents
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id || 'demo-user';
    const documents = await Document.findByUserId(userId);

    res.json({
      success: true,
      data: {
        documents: documents.map(doc => ({
          id: doc._id,
          filename: doc.filename,
          uploadedAt: doc.uploadedAt,
          fileSize: doc.fileSize,
          fileType: doc.fileType,
          hasExtractedText: !!doc.extractedText
        })),
        total: documents.length,
        page: 1,
        limit: 20
      }
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents'
    });
  }
});

// Get document by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // TODO: In next phase, implement:
    // - Document retrieval from database
    // - File access permissions
    // - Document metadata and processing status

    res.json({
      success: true,
      data: {
        id,
        message: 'Document endpoint - implementation pending'
      }
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve document'
    });
  }
});

// Delete document
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // TODO: In next phase, implement:
    // - Document deletion from database
    // - File cleanup from storage
    // - Vector and graph data cleanup

    res.json({
      success: true,
      message: `Document ${id} deletion - implementation pending`
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document'
    });
  }
});

// Document processing status
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // TODO: In next phase, implement:
    // - Processing status from database
    // - Real-time processing updates
    // - Error status and messages

    res.json({
      success: true,
      data: {
        id,
        status: 'completed',
        progress: 100,
        stage: 'indexed',
        message: 'Document processed successfully'
      }
    });
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get processing status'
    });
  }
});

export default router;