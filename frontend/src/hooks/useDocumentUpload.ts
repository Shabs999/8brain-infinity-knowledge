import { useState, useCallback } from 'react';
import axios from 'axios';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    files: Array<{
      id: string;
      originalName: string;
      filename: string;
      size: number;
      uploadedAt: string;
      status: string;
    }>;
    totalFiles: number;
    totalSize: number;
  };
}

interface UseDocumentUploadReturn {
  uploadFiles: (files: File[]) => Promise<UploadResponse>;
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  reset: () => void;
}

export const useDocumentUpload = (): UseDocumentUploadReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = useCallback(async (files: File[]): Promise<UploadResponse> => {
    setIsUploading(true);
    setError(null);
    setProgress(null);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('documents', file);
      });

      const response = await axios.post<UploadResponse>('/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage
            });
          }
        },
      });

      setIsUploading(false);
      return response.data;
      
    } catch (err) {
      setIsUploading(false);
      
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || err.message || 'Upload failed';
        setError(errorMessage);
        throw new Error(errorMessage);
      } else {
        const errorMessage = 'An unexpected error occurred';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    }
  }, []);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(null);
    setError(null);
  }, []);

  return {
    uploadFiles,
    isUploading,
    progress,
    error,
    reset
  };
};