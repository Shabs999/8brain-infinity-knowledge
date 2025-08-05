// Temporary Document model for AI routes
// This is a placeholder until we integrate with real database
export interface DocumentInterface {
  _id: string;
  filename: string;
  userId: string;
  extractedText?: string;
  originalText?: string;
}

export class Document {
  static async findById(id: string): Promise<DocumentInterface | null> {
    // Mock implementation - returns null for now
    // This will be replaced with real database integration
    console.log(`Document.findById called with id: ${id}`);
    return null;
  }
}