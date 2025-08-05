import React, { useState, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import { NeuralAnimation } from './BrandElements';
import { Upload, File, CheckCircle, AlertCircle, X } from 'lucide-react';

interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface DocumentUploaderProps {
  onFileUpload?: (files: File[]) => void;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  className?: string;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onFileUpload,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  maxFiles = 10,
  className
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supported file types
  const supportedTypes = ['.pdf', '.docx', '.txt', '.md', '.epub'];
  const supportedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'application/epub+zip'
  ];

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size exceeds ${Math.round(maxFileSize / (1024 * 1024))}MB limit`;
    }

    // Check file type
    const fileName = file.name.toLowerCase();
    const isValidExtension = supportedTypes.some(ext => fileName.endsWith(ext));
    const isValidMimeType = supportedMimeTypes.includes(file.type);

    if (!isValidExtension && !isValidMimeType) {
      return `Unsupported file type. Supported: ${supportedTypes.join(', ')}`;
    }

    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string): React.ReactNode => {
    const ext = fileName.toLowerCase().split('.').pop();
    const iconClass = "h-5 w-5";
    
    switch (ext) {
      case 'pdf':
        return <File className={cn(iconClass, "text-red-500")} />;
      case 'docx':
        return <File className={cn(iconClass, "text-blue-500")} />;
      case 'txt':
      case 'md':
        return <File className={cn(iconClass, "text-gray-500")} />;
      case 'epub':
        return <File className={cn(iconClass, "text-purple-500")} />;
      default:
        return <File className={iconClass} />;
    }
  };

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    // Check total file limit
    if (uploadedFiles.length + fileArray.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const validFiles: File[] = [];
    const newUploadedFiles: UploadedFile[] = [];

    // Validate each file
    fileArray.forEach(file => {
      const error = validateFile(file);
      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      if (error) {
        newUploadedFiles.push({
          id: fileId,
          file,
          status: 'error',
          progress: 0,
          error
        });
      } else {
        validFiles.push(file);
        newUploadedFiles.push({
          id: fileId,
          file,
          status: 'uploading',
          progress: 0
        });
      }
    });

    setUploadedFiles(prev => [...prev, ...newUploadedFiles]);

    if (validFiles.length > 0) {
      setIsUploading(true);
      
      // Simulate upload process (replace with actual API call)
      for (const file of validFiles) {
        const fileUpload = newUploadedFiles.find(uf => uf.file === file);
        if (!fileUpload) continue;

        // Simulate upload progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 200));
          
          setUploadedFiles(prev =>
            prev.map(uf =>
              uf.id === fileUpload.id
                ? { ...uf, progress, status: progress === 100 ? 'processing' : 'uploading' }
                : uf
            )
          );
        }

        // Simulate processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setUploadedFiles(prev =>
          prev.map(uf =>
            uf.id === fileUpload.id
              ? { ...uf, status: 'completed', progress: 100 }
              : uf
          )
        );
      }

      setIsUploading(false);
      onFileUpload?.(validFiles);
    }
  }, [uploadedFiles.length, maxFiles, maxFileSize, onFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(uf => uf.id !== fileId));
  };

  const clearAll = () => {
    setUploadedFiles([]);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Upload Area */}
      <Card className="relative overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-6 w-6 text-infinity-blue-600" />
            <span>Upload Documents</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer group',
              isDragOver 
                ? 'border-infinity-blue-500 bg-infinity-blue-50' 
                : 'border-neural-gray-300 hover:border-infinity-blue-400 hover:bg-infinity-blue-25'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {/* Neural Animation Background */}
            <NeuralAnimation className="absolute inset-0 opacity-20" />
            
            <div className="relative z-10">
              <div className="mb-4">
                <div className={cn(
                  "w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-all duration-300",
                  isDragOver 
                    ? 'bg-infinity-blue-100 scale-110' 
                    : 'bg-neural-gray-100 group-hover:bg-infinity-blue-100 group-hover:scale-105'
                )}>
                  <Upload className={cn(
                    "h-8 w-8 transition-colors",
                    isDragOver ? 'text-infinity-blue-600' : 'text-neural-gray-500 group-hover:text-infinity-blue-600'
                  )} />
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-neural-gray-900 mb-2">
                Drop files here or click to browse
              </h3>
              
              <p className="text-neural-gray-600 mb-4">
                Support for PDF, DOCX, TXT, MD, and EPUB files
              </p>
              
              <div className="flex flex-wrap justify-center gap-2 text-sm text-neural-gray-500">
                <span>Max {Math.round(maxFileSize / (1024 * 1024))}MB per file</span>
                <span>•</span>
                <span>Up to {maxFiles} files</span>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={supportedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Uploaded Files ({uploadedFiles.length})</CardTitle>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear All
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploadedFiles.map((uploadedFile) => (
              <FileItem
                key={uploadedFile.id}
                uploadedFile={uploadedFile}
                onRemove={removeFile}
                formatFileSize={formatFileSize}
                getFileIcon={getFileIcon}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Upload Summary */}
      {uploadedFiles.length > 0 && (
        <Card className="bg-gradient-to-r from-infinity-blue-50 to-infinity-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-neural-gray-600">
                  <span className="font-medium text-neural-gray-900">
                    {uploadedFiles.filter(f => f.status === 'completed').length}
                  </span> of {uploadedFiles.length} files processed
                </div>
                {isUploading && (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-infinity-blue-600"></div>
                    <span className="text-sm text-infinity-blue-600">Processing...</span>
                  </div>
                )}
              </div>
              <Button 
                variant="neural" 
                size="sm"
                disabled={uploadedFiles.filter(f => f.status === 'completed').length === 0}
              >
                Start Knowledge Graph Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// File Item Component
interface FileItemProps {
  uploadedFile: UploadedFile;
  onRemove: (fileId: string) => void;
  formatFileSize: (bytes: number) => string;
  getFileIcon: (fileName: string) => React.ReactNode;
}

const FileItem: React.FC<FileItemProps> = ({
  uploadedFile,
  onRemove,
  formatFileSize,
  getFileIcon
}) => {
  const getStatusIcon = () => {
    switch (uploadedFile.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'uploading':
      case 'processing':
        return <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-infinity-blue-600"></div>;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (uploadedFile.status) {
      case 'uploading':
        return 'Uploading...';
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Ready for analysis';
      case 'error':
        return uploadedFile.error || 'Error occurred';
      default:
        return '';
    }
  };

  return (
    <div className={cn(
      'flex items-center space-x-4 p-4 rounded-lg border transition-all duration-200',
      uploadedFile.status === 'error' 
        ? 'border-red-200 bg-red-50' 
        : uploadedFile.status === 'completed'
        ? 'border-green-200 bg-green-50'
        : 'border-neural-gray-200 bg-white'
    )}>
      <div className="flex-shrink-0">
        {getFileIcon(uploadedFile.file.name)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-neural-gray-900 truncate">
            {uploadedFile.file.name}
          </p>
          <button
            onClick={() => onRemove(uploadedFile.id)}
            className="flex-shrink-0 p-1 hover:bg-neural-gray-100 rounded"
          >
            <X className="h-4 w-4 text-neural-gray-400" />
          </button>
        </div>
        
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-xs text-neural-gray-500">
            {formatFileSize(uploadedFile.file.size)}
          </span>
          <span className="text-xs text-neural-gray-400">•</span>
          <span className="text-xs text-neural-gray-500">
            {getStatusText()}
          </span>
        </div>
        
        {(uploadedFile.status === 'uploading' || uploadedFile.status === 'processing') && (
          <Progress value={uploadedFile.progress} className="h-2" />
        )}
      </div>
      
      <div className="flex-shrink-0">
        {getStatusIcon()}
      </div>
    </div>
  );
};