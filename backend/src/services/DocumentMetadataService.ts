import fs from 'fs';
import path from 'path';

export interface DocumentMetadata {
  id: string;
  originalName: string;
  filename: string; // UUID filename
  mimetype: string;
  size: number;
  uploadedAt: string;
  status: 'processed' | 'failed';
  graphProcessed?: boolean;
  graphProcessedAt?: string;
  entitiesCount?: number;
  conceptsCount?: number;
  relationshipsCount?: number;
  [key: string]: any;
}

export class DocumentMetadataService {
  private static metadataFile = path.join(__dirname, '../../uploads/metadata.json');
  private static metadata: Map<string, DocumentMetadata> = new Map();
  private static initialized = false;

  private static initialize() {
    if (this.initialized) return;

    try {
      if (fs.existsSync(this.metadataFile)) {
        const data = fs.readFileSync(this.metadataFile, 'utf-8');
        const metadataArray = JSON.parse(data);
        metadataArray.forEach((item: DocumentMetadata) => {
          this.metadata.set(item.filename, item);
        });
        console.log(`📄 Loaded metadata for ${metadataArray.length} documents`);
      } else {
        console.log('📄 No existing metadata file found, starting fresh');
      }
    } catch (error) {
      console.warn('⚠️  Failed to load document metadata:', error);
    }

    this.initialized = true;
  }

  private static save() {
    try {
      const metadataArray = Array.from(this.metadata.values());
      fs.writeFileSync(this.metadataFile, JSON.stringify(metadataArray, null, 2));
    } catch (error) {
      console.error('❌ Failed to save document metadata:', error);
    }
  }

  public static store(metadata: DocumentMetadata) {
    this.initialize();
    this.metadata.set(metadata.filename, metadata);
    this.save();
    console.log(`📄 Stored metadata for: ${metadata.originalName} -> ${metadata.filename}`);
  }

  public static get(filename: string): DocumentMetadata | null {
    this.initialize();
    return this.metadata.get(filename) || null;
  }

  public static getAll(): DocumentMetadata[] {
    this.initialize();
    return Array.from(this.metadata.values());
  }

  public static getByOriginalName(originalName: string): DocumentMetadata | null {
    this.initialize();
    for (const metadata of this.metadata.values()) {
      if (metadata.originalName === originalName) {
        return metadata;
      }
    }
    return null;
  }

  public static set(filename: string, metadataUpdate: Partial<DocumentMetadata>): void {
    this.initialize();
    const existing = this.metadata.get(filename);
    if (existing) {
      const updated = { ...existing, ...metadataUpdate };
      this.metadata.set(filename, updated);
      this.save();
      console.log(`📄 Updated metadata for: ${filename}`);
    } else {
      console.warn(`⚠️ Attempted to update metadata for non-existent document: ${filename}`);
    }
  }
}