import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { textExtractionService, TextExtractionService } from '../services/TextExtractionService';
import { embeddingService } from '../services/EmbeddingService';
import { vectorService } from '../services/VectorService';
import { semanticSearchService } from '../services/SemanticSearchService';
import { DocumentMetadataService } from '../services/DocumentMetadataService';
import { entityExtractionService } from '../services/EntityExtractionService';
import { knowledgeGraphService } from '../services/KnowledgeGraphService';

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
router.post('/upload', upload.array('documents', 10), async (req: Request, res: Response) => {
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

              // Step 4: Store embeddings in semantic search service for immediate use
              try {
                console.log(`🔍 Storing embeddings in semantic search service...`);
                semanticSearchService.storeEmbeddings(documentId, embeddingBatch.vectors);
                console.log(`✅ Embeddings stored in semantic search service`);
              } catch (searchError) {
                console.warn(`⚠️  Semantic search storage failed: ${searchError}`);
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

          // Step 5: Graph RAG Processing
          let graphProcessing: {
            status: 'pending' | 'completed' | 'partial' | 'failed';
            message: string;
          } = {
            status: 'pending',
            message: 'Ready for knowledge graph construction'
          };

          let graphResults = null;

          if (embeddingService.isAvailable()) { // Use embeddingService availability as proxy for AI services
            try {
              console.log(`🕸️  Starting knowledge graph processing for ${file.originalname}...`);
              
              // Extract entities and relationships from the document text
              const extractionResults = await entityExtractionService.extractFromDocument(
                extractedDocument.extractedText,
                extractedDocument.metadata?.title || file.originalname
              );

              console.log(`✅ Entity extraction completed for ${file.originalname}`);
              console.log(`   🏷️  Extracted ${extractionResults.entities.length} entities`);
              console.log(`   💡 Extracted ${extractionResults.concepts.length} concepts`);
              console.log(`   🔗 Extracted ${extractionResults.relationships.length} relationships`);
              console.log(`   📚 Extracted ${extractionResults.terms.length} terms`);
              console.log(`   💰 Cost: $${extractionResults.cost.toFixed(4)}`);

              // Store in knowledge graph
              const graphDocument = {
                id: documentId,
                filename: file.originalname,
                title: extractedDocument.metadata?.title || file.originalname,
                uploadedAt: new Date(),
                fileType: path.extname(file.originalname).toLowerCase(),
                fileSize: file.size,
                userId: 'anonymous', // TODO: Use real user ID from authentication
                summary: extractionResults.summary
              };

              await knowledgeGraphService.storeExtractionResults(graphDocument, extractionResults);
              
              graphProcessing = {
                status: 'completed',
                message: `Knowledge graph created with ${extractionResults.entities.length} entities, ${extractionResults.concepts.length} concepts, and ${extractionResults.relationships.length} relationships`
              };

              graphResults = {
                entityCount: extractionResults.entities.length,
                conceptCount: extractionResults.concepts.length,
                relationshipCount: extractionResults.relationships.length,
                termCount: extractionResults.terms.length,
                processingTime: extractionResults.processingTime,
                cost: extractionResults.cost
              };

              console.log(`✅ Knowledge graph storage completed for ${file.originalname}`);

            } catch (graphError) {
              console.error(`❌ Graph processing failed for ${file.originalname}:`, graphError);
              graphProcessing = {
                status: 'failed',
                message: `Graph processing failed: ${graphError instanceof Error ? graphError.message : 'Unknown error'}`
              };
            }
          } else {
            console.log(`⚠️  Graph services not available - skipping knowledge graph processing`);
            console.log(`   - AI services not available (check OpenAI configuration)`);
          }
          
          // Store document metadata for later retrieval
          const docMetadata = {
            id: documentId,
            originalName: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            status: 'processed' as const
          };

          DocumentMetadataService.store(docMetadata);

          // Enhanced metadata with complete processing results
          const metadata = {
            ...docMetadata,
            path: file.path,
            
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
            
            // Knowledge graph processing results
            graphProcessing,
            graphResults
          };

          return metadata;
          
        } catch (error) {
          console.error(`❌ Text extraction failed for ${file.originalname}:`, error);
          
          // Store metadata even for failed documents
          const failedMetadata = {
            id: documentId,
            originalName: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            status: 'failed' as const
          };

          DocumentMetadataService.store(failedMetadata);

          // Return metadata with error status
          return {
            ...failedMetadata,
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

// Process existing documents through Graph RAG
router.post('/:id/process-graph', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Find document metadata
    const storedMetadata = DocumentMetadataService.getAll();
    const docMetadata = storedMetadata.find(meta => meta.filename === id || meta.id === id);
    
    if (!docMetadata) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    const filePath = path.join(uploadsDir, docMetadata.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Document file not found on disk'
      });
    }

    console.log(`🕸️  Starting Graph RAG processing for existing document: ${docMetadata.originalName}`);

    // Re-extract text if needed (we'll use cached results if available)
    const extractedDocument = await textExtractionService.extractText(
      filePath,
      docMetadata.mimetype
    );

    let graphProcessing: {
      status: 'pending' | 'completed' | 'partial' | 'failed';
      message: string;
    } = {
      status: 'pending',
      message: 'Ready for knowledge graph construction'
    };

    let graphResults = null;

    if (embeddingService.isAvailable()) { // Use embeddingService availability as proxy for AI services
      try {
        console.log(`🔍 Extracting entities and relationships...`);
        
        // Extract entities and relationships from the document text
        const extractionResults = await entityExtractionService.extractFromDocument(
          extractedDocument.extractedText,
          extractedDocument.metadata?.title || docMetadata.originalName
        );

        console.log(`✅ Entity extraction completed`);
        console.log(`   🏷️  Extracted ${extractionResults.entities.length} entities`);
        console.log(`   💡 Extracted ${extractionResults.concepts.length} concepts`);
        console.log(`   🔗 Extracted ${extractionResults.relationships.length} relationships`);
        console.log(`   📚 Extracted ${extractionResults.terms.length} terms`);
        console.log(`   💰 Cost: $${extractionResults.cost.toFixed(4)}`);

        // Store in knowledge graph
        const graphDocument = {
          id: docMetadata.id,
          filename: docMetadata.originalName,
          title: extractedDocument.metadata?.title || docMetadata.originalName,
          uploadedAt: new Date(docMetadata.uploadedAt),
          fileType: path.extname(docMetadata.filename).toLowerCase(),
          fileSize: docMetadata.size,
          userId: 'anonymous', // TODO: Use real user ID from authentication
          summary: extractionResults.summary
        };

        await knowledgeGraphService.storeExtractionResults(graphDocument, extractionResults);
        
        graphProcessing = {
          status: 'completed',
          message: `Knowledge graph created with ${extractionResults.entities.length} entities, ${extractionResults.concepts.length} concepts, and ${extractionResults.relationships.length} relationships`
        };

        graphResults = {
          entityCount: extractionResults.entities.length,
          conceptCount: extractionResults.concepts.length,
          relationshipCount: extractionResults.relationships.length,
          termCount: extractionResults.terms.length,
          processingTime: extractionResults.processingTime,
          cost: extractionResults.cost
        };

        console.log(`✅ Knowledge graph storage completed for ${docMetadata.originalName}`);

      } catch (graphError) {
        console.error(`❌ Graph processing failed:`, graphError);
        graphProcessing = {
          status: 'failed',
          message: `Graph processing failed: ${graphError instanceof Error ? graphError.message : 'Unknown error'}`
        };
      }
    } else {
      graphProcessing = {
        status: 'failed',
        message: 'Graph services not available (OpenAI or Neo4j not configured)'
      };
    }

    res.json({
      success: true,
      message: 'Graph RAG processing completed',
      data: {
        documentId: docMetadata.id,
        originalName: docMetadata.originalName,
        graphProcessing,
        graphResults,
        textExtraction: {
          textLength: extractedDocument.textLength,
          chunkCount: extractedDocument.chunks.length
        }
      }
    });

  } catch (error) {
    console.error('Graph processing error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Graph processing failed'
    });
  }
});

