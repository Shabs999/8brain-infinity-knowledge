// Temporary Document model for AI routes
// This is a placeholder until we integrate with real database
export interface DocumentInterface {
  _id: string;
  filename: string;
  userId: string;
  extractedText?: string;
  originalText?: string;
  uploadedAt?: string;
  fileSize?: number;
  fileType?: string;
}

// In-memory storage for demo purposes
const mockDocuments: Map<string, DocumentInterface> = new Map();

export class Document {
  static async findById(id: string): Promise<DocumentInterface | null> {
    console.log(`Document.findById called with id: ${id}`);
    return mockDocuments.get(id) || null;
  }

  static async findByUserId(userId: string): Promise<DocumentInterface[]> {
    const userDocs = Array.from(mockDocuments.values()).filter(doc => doc.userId === userId);
    console.log(`Document.findByUserId called with userId: ${userId}, found ${userDocs.length} documents`);
    return userDocs;
  }

  static async create(docData: Omit<DocumentInterface, '_id'>): Promise<DocumentInterface> {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const document: DocumentInterface = {
      _id: id,
      ...docData,
      uploadedAt: new Date().toISOString()
    };
    mockDocuments.set(id, document);
    console.log(`Document created with id: ${id}, filename: ${document.filename}`);
    return document;
  }

  static async findAll(): Promise<DocumentInterface[]> {
    const allDocs = Array.from(mockDocuments.values());
    console.log(`Document.findAll called, found ${allDocs.length} documents`);
    return allDocs;
  }
}