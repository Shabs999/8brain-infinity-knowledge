import fs from 'fs';
import path from 'path';
import { textExtractionService } from '../services/TextExtractionService';
import { DocumentMetadataService } from '../services/DocumentMetadataService';

// Temporary Document model for AI routes
// This is a placeholder until we integrate with real database
export interface DocumentInterface {
  _id: string;
  id: string; // Alias for _id
  filename: string;
  originalName?: string; // Original filename before UUID rename
  userId: string;
  extractedText?: string;
  originalText?: string;
  uploadedAt?: string;
  fileSize?: number;
  fileType?: string;
  metadata: {
    graphProcessed?: boolean;
    graphProcessedAt?: string;
    entitiesCount?: number;
    conceptsCount?: number;
    relationshipsCount?: number;
    [key: string]: any;
  };
}

const uploadsDir = path.join(__dirname, '../../uploads');

export class Document {
  static async findById(id: string, extractText: boolean = false): Promise<DocumentInterface | null> {
    console.log(`Document.findById called with id: ${id}, extractText: ${extractText}`);
    
    try {
      const filePath = path.join(uploadsDir, id);
      
      if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filePath}`);
        return null;
      }
      
      // Try to get metadata from the metadata service first
      const metadata = DocumentMetadataService.get(id);
      
      const stats = fs.statSync(filePath);
      const ext = path.extname(id).toLowerCase();
      
      let fileType = 'unknown';
      switch (ext) {
        case '.pdf': fileType = 'pdf'; break;
        case '.docx': fileType = 'docx'; break;
        case '.txt': fileType = 'txt'; break;
        case '.md': fileType = 'md'; break;
      }
      
      let extractedText = '';
      
      // Only extract text if specifically requested (for AI analysis)
      if (extractText) {
        try {
          const extractedDoc = await textExtractionService.extractText(filePath, `application/${fileType}`);
          extractedText = extractedDoc.extractedText;
        } catch (error) {
          console.warn(`Failed to extract text from ${id}:`, error);
          // For text files, try direct read
          if (ext === '.txt' || ext === '.md') {
            extractedText = fs.readFileSync(filePath, 'utf-8');
          }
        }
      }
      
      const documentMetadata: DocumentInterface['metadata'] = {
        graphProcessed: metadata?.graphProcessed || false,
        entitiesCount: metadata?.entitiesCount || 0,
        conceptsCount: metadata?.conceptsCount || 0,
        relationshipsCount: metadata?.relationshipsCount || 0
      };
      
      if (metadata?.graphProcessedAt) {
        documentMetadata.graphProcessedAt = metadata.graphProcessedAt;
      }

      return {
        _id: id,
        id: id, // Add id alias
        filename: id, // Keep the UUID filename
        originalName: metadata?.originalName || id, // Use original name if available
        userId: 'current-user', // Placeholder until auth is implemented
        extractedText,
        uploadedAt: metadata?.uploadedAt || stats.birthtime.toISOString(),
        fileSize: metadata?.size || stats.size,
        fileType: metadata?.mimetype?.includes('pdf') ? 'pdf' : fileType,
        metadata: documentMetadata
      };
      
    } catch (error) {
      console.error(`Error finding document ${id}:`, error);
      return null;
    }
  }

  static async findByUserId(userId: string): Promise<DocumentInterface[]> {
    console.log(`Document.findByUserId called with userId: ${userId}`);
    
    const documents: DocumentInterface[] = [];
    
    try {
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        
        for (const filename of files) {
          // Don't extract text for listing, only for AI analysis
          const doc = await this.findById(filename, false);
          if (doc) {
            documents.push(doc);
          }
        }
      }
    } catch (error) {
      console.error('Error finding documents by user:', error);
    }
    
    console.log(`Found ${documents.length} documents for user ${userId}`);
    return documents;
  }

  static async create(docData: Omit<DocumentInterface, '_id'>): Promise<DocumentInterface> {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const document: DocumentInterface = {
      _id: id,
      ...docData,
      uploadedAt: new Date().toISOString()
    };
    console.log(`Document created with id: ${id}, filename: ${document.filename}`);
    return document;
  }

  static async findAll(): Promise<DocumentInterface[]> {
    return this.findByUserId('current-user');
  }

  static async updateMetadata(documentId: string, metadataUpdate: {
    graphProcessed?: boolean;
    graphProcessedAt?: string;
    entitiesCount?: number;
    conceptsCount?: number;
    relationshipsCount?: number;
    [key: string]: any;
  }): Promise<void> {
    try {
      // Get existing metadata
      const existingMetadata = DocumentMetadataService.get(documentId) || {};
      
      // Merge with new metadata
      const updatedMetadata = {
        ...existingMetadata,
        ...metadataUpdate
      };
      
      // Store updated metadata
      DocumentMetadataService.set(documentId, updatedMetadata);
      
      console.log(`Updated metadata for document ${documentId}:`, metadataUpdate);
    } catch (error) {
      console.error(`Failed to update metadata for document ${documentId}:`, error);
      throw error;
    }
  }
}