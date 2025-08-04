// Validation Utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// File Utilities
export const getSupportedFileTypes = (): string[] => {
  return ['.pdf', '.docx', '.txt', '.md', '.epub'];
};

export const isValidFileType = (filename: string): boolean => {
  const supportedTypes = getSupportedFileTypes();
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return supportedTypes.includes(extension);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Text Processing Utilities
export const extractKeywords = (text: string): string[] => {
  // Simple keyword extraction - can be enhanced with NLP libraries
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  // Remove common stop words
  const stopWords = new Set(['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'about']);
  
  return [...new Set(words.filter(word => !stopWords.has(word)))];
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

// Graph Utilities
export const calculateNodeSize = (connections: number): number => {
  const minSize = 10;
  const maxSize = 50;
  const size = minSize + (connections * 2);
  return Math.min(size, maxSize);
};

export const getNodeColor = (type: 'document' | 'concept' | 'entity'): string => {
  const colors = {
    document: '#3b82f6', // infinity-blue-600
    concept: '#a855f7',  // infinity-purple-600
    entity: '#f59e0b'    // knowledge-gold-600
  };
  return colors[type];
};

// Time Utilities
export const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
};

// API Utilities
export const createApiUrl = (endpoint: string): string => {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://api.8brain.ai' 
    : 'http://localhost:8000';
  return `${baseUrl}/api${endpoint}`;
};

// Error Handling Utilities
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Constants
export const APP_CONSTANTS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_DOCUMENTS_PER_USER: 1000,
  VECTOR_DIMENSION: 1536,
  MAX_QUERY_LENGTH: 1000,
  PAGINATION_LIMIT: 20,
} as const;