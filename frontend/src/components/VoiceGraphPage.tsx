import React, { useState, useRef } from 'react';
import VoiceQueryInterface from './VoiceQueryInterface';
import EnhancedKnowledgeGraph from './EnhancedKnowledgeGraph';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Brain, Mic, Network, Sparkles } from 'lucide-react';

interface QueryResult {
  type: string;
  results?: any[];
  relationships?: any[];
  stats?: any;
  message?: string;
  item?: any;
  description?: string;
  relatedConcepts?: any[];
}

const VoiceGraphPage: React.FC = () => {
  const [queryResults, setQueryResults] = useState<QueryResult | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([]);
  // const [isQuerying] = useState(false);
  const graphRef = useRef<any>(null);

  const handleVoiceQueryResult = (_query: string, response: any) => {
    console.log('🎯 Voice query result:', response);
    
    if (response.success && response.data) {
      const { results: queryData } = response.data;
      setQueryResults(queryData);
      
      // Extract node IDs to highlight based on query type
      let nodeIdsToHighlight: string[] = [];
      
      if (queryData.type === 'search' && queryData.results) {
        nodeIdsToHighlight = queryData.results.map((r: any) => r.id || r.documentId).filter(Boolean);
      } else if (queryData.type === 'relationship' && queryData.connectedNodes) {
        nodeIdsToHighlight = queryData.connectedNodes.map((n: any) => n.id).filter(Boolean);
      } else if (queryData.type === 'explain' && queryData.item) {
        nodeIdsToHighlight = [queryData.item.id].filter(Boolean);
      }
      
      setHighlightedNodes(nodeIdsToHighlight);
      
      // Trigger graph update (this would be enhanced with actual graph interaction)
      if (graphRef.current && nodeIdsToHighlight.length > 0) {
        console.log('🎨 Highlighting nodes:', nodeIdsToHighlight);
        // In a real implementation, we'd call a method on the graph component
        // to highlight these nodes and potentially zoom to them
      }
    }
  };

  const renderQueryResults = () => {
    if (!queryResults) return null;
    
    switch (queryResults.type) {
      case 'search':
        return (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Search Results</h3>
            <p className="text-sm text-blue-700 mb-3">{queryResults.message}</p>
            {queryResults.results && queryResults.results.length > 0 ? (
              <div className="space-y-2">
                {queryResults.results.slice(0, 5).map((result: any, idx: number) => (
                  <div key={idx} className="p-2 bg-white rounded border border-blue-100">
                    <Badge variant="outline" className="text-xs mb-1">
                      {result.type || result.metadata?.type || 'item'}
                    </Badge>
                    <p className="text-sm font-medium">{result.name || result.title || result.content?.substring(0, 100)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No results found.</p>
            )}
          </Card>
        );
        
      case 'count':
        return (
          <Card className="p-4 bg-green-50 border-green-200">
            <h3 className="font-semibold text-green-900 mb-2">Count Results</h3>
            <p className="text-sm text-green-700">{queryResults.message}</p>
            {queryResults.stats && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {Object.entries(queryResults.stats).map(([key, value]) => (
                  <div key={key} className="text-center p-2 bg-white rounded">
                    <div className="text-lg font-bold text-green-600">{value as number}</div>
                    <div className="text-xs text-gray-600 capitalize">{key}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
        
      case 'relationship':
        return (
          <Card className="p-4 bg-purple-50 border-purple-200">
            <h3 className="font-semibold text-purple-900 mb-2">Relationship Results</h3>
            <p className="text-sm text-purple-700 mb-3">{queryResults.message}</p>
            {queryResults.relationships && queryResults.relationships.length > 0 && (
              <div className="space-y-1">
                {queryResults.relationships.slice(0, 5).map((rel: any, idx: number) => (
                  <div key={idx} className="text-sm">
                    <span className="font-medium">{rel.from}</span>
                    <span className="mx-2 text-purple-600">→ {rel.type} →</span>
                    <span className="font-medium">{rel.to}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
        
      case 'explain':
        return (
          <Card className="p-4 bg-amber-50 border-amber-200">
            <h3 className="font-semibold text-amber-900 mb-2">Explanation</h3>
            <p className="text-sm text-amber-700 mb-2">{queryResults.message}</p>
            {queryResults.item && (
              <div className="space-y-2">
                <p className="text-sm">{queryResults.description}</p>
                {queryResults.relatedConcepts && queryResults.relatedConcepts.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-800">Related Concepts:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {queryResults.relatedConcepts.map((concept: any, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {concept.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <Mic className="h-8 w-8 text-infinity-blue-600" />
            <h1 className="text-3xl font-bold text-neural-gray-900">
              Voice-Powered Knowledge Graph
            </h1>
            <Network className="h-8 w-8 text-infinity-purple-600" />
          </div>
          <p className="text-lg text-neural-gray-600">
            Speak naturally to explore and interact with your knowledge graph
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Voice Interface Column */}
          <div className="lg:col-span-1 space-y-4">
            <VoiceQueryInterface
              onQueryResult={handleVoiceQueryResult}
            />
            
            {/* Query Results */}
            {queryResults && (
              <div className="animate-fadeIn">
                {renderQueryResults()}
              </div>
            )}
            
            {/* Tips */}
            <Card className="p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-infinity-purple-500" />
                Voice Commands
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>• "Show me all documents"</p>
                <p>• "Find concepts about testing"</p>
                <p>• "What connects BDD and cucumber?"</p>
                <p>• "How many entities do I have?"</p>
                <p>• "Explain behavior driven development"</p>
              </div>
            </Card>
          </div>

          {/* Graph Visualization Column */}
          <div className="lg:col-span-2">
            <Card className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Knowledge Graph</h2>
                {highlightedNodes.length > 0 && (
                  <Badge variant="default" className="animate-pulse">
                    {highlightedNodes.length} nodes highlighted
                  </Badge>
                )}
              </div>
              <EnhancedKnowledgeGraph 
                width={800} 
                height={600}
                highlightedNodes={highlightedNodes}
                className="w-full"
              />
            </Card>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-5 w-5 text-infinity-blue-500" />
              <h3 className="font-semibold">AI Understanding</h3>
            </div>
            <p className="text-sm text-gray-600">
              Natural language processing converts your voice into intelligent graph queries.
            </p>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Network className="h-5 w-5 text-infinity-purple-500" />
              <h3 className="font-semibold">Visual Feedback</h3>
            </div>
            <p className="text-sm text-gray-600">
              See query results highlighted directly in your knowledge graph visualization.
            </p>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-knowledge-gold-500" />
              <h3 className="font-semibold">Smart Context</h3>
            </div>
            <p className="text-sm text-gray-600">
              Follow-up questions understand context from your conversation history.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VoiceGraphPage;