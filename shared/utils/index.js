"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_CONSTANTS = exports.handleApiError = exports.AppError = exports.createApiUrl = exports.formatTimeAgo = exports.getNodeColor = exports.calculateNodeSize = exports.truncateText = exports.extractKeywords = exports.formatFileSize = exports.isValidFileType = exports.getSupportedFileTypes = exports.validatePassword = exports.validateEmail = void 0;
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};
exports.validatePassword = validatePassword;
const getSupportedFileTypes = () => {
    return ['.pdf', '.docx', '.txt', '.md', '.epub'];
};
exports.getSupportedFileTypes = getSupportedFileTypes;
const isValidFileType = (filename) => {
    const supportedTypes = (0, exports.getSupportedFileTypes)();
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return supportedTypes.includes(extension);
};
exports.isValidFileType = isValidFileType;
const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
exports.formatFileSize = formatFileSize;
const extractKeywords = (text) => {
    const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);
    const stopWords = new Set(['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'about']);
    return [...new Set(words.filter(word => !stopWords.has(word)))];
};
exports.extractKeywords = extractKeywords;
const truncateText = (text, maxLength) => {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength - 3) + '...';
};
exports.truncateText = truncateText;
const calculateNodeSize = (connections) => {
    const minSize = 10;
    const maxSize = 50;
    const size = minSize + (connections * 2);
    return Math.min(size, maxSize);
};
exports.calculateNodeSize = calculateNodeSize;
const getNodeColor = (type) => {
    const colors = {
        document: '#3b82f6',
        concept: '#a855f7',
        entity: '#f59e0b'
    };
    return colors[type];
};
exports.getNodeColor = getNodeColor;
const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60)
        return 'just now';
    if (diffInSeconds < 3600)
        return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
        return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000)
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
};
exports.formatTimeAgo = formatTimeAgo;
const createApiUrl = (endpoint) => {
    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://api.8brain.ai'
        : 'http://localhost:8000';
    return `${baseUrl}/api${endpoint}`;
};
exports.createApiUrl = createApiUrl;
class AppError extends Error {
    constructor(message, statusCode = 500, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
const handleApiError = (error) => {
    if (error.response?.data?.message) {
        return error.response.data.message;
    }
    if (error.message) {
        return error.message;
    }
    return 'An unexpected error occurred';
};
exports.handleApiError = handleApiError;
exports.APP_CONSTANTS = {
    MAX_FILE_SIZE: 50 * 1024 * 1024,
    MAX_DOCUMENTS_PER_USER: 1000,
    VECTOR_DIMENSION: 1536,
    MAX_QUERY_LENGTH: 1000,
    PAGINATION_LIMIT: 20,
};
//# sourceMappingURL=index.js.map