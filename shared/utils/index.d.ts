export declare const validateEmail: (email: string) => boolean;
export declare const validatePassword: (password: string) => boolean;
export declare const getSupportedFileTypes: () => string[];
export declare const isValidFileType: (filename: string) => boolean;
export declare const formatFileSize: (bytes: number) => string;
export declare const extractKeywords: (text: string) => string[];
export declare const truncateText: (text: string, maxLength: number) => string;
export declare const calculateNodeSize: (connections: number) => number;
export declare const getNodeColor: (type: "document" | "concept" | "entity") => string;
export declare const formatTimeAgo: (date: Date) => string;
export declare const createApiUrl: (endpoint: string) => string;
export declare class AppError extends Error {
    statusCode: number;
    code?: string | undefined;
    constructor(message: string, statusCode?: number, code?: string | undefined);
}
export declare const handleApiError: (error: any) => string;
export declare const APP_CONSTANTS: {
    readonly MAX_FILE_SIZE: number;
    readonly MAX_DOCUMENTS_PER_USER: 1000;
    readonly VECTOR_DIMENSION: 1536;
    readonly MAX_QUERY_LENGTH: 1000;
    readonly PAGINATION_LIMIT: 20;
};
//# sourceMappingURL=index.d.ts.map