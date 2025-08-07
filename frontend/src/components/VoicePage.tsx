import React, { useState } from 'react';
import VoiceQueryInterface from '../components/VoiceQueryInterface';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Brain, Sparkles } from 'lucide-react';

const VoicePage: React.FC = () => {
  const [queryHistory, setQueryHistory] = useState<Array<{
    query: string;
    intent: string;
    timestamp: string;
    results: any;
  }>>([]);
  const [, setCurrentTranscript] = useState('');
  const [currentResults, setCurrentResults] = useState<any>(null);
  const [currentAIResponse, setCurrentAIResponse] = useState<any>(null);

  const handleQueryResult = (_query: string, results: any) => {
    console.log('📊 Voice query results:', results);
    
    if (results.success && results.data) {
      const newHistoryItem = {
        query: results.data.transcript,
        intent: results.data.parsedQuery?.intent || 'unknown',
        timestamp: results.data.timestamp,
        results: results.data.results
      };
      
      setQueryHistory(prev => [newHistoryItem, ...prev]);
      setCurrentResults(results.data.results);
      setCurrentAIResponse(results.data.aiResponse || null);
    }
  };

  const handleTranscriptChange = (transcript: string) => {
    setCurrentTranscript(transcript);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center gap-3 mb-4">
            <Brain className="h-10 w-10 text-infinity-blue-600" />
            <h1 className="text-4xl font-bold text-neural-gray-900">
              Voice-Powered Knowledge Discovery
            </h1>
            <Sparkles className="h-10 w-10 text-infinity-purple-600" />
          </div>
          <p className="text-xl text-neural-gray-600">
            Speak naturally to explore your knowledge graph
          </p>
        </div>

        {/* Voice Interface */}
        <div className="mb-12">
          <VoiceQueryInterface
            onQueryResult={handleQueryResult}
            onTranscriptChange={handleTranscriptChange}
          />
        </div>

        {/* AI Response */}
        {currentAIResponse && (
          <Card className="p-6 mb-6 bg-gradient-to-r from-infinity-blue-50 to-infinity-purple-50 border-infinity-blue-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-infinity-blue-600 rounded-full flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-infinity-blue-900">AI Assistant</h3>
                  <Badge variant="secondary" className="text-xs">
                    {currentAIResponse.model}
                  </Badge>
                  {currentAIResponse.confidence && (
                    <Badge variant="outline" className="text-xs">
                      {Math.round(currentAIResponse.confidence * 100)}% confidence
                    </Badge>
                  )}
                </div>
                <p className="text-gray-800 text-base leading-relaxed mb-4">
                  {currentAIResponse.response}
                </p>
                
                {/* Follow-up Suggestions */}
                {currentAIResponse.followUpSuggestions && currentAIResponse.followUpSuggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Try asking:</p>
                    <div className="flex flex-wrap gap-2">
                      {currentAIResponse.followUpSuggestions.map((suggestion: string, index: number) => (
                        <button
                          key={index}
                          className="text-sm px-3 py-1 bg-white border border-infinity-blue-200 rounded-full hover:bg-infinity-blue-50 hover:border-infinity-blue-300 transition-colors cursor-pointer"
                          onClick={() => {
                            // TODO: Implement suggestion click handler
                            console.log('Suggestion clicked:', suggestion);
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Processing Stats */}
                {currentAIResponse.processingTime && (
                  <div className="mt-3 text-xs text-gray-500">
                    AI processing: {currentAIResponse.processingTime}ms
                    {currentAIResponse.usage?.totalTokens && (
                      <span className="ml-2">• {currentAIResponse.usage.totalTokens} tokens</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Current Results */}
        {currentResults && (
          <Card className="p-6 mb-12">
            <h2 className="text-2xl font-semibold mb-4">Results</h2>
            <div className="space-y-4">
              {/* Handle Explain Results */}
              {currentResults.type === 'explain' && currentResults.item ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="default">Explanation</Badge>
                    <span className="text-sm text-gray-600">
                      {currentResults.message}
                    </span>
                  </div>
                  
                  {/* Main Concept Card */}
                  <Card className="p-6 border-l-4 border-knowledge-gold-500 bg-gradient-to-r from-knowledge-gold-50 to-orange-50">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-xl text-knowledge-gold-800">{currentResults.item.name}</h3>
                        <Badge variant="outline" className="text-xs bg-knowledge-gold-100">
                          concept
                        </Badge>
                      </div>
                      
                      <p className="text-gray-800 text-base leading-relaxed">
                        {currentResults.description}
                      </p>
                      
                      {/* Related Concepts */}
                      {currentResults.relatedConcepts && currentResults.relatedConcepts.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Related Concepts:</h4>
                          <div className="flex flex-wrap gap-2">
                            {currentResults.relatedConcepts.map((concept: any, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {concept.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Related Entities */}
                      {currentResults.relatedEntities && currentResults.relatedEntities.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">Related Tools & Frameworks:</h4>
                          <div className="flex flex-wrap gap-2">
                            {currentResults.relatedEntities.map((entity: any, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {entity.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              ) : currentResults.totalResults > 0 ? (
                /* Handle Search/Count Results */
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="default">
                      {currentResults.totalResults} result{currentResults.totalResults !== 1 ? 's' : ''}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {currentResults.message}
                    </span>
                  </div>
                  
                  <div className="grid gap-4">
                    {currentResults.results.map((result: any, index: number) => (
                      <Card key={result.id || index} className="p-4 border-l-4 border-infinity-blue-500">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{result.name}</h3>
                              <Badge variant="outline" className="text-xs">
                                {result.type}
                              </Badge>
                            </div>
                            <p className="text-gray-700 text-sm leading-relaxed">
                              {result.content}
                            </p>
                            {result.id && (
                              <p className="text-xs text-gray-500 mt-2">ID: {result.id}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">{currentResults.message || 'No results found'}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Query History */}
        {queryHistory.length > 0 && (
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Query History</h2>
            <div className="space-y-3">
              {queryHistory.map((item, index) => (
                <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">"{item.query}"</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {item.intent}
                      </Badge>
                      {item.results && (
                        <Badge variant="secondary" className="text-xs">
                          {item.results.totalResults || 0} results
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Features */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-2">Natural Language</h3>
            <p className="text-gray-600">
              Speak in plain English. Ask questions naturally without special commands.
            </p>
          </Card>
          
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-2">Graph Integration</h3>
            <p className="text-gray-600">
              Voice queries automatically highlight relevant nodes in your knowledge graph.
            </p>
          </Card>
          
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-2">Smart Context</h3>
            <p className="text-gray-600">
              Follow-up questions understand context from your previous queries.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VoicePage;