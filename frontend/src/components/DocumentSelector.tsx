import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import axios from 'axios';
import {
  FileText,
  Calendar,
  CheckCircle,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface Document {
  _id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  fileType: string;
  uploadDate: string;
  extractedText?: string;
  textLength?: number;
  status: 'processing' | 'completed' | 'error';
}

interface DocumentSelectorProps {
  onDocumentSelect: (documentId: string, document: Document) => void;
  selectedDocumentId?: string;
  className?: string;
}

export const DocumentSelector: React.FC<DocumentSelectorProps> = ({
  onDocumentSelect,
  selectedDocumentId,
  className
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/documents', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Filter to only show completed documents with extracted text
        const completedDocs = response.data.data.filter((doc: Document) => 
          doc.status === 'completed' && doc.extractedText && doc.extractedText.trim().length > 0
        );
        setDocuments(completedDocs);
      }
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      setError(error.response?.data?.message || 'Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return <div className="w-8 h-8 bg-red-100 text-red-600 rounded flex items-center justify-center text-xs font-bold">PDF</div>;
      case 'docx':
        return <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs font-bold">DOC</div>;
      case 'txt':
        return <div className="w-8 h-8 bg-gray-100 text-gray-600 rounded flex items-center justify-center text-xs font-bold">TXT</div>;
      case 'md':
        return <div className="w-8 h-8 bg-green-100 text-green-600 rounded flex items-center justify-center text-xs font-bold">MD</div>;
      default:
        return <FileText className="w-8 h-8 text-neural-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-infinity-blue-600" />
          <p className="text-neutral-gray-600">Loading your documents...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="text-red-500 mb-4">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Failed to load documents</p>
            <p className="text-sm text-neutral-gray-500 mt-1">{error}</p>
          </div>
          <Button variant="outline" onClick={fetchDocuments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-neural-gray-400" />
          <h3 className="text-lg font-semibold text-neural-gray-600 mb-2">No Documents Available</h3>
          <p className="text-sm text-neutral-gray-500 mb-4">
            Upload and process some documents first to use AI analysis features.
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/upload'}>
            Go to Upload
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Select Document to Analyze
        </CardTitle>
        <p className="text-sm text-neutral-gray-600">
          Choose a document to generate AI insights, summaries, and analysis.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {documents.map((document) => (
            <div
              key={document._id}
              onClick={() => onDocumentSelect(document._id, document)}
              className={cn(
                'p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md',
                selectedDocumentId === document._id
                  ? 'border-infinity-blue-500 bg-infinity-blue-50 shadow-sm'
                  : 'border-neural-gray-200 hover:border-neural-gray-300'
              )}
            >
              <div className="flex items-start space-x-3">
                {getFileIcon(document.fileType)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={cn(
                      'font-medium truncate',
                      selectedDocumentId === document._id
                        ? 'text-infinity-blue-800'
                        : 'text-neutral-gray-800'
                    )}>
                      {document.originalName || document.filename}
                    </h4>
                    {selectedDocumentId === document._id && (
                      <CheckCircle className="h-4 w-4 text-infinity-blue-600 flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-neutral-gray-500">
                    <div className="flex items-center space-x-1">
                      <FileText className="h-3 w-3" />
                      <span>{formatFileSize(document.fileSize)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(document.uploadDate)}</span>
                    </div>
                    
                    {document.textLength && (
                      <div>
                        <span>{document.textLength.toLocaleString()} chars</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-neural-gray-200">
          <div className="flex items-center justify-between text-sm text-neutral-gray-500">
            <span>{documents.length} document{documents.length !== 1 ? 's' : ''} available</span>
            <Button variant="ghost" size="sm" onClick={fetchDocuments}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};