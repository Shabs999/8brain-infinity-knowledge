import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export interface ExtractedDocument {
  id: string;
  filename: string;
  originalSize: number;
  mimeType: string;
  extractedText: string;
  textLength: number;
  chunks: TextChunk[];
  metadata: DocumentMetadata;
  processingTime: number;
  extractedAt: Date;
}

export interface TextChunk {
  id: string;
  index: number;
  text: string;
  startPosition: number;
  endPosition: number;
  wordCount: number;
  tokens: number; // Estimated token count for embeddings
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount?: number;
  language?: string;
  subject?: string;
  keywords?: string[];
}

export class TextExtractionService {
  private readonly CHUNK_SIZE = 1000; // Optimal size for OpenAI embeddings
  private readonly CHUNK_OVERLAP = 200; // Overlap between chunks

  /**
   * Extract text from various document formats
   */
  async extractText(filePath: string, mimeType: string): Promise<ExtractedDocument> {
    const startTime = Date.now();
    const filename = path.basename(filePath);
    const stats = fs.statSync(filePath);
    
    console.log(`🔄 Starting text extraction for: ${filename}`);
    
    try {
      let extractedText = '';
      let metadata: DocumentMetadata = {};

      switch (mimeType) {
        case 'application/pdf':
          ({ text: extractedText, metadata } = await this.extractFromPDF(filePath));
          break;
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          ({ text: extractedText, metadata } = await this.extractFromDOCX(filePath));
          break;
        
        case 'text/plain':
          extractedText = await this.extractFromTXT(filePath);
          break;
        
        case 'text/markdown':
          extractedText = await this.extractFromMarkdown(filePath);
          break;
        
        default:
          throw new Error(`Unsupported file type: ${mimeType}`);
      }

      // Clean and process text
      const cleanedText = this.cleanText(extractedText);
      
      // Create text chunks for embedding
      const chunks = this.createTextChunks(cleanedText);
      
      const processingTime = Date.now() - startTime;
      
      const document: ExtractedDocument = {
        id: this.generateDocumentId(filename),
        filename,
        originalSize: stats.size,
        mimeType,
        extractedText: cleanedText,
        textLength: cleanedText.length,
        chunks,
        metadata,
        processingTime,
        extractedAt: new Date()
      };

      console.log(`✅ Text extraction completed for ${filename}:`);
      console.log(`   📄 Text length: ${cleanedText.length} characters`);
      console.log(`   📦 Chunks created: ${chunks.length}`);
      console.log(`   ⏱️  Processing time: ${processingTime}ms`);

      return document;

    } catch (error) {
      console.error(`❌ Text extraction failed for ${filename}:`, error);
      throw new Error(`Failed to extract text from ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from PDF files
   */
  private async extractFromPDF(filePath: string): Promise<{ text: string; metadata: DocumentMetadata }> {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    
    const metadata: DocumentMetadata = {};
    
    if (pdfData.info?.Title) metadata.title = pdfData.info.Title;
    if (pdfData.info?.Author) metadata.author = pdfData.info.Author;
    if (pdfData.info?.CreationDate) metadata.creationDate = new Date(pdfData.info.CreationDate);
    if (pdfData.info?.ModDate) metadata.modificationDate = new Date(pdfData.info.ModDate);
    if (pdfData.numpages) metadata.pageCount = pdfData.numpages;
    if (pdfData.info?.Subject) metadata.subject = pdfData.info.Subject;
    if (pdfData.info?.Keywords) {
      metadata.keywords = pdfData.info.Keywords.split(',').map((k: string) => k.trim());
    }

    return {
      text: pdfData.text,
      metadata
    };
  }

  /**
   * Extract text from DOCX files
   */
  private async extractFromDOCX(filePath: string): Promise<{ text: string; metadata: DocumentMetadata }> {
    const dataBuffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    
    // Extract basic metadata (mammoth doesn't provide detailed metadata)
    const metadata: DocumentMetadata = {
      title: path.basename(filePath, '.docx')
    };

    return {
      text: result.value,
      metadata
    };
  }

  /**
   * Extract text from plain text files
   */
  private async extractFromTXT(filePath: string): Promise<string> {
    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Extract text from Markdown files
   */
  private async extractFromMarkdown(filePath: string): Promise<string> {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Remove markdown syntax for cleaner text
    return content
      .replace(/^#{1,6}\s+/gm, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove links, keep text
  }

  /**
   * Clean and normalize extracted text
   */
  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\n{3,}/g, '\n\n') // Reduce excessive line breaks
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^\s+|\s+$/g, '') // Trim
      .replace(/[^\x20-\x7E\n]/g, ''); // Remove non-printable characters except newlines
  }

  /**
   * Create text chunks optimized for embedding
   */
  private createTextChunks(text: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    const words = text.split(/\s+/);
    let currentChunk = '';
    let chunkIndex = 0;
    let startPosition = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testChunk = currentChunk ? `${currentChunk} ${word}` : word;

      // Check if adding this word would exceed our chunk size
      if (testChunk && testChunk.length > this.CHUNK_SIZE && currentChunk) {
        // Create chunk from current content
        const chunk: TextChunk = {
          id: `chunk_${chunkIndex}`,
          index: chunkIndex,
          text: currentChunk.trim(),
          startPosition,
          endPosition: startPosition + currentChunk.length,
          wordCount: currentChunk.split(/\s+/).length,
          tokens: this.estimateTokenCount(currentChunk)
        };
        
        chunks.push(chunk);
        
        // Start new chunk with overlap
        const overlapWords = currentChunk.split(/\s+/).slice(-Math.floor(this.CHUNK_OVERLAP / 10));
        currentChunk = [...overlapWords, word].join(' ');
        startPosition = chunk.endPosition - (overlapWords.join(' ').length);
        chunkIndex++;
      } else {
        currentChunk = testChunk || '';
      }
    }

    // Add the final chunk if there's remaining content
    if (currentChunk.trim()) {
      const chunk: TextChunk = {
        id: `chunk_${chunkIndex}`,
        index: chunkIndex,
        text: currentChunk.trim(),
        startPosition,
        endPosition: startPosition + currentChunk.length,
        wordCount: currentChunk.split(/\s+/).length,
        tokens: this.estimateTokenCount(currentChunk)
      };
      
      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Estimate token count for OpenAI API
   * Rough estimation: 1 token ≈ 4 characters for English text
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Generate unique document ID
   */
  private generateDocumentId(filename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const cleanFilename = filename.replace(/[^a-zA-Z0-9]/g, '_');
    return `doc_${timestamp}_${cleanFilename}_${random}`;
  }

  /**
   * Get supported file types
   */
  static getSupportedMimeTypes(): string[] {
    return [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];
  }

  /**
   * Check if file type is supported
   */
  static isSupported(mimeType: string): boolean {
    return this.getSupportedMimeTypes().includes(mimeType);
  }
}

export const textExtractionService = new TextExtractionService();