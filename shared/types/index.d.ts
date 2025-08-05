export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface AuthRequest {
    email: string;
    password: string;
}
export interface AuthResponse {
    user: User;
    token: string;
}
export interface Document {
    id: string;
    userId: string;
    title: string;
    content: string;
    type: DocumentType;
    size: number;
    uploadedAt: Date;
    processedAt?: Date;
    status: ProcessingStatus;
    metadata: DocumentMetadata;
}
export type DocumentType = 'pdf' | 'docx' | 'txt' | 'md' | 'epub';
export type ProcessingStatus = 'uploading' | 'processing' | 'completed' | 'failed';
export interface DocumentMetadata {
    author?: string;
    pages?: number;
    wordCount?: number;
    language?: string;
    extractedConcepts?: string[];
}
export interface VectorRecord {
    id: string;
    values: number[];
    metadata: {
        userId: string;
        documentId: string;
        content: string;
        concepts: string[];
        chunkIndex: number;
    };
}
export interface Concept {
    id: string;
    name: string;
    type: ConceptType;
    description?: string;
    documentIds: string[];
    embedding?: number[];
}
export type ConceptType = 'entity' | 'topic' | 'keyword' | 'theme';
export interface Relationship {
    id: string;
    source: string;
    target: string;
    type: RelationshipType;
    weight: number;
    evidence: string[];
}
export type RelationshipType = 'relates_to' | 'influences' | 'contradicts' | 'supports' | 'mentions';
export interface QueryRequest {
    query: string;
    userId: string;
    maxResults?: number;
    includeGraph?: boolean;
}
export interface QueryResponse {
    answer: string;
    sources: QuerySource[];
    connections: QueryConnection[];
    executionTime: number;
    confidence: number;
}
export interface QuerySource {
    document: string;
    chunk: string;
    score: number;
    pageNumber?: number;
}
export interface QueryConnection {
    concept1: string;
    concept2: string;
    relationship: string;
    strength: number;
}
export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}
export interface UploadProgress {
    documentId: string;
    progress: number;
    stage: UploadStage;
    message: string;
}
export type UploadStage = 'uploading' | 'extracting' | 'embedding' | 'indexing' | 'completed' | 'error';
export interface GraphNode {
    id: string;
    label: string;
    type: 'document' | 'concept' | 'entity';
    size: number;
    color: string;
    x?: number;
    y?: number;
}
export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    label: string;
    weight: number;
    color: string;
}
export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}
export interface VoiceRecording {
    isRecording: boolean;
    transcript: string;
    confidence: number;
    isProcessing: boolean;
}
export interface UserAnalytics {
    totalDocuments: number;
    totalQueries: number;
    averageResponseTime: number;
    topConcepts: string[];
    queryHistory: QueryHistory[];
}
export interface QueryHistory {
    id: string;
    query: string;
    timestamp: Date;
    responseTime: number;
    satisfaction?: number;
}
//# sourceMappingURL=index.d.ts.map