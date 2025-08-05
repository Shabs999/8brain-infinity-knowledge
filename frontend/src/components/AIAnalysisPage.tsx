import React, { useState } from 'react';
import { DocumentSelector } from './DocumentSelector';
import { AIInsights } from './AIInsights';
import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';
import { Brain, Sparkles, FileText } from 'lucide-react';

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

interface AIAnalysisPageProps {
  className?: string;
}

export const AIAnalysisPage: React.FC<AIAnalysisPageProps> = ({ className }) => {
  const [selectedDocument, setSelectedDocument] = useState<{ id: string; document: Document } | null>(null);

  const handleDocumentSelect = (documentId: string, document: Document) => {
    setSelectedDocument({ id: documentId, document });
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="relative">
            <Brain className="h-12 w-12 text-infinity-blue-600" />
            <Sparkles className="h-6 w-6 text-knowledge-gold-500 absolute -top-1 -right-1" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-neural-gray-900 mb-2">AI Analysis</h1>
        <p className="text-lg text-neutral-gray-600 max-w-2xl mx-auto">
          Generate intelligent insights, summaries, and questions from your documents using advanced AI models like GPT-4 and Claude.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Selection */}
        <div className="lg:col-span-1">
          <DocumentSelector
            onDocumentSelect={handleDocumentSelect}
            selectedDocumentId={selectedDocument?.id}
          />
        </div>

        {/* AI Insights */}
        <div className="lg:col-span-2">
          {selectedDocument ? (
            <div className="space-y-4">
              {/* Selected Document Info */}
              <Card className="bg-gradient-to-r from-infinity-blue-50 to-infinity-purple-50 border-infinity-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-infinity-blue-600" />
                    <div>
                      <h3 className="font-medium text-infinity-blue-800">
                        {selectedDocument.document.originalName || selectedDocument.document.filename}
                      </h3>
                      <p className="text-sm text-infinity-blue-600">
                        {selectedDocument.document.textLength?.toLocaleString()} characters • {selectedDocument.document.fileType.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Insights Component */}
              <AIInsights 
                documentId={selectedDocument.id}
                onInsightGenerated={(insight) => {
                  console.log('Generated insight:', insight);
                }}
              />
            </div>
          ) : (
            <Card className="h-96 flex items-center justify-center">
              <CardContent className="text-center">
                <div className="relative mb-4">
                  <Brain className="h-16 w-16 text-neural-gray-300 mx-auto" />
                  <Sparkles className="h-8 w-8 text-neural-gray-200 absolute -top-2 -right-2" />
                </div>
                <h3 className="text-lg font-semibold text-neural-gray-500 mb-2">
                  Select a Document
                </h3>
                <p className="text-sm text-neutral-gray-400 max-w-md">
                  Choose a document from the left panel to start generating AI-powered insights, summaries, and analysis.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Feature Information */}
      <Card className="bg-gradient-to-r from-knowledge-gold-50 to-infinity-purple-50 border-knowledge-gold-200">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-neural-gray-800 mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-knowledge-gold-600" />
            AI Analysis Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-infinity-blue-100 text-infinity-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium text-neural-gray-700">Smart Summaries</h4>
                <p className="text-neutral-gray-600">Generate concise, intelligent summaries that capture key points and main ideas.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-infinity-purple-100 text-infinity-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Brain className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium text-neural-gray-700">Question Generation</h4>
                <p className="text-neutral-gray-600">Automatically create thoughtful questions to deepen understanding of your content.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-knowledge-gold-100 text-knowledge-gold-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium text-neural-gray-700">Concept Extraction</h4>
                <p className="text-neutral-gray-600">Identify key concepts, topics, and themes with detailed explanations.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};