// Get all user documents
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Get documents from metadata service
    const storedMetadata = DocumentMetadataService.getAll();
    const documents: any[] = [];
    
    for (const metadata of storedMetadata) {
      const filePath = path.join(uploadsDir, metadata.filename);
      
      // Only include documents that still exist on disk and were processed successfully
      if (fs.existsSync(filePath) && metadata.status === 'processed') {
        const ext = path.extname(metadata.filename).toLowerCase();
        let fileType = 'unknown';
        
        switch (ext) {
          case '.pdf': fileType = 'pdf'; break;
          case '.docx': fileType = 'docx'; break;
          case '.txt': fileType = 'txt'; break;
          case '.md': fileType = 'md'; break;
        }
        
        documents.push({
          id: metadata.filename, // Use filename as ID for now
          filename: metadata.filename,
          originalName: metadata.originalName, // Now we have the real original name!
          fileSize: metadata.size,
          fileType: fileType,
          uploadedAt: metadata.uploadedAt,
          hasExtractedText: true,
          status: 'completed'
        });
      }
    }

    // Remove duplicates based on originalName (in case same file was uploaded multiple times)
    const uniqueDocuments = documents.reduce((acc, current) => {
      const existing = acc.find((item: any) => item.originalName === current.originalName);
      if (!existing) {
        acc.push(current);
      } else {
        // Keep the more recent upload
        if (new Date(current.uploadedAt) > new Date(existing.uploadedAt)) {
          const index = acc.findIndex((item: any) => item.originalName === existing.originalName);
          acc[index] = current;
        }
      }
      return acc;
    }, []);

    res.json({
      success: true,
      data: {
        documents: uniqueDocuments,
        total: uniqueDocuments.length,
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