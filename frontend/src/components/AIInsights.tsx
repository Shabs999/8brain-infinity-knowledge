import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { NeuralAnimation } from './BrandElements';
import axios from 'axios';
import {
  Brain,
  Sparkles,
  FileText,
  MessageSquare,
  Lightbulb,
  Zap,
  Clock,
  DollarSign,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Download,
  Copy,
  Check
} from 'lucide-react';

// Types
interface AIModel {
  name: string;
  displayName: string;
  available: boolean;
}

interface AIInsight {
  type: 'summary' | 'questions' | 'concepts';
  title: string;
  content: string | any[];
  model: string;
  cost?: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  timestamp: string;
}

interface DocumentInsights {
  documentId: string;
  documentTitle: string;
  insights: AIInsight[];
  totalCost: number;
  lastUpdated: string;
}

interface AIInsightsProps {
  className?: string;
  documentId?: string;
  onInsightGenerated?: (insight: AIInsight) => void;
}

export const AIInsights: React.FC<AIInsightsProps> = ({
  className,
  documentId,
  onInsightGenerated
}) => {
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-3.5-turbo');
  const [documentInsights, setDocumentInsights] = useState<DocumentInsights | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Fetch available AI models on mount
  useEffect(() => {
    fetchAvailableModels();
  }, []);

  const fetchAvailableModels = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/ai/models', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const models = response.data.data.availableModels.map((model: string) => ({
          name: model,
          displayName: getModelDisplayName(model),
          available: true
        }));
        setAvailableModels(models);
        if (models.length > 0 && !models.find((m: AIModel) => m.name === selectedModel)) {
          setSelectedModel(models[0].name);
        }
      }
    } catch (error) {
      console.error('Error fetching AI models:', error);
      setError('Failed to load AI models');
    }
  };

  const getModelDisplayName = (model: string): string => {
    const displayNames: { [key: string]: string } = {
      'gpt-4': 'GPT-4',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
      'claude-3-haiku-20240307': 'Claude 3 Haiku'
    };
    return displayNames[model] || model;
  };

  const generateSummary = async () => {
    if (!documentId) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/ai/summarize', {
        documentId,
        model: selectedModel,
        summaryLength: 'medium'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const insight: AIInsight = {
          type: 'summary',
          title: 'Document Summary',
          content: response.data.data.summary,
          model: response.data.data.model,
          cost: response.data.data.cost,
          usage: response.data.data.usage,
          timestamp: new Date().toISOString()
        };

        updateDocumentInsights(insight);
        onInsightGenerated?.(insight);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateQuestions = async () => {
    if (!documentId) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/ai/questions', {
        documentId,
        model: selectedModel,
        questionCount: 5,
        difficulty: 'medium'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const insight: AIInsight = {
          type: 'questions',
          title: 'Generated Questions',
          content: response.data.data.questions,
          model: response.data.data.model,
          cost: response.data.data.cost,
          usage: response.data.data.usage,
          timestamp: new Date().toISOString()
        };

        updateDocumentInsights(insight);
        onInsightGenerated?.(insight);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to generate questions');
    } finally {
      setIsGenerating(false);
    }
  };

  const extractConcepts = async () => {
    if (!documentId) return;
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/ai/concepts', {
        documentId,
        model: selectedModel,
        maxConcepts: 8
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const insight: AIInsight = {
          type: 'concepts',
          title: 'Key Concepts',
          content: response.data.data.concepts,
          model: response.data.data.model,
          cost: response.data.data.cost,
          usage: response.data.data.usage,
          timestamp: new Date().toISOString()
        };

        updateDocumentInsights(insight);
        onInsightGenerated?.(insight);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to extract concepts');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateDocumentInsights = (newInsight: AIInsight) => {
    setDocumentInsights(prev => {
      if (!prev) {
        return {
          documentId: documentId || '',
          documentTitle: 'Document',
          insights: [newInsight],
          totalCost: newInsight.cost || 0,
          lastUpdated: new Date().toISOString()
        };
      }

      // Replace existing insight of the same type or add new one
      const existingIndex = prev.insights.findIndex(insight => insight.type === newInsight.type);
      const updatedInsights = existingIndex >= 0 
        ? prev.insights.map((insight, index) => index === existingIndex ? newInsight : insight)
        : [...prev.insights, newInsight];

      return {
        ...prev,
        insights: updatedInsights,
        totalCost: updatedInsights.reduce((total, insight) => total + (insight.cost || 0), 0),
        lastUpdated: new Date().toISOString()
      };
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, itemId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => new Set([...prev, itemId]));
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemId);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatUsage = (usage?: { promptTokens: number; completionTokens: number; totalTokens: number }) => {
    if (!usage) return null;
    return (
      <div className=\"flex items-center space-x-4 text-xs text-neutral-gray-500\">
        <span>Tokens: {usage.totalTokens.toLocaleString()}</span>
        <span>•</span>
        <span>Input: {usage.promptTokens.toLocaleString()}</span>
        <span>•</span>
        <span>Output: {usage.completionTokens.toLocaleString()}</span>
      </div>
    );
  };

  const formatCost = (cost?: number) => {
    if (!cost) return null;
    return (
      <div className=\"flex items-center space-x-1 text-xs text-neural-gray-500\">
        <DollarSign className=\"h-3 w-3\" />
        <span>${cost.toFixed(4)}</span>
      </div>
    );
  };

  const renderInsightContent = (insight: AIInsight) => {
    switch (insight.type) {
      case 'summary':
        return (
          <div className=\"prose prose-sm max-w-none\">
            <p className=\"text-neutral-gray-700 leading-relaxed\">{insight.content as string}</p>
          </div>
        );

      case 'questions':
        return (
          <div className=\"space-y-3\">
            {(insight.content as string).split('\\n').filter(line => line.trim().match(/^\\d+\\./)).map((question, index) => (
              <div key={index} className=\"flex items-start space-x-3 p-3 bg-infinity-blue-50 rounded-lg\">
                <MessageSquare className=\"h-4 w-4 text-infinity-blue-600 mt-0.5 flex-shrink-0\" />
                <p className=\"text-sm text-neutral-gray-700\">{question.replace(/^\\d+\\.\\s*/, '')}</p>
              </div>
            ))}
          </div>
        );

      case 'concepts':
        if (Array.isArray(insight.content)) {
          return (
            <div className=\"grid grid-cols-1 md:grid-cols-2 gap-3\">
              {insight.content.map((concept, index) => (
                <div key={index} className=\"p-3 bg-infinity-purple-50 rounded-lg\">
                  <div className=\"flex items-center space-x-2 mb-2\">
                    <Lightbulb className=\"h-4 w-4 text-infinity-purple-600\" />
                    <h4 className=\"font-medium text-sm text-neutral-gray-800\">{concept.name}</h4>
                  </div>
                  <p className=\"text-xs text-neutral-gray-600 leading-relaxed\">{concept.description}</p>
                </div>
              ))}
            </div>
          );
        } else {
          return (
            <div className=\"prose prose-sm max-w-none\">
              <p className=\"text-neutral-gray-700 leading-relaxed\">{insight.content as string}</p>
            </div>
          );
        }

      default:
        return <p className=\"text-neutral-gray-700\">{insight.content as string}</p>;
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'summary': return <FileText className=\"h-4 w-4\" />;
      case 'questions': return <MessageSquare className=\"h-4 w-4\" />;
      case 'concepts': return <Lightbulb className=\"h-4 w-4\" />;
      default: return <Brain className=\"h-4 w-4\" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'summary': return 'text-infinity-blue-600';
      case 'questions': return 'text-infinity-blue-600';
      case 'concepts': return 'text-infinity-purple-600';
      default: return 'text-neural-gray-600';
    }
  };

  if (!documentId) {
    return (
      <Card className={cn('relative', className)}>
        <NeuralAnimation className=\"absolute inset-0 opacity-5\" />
        <CardContent className=\"p-8 text-center relative z-10\">
          <Brain className=\"h-12 w-12 mx-auto mb-4 text-neural-gray-400\" />
          <h3 className=\"text-lg font-semibold text-neural-gray-600 mb-2\">AI Insights</h3>
          <p className=\"text-sm text-neutral-gray-500\">Select a document to generate AI-powered insights and analysis</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className=\"flex items-center justify-between\">
            <CardTitle className=\"flex items-center gap-2\">
              <Sparkles className=\"h-5 w-5 text-infinity-blue-600\" />
              AI Insights
            </CardTitle>
            <div className=\"flex items-center space-x-3\">
              {/* Model Selection */}
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className=\"px-3 py-1 text-sm border border-neural-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-infinity-blue-500\"
                disabled={isGenerating}
              >
                {availableModels.map(model => (
                  <option key={model.name} value={model.name}>
                    {model.displayName}
                  </option>
                ))}
              </select>
              
              <Button
                variant=\"outline\"
                size=\"sm\"
                onClick={fetchAvailableModels}
                disabled={isGenerating}
              >
                <RefreshCw className={cn('h-4 w-4', isGenerating && 'animate-spin')} />
              </Button>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className=\"flex flex-wrap gap-2 pt-4\">
            <Button
              variant=\"outline\"
              size=\"sm\"
              onClick={generateSummary}
              disabled={isGenerating || availableModels.length === 0}
            >
              <FileText className=\"h-4 w-4 mr-2\" />
              {isGenerating ? 'Generating...' : 'Summarize'}
            </Button>
            
            <Button
              variant=\"outline\"
              size=\"sm\"
              onClick={generateQuestions}
              disabled={isGenerating || availableModels.length === 0}
            >
              <MessageSquare className=\"h-4 w-4 mr-2\" />
              Generate Questions
            </Button>
            
            <Button
              variant=\"outline\"
              size=\"sm\"
              onClick={extractConcepts}
              disabled={isGenerating || availableModels.length === 0}
            >
              <Lightbulb className=\"h-4 w-4 mr-2\" />
              Extract Concepts
            </Button>
          </div>

          {error && (
            <div className=\"mt-4 p-3 bg-red-50 border border-red-200 rounded-lg\">
              <p className=\"text-sm text-red-700\">{error}</p>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Insights Display */}
      {documentInsights && documentInsights.insights.length > 0 && (
        <Card>
          <CardHeader>
            <div className=\"flex items-center justify-between\">
              <h3 className=\"text-lg font-semibold\">Document Analysis</h3>
              <div className=\"flex items-center space-x-4 text-sm text-neutral-gray-500\">
                {formatCost(documentInsights.totalCost)}
                <div className=\"flex items-center space-x-1\">
                  <Clock className=\"h-3 w-3\" />
                  <span>Updated {new Date(documentInsights.lastUpdated).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className=\"space-y-4\">
            {documentInsights.insights.map((insight, index) => (
              <div key={`${insight.type}-${index}`} className=\"border border-neural-gray-200 rounded-lg\">
                <button
                  onClick={() => toggleSection(insight.type)}
                  className=\"w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors\"
                >
                  <div className=\"flex items-center space-x-3\">
                    <div className={getInsightColor(insight.type)}>
                      {getInsightIcon(insight.type)}
                    </div>
                    <span className=\"font-medium\">{insight.title}</span>
                    <Badge variant=\"outline\" className=\"text-xs\">
                      {getModelDisplayName(insight.model)}
                    </Badge>
                  </div>
                  {expandedSections.has(insight.type) ? 
                    <ChevronDown className=\"h-4 w-4\" /> : 
                    <ChevronRight className=\"h-4 w-4\" />
                  }
                </button>
                
                {expandedSections.has(insight.type) && (
                  <div className=\"px-4 pb-4\">
                    <div className=\"mb-3 flex items-center justify-between\">
                      <div className=\"flex items-center space-x-4\">
                        {formatUsage(insight.usage)}
                        {formatCost(insight.cost)}
                      </div>
                      <Button
                        variant=\"ghost\"
                        size=\"sm\"
                        onClick={() => copyToClipboard(
                          typeof insight.content === 'string' ? insight.content : JSON.stringify(insight.content, null, 2),
                          `${insight.type}-${index}`
                        )}
                      >
                        {copiedItems.has(`${insight.type}-${index}`) ? 
                          <Check className=\"h-4 w-4\" /> : 
                          <Copy className=\"h-4 w-4\" />
                        }
                      </Button>
                    </div>
                    
                    <div className=\"border-t border-neural-gray-200 pt-3\">
                      {renderInsightContent(insight)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No AI Models Available */}
      {availableModels.length === 0 && !isGenerating && (
        <Card>
          <CardContent className=\"p-8 text-center\">
            <Zap className=\"h-12 w-12 mx-auto mb-4 text-neural-gray-400\" />
            <h3 className=\"text-lg font-semibold text-neural-gray-600 mb-2\">No AI Models Available</h3>
            <p className=\"text-sm text-neutral-gray-500 mb-4\">
              AI insights require OpenAI or Anthropic API keys to be configured.
            </p>
            <Button variant=\"outline\" onClick={fetchAvailableModels}>
              <RefreshCw className=\"h-4 w-4 mr-2\" />
              Check Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};