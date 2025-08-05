import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';
import { NeuralAnimation } from './BrandElements';
import { 
  Search, 
  FileText, 
  Sparkles, 
  TrendingUp,
  Clock,
  ChevronRight,
  Loader2
} from 'lucide-react';

interface SearchResult {
  id: string;
  documentId: string;
  documentName: string;
  documentType: string;
  content: string;
  score: number;
  metadata: {
    chunkIndex: number;
    textLength: number;
    createdAt: string;
  };
  highlights?: string[];
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalResults: number;
  searchTime: number;
  filters: any;
}

export const SearchInterface: React.FC = () => {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch search suggestions
  const fetchSuggestions = useCallback(async (prefix: string) => {
    if (prefix.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/search/suggestions?prefix=${encodeURIComponent(prefix)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  }, [token]);

  // Handle search query
  const handleSearch = async (searchQuery?: string) => {
    const queryToSearch = searchQuery || query.trim();
    
    if (!queryToSearch) {
      setError('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query: queryToSearch,
          limit: 20
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const searchData: SearchResponse = data.data;
        setResults(searchData.results);
        setSearchTime(searchData.searchTime);
        
        if (searchData.results.length === 0) {
          setError('No results found. Try uploading more documents or refining your query.');
        }
      } else {
        setError(data.message || 'Search failed');
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to perform search. Please try again.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle input change with debounced suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        fetchSuggestions(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, fetchSuggestions]);

  // Format document type badge
  const getDocumentTypeBadge = (type: string) => {
    const variants: Record<string, { color: string; icon: React.ReactNode }> = {
      'application/pdf': { color: 'bg-red-100 text-red-700', icon: '📄' },
      'text/plain': { color: 'bg-gray-100 text-gray-700', icon: '📝' },
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { 
        color: 'bg-blue-100 text-blue-700', 
        icon: '📘' 
      },
      'text/markdown': { color: 'bg-purple-100 text-purple-700', icon: '📑' }
    };

    const variant = variants[type] || { color: 'bg-gray-100 text-gray-700', icon: '📄' };
    const displayType = type.includes('pdf') ? 'PDF' : 
                       type.includes('word') ? 'DOCX' :
                       type.includes('markdown') ? 'MD' : 'TXT';

    return (
      <Badge className={cn('flex items-center space-x-1', variant.color)}>
        <span>{variant.icon}</span>
        <span>{displayType}</span>
      </Badge>
    );
  };

  // Calculate relevance percentage from score
  const getRelevancePercentage = (score: number) => {
    return Math.round(score * 100);
  };

  // Get relevance color
  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Search Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-neural-gray-900 mb-4">
          Search Your <span className="text-infinity-blue-600">Infinite Knowledge</span>
        </h1>
        <p className="text-lg text-neural-gray-600">
          Ask questions naturally and discover connections across all your documents
        </p>
      </div>

      {/* Search Bar */}
      <Card className="mb-8 relative overflow-hidden">
        <NeuralAnimation className="absolute inset-0 opacity-5" />
        <CardContent className="relative z-10 p-6">
          <div className="relative">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neural-gray-400" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Ask anything about your documents..."
                  className="pl-10 pr-4 py-3 text-lg border-2 focus:border-infinity-blue-500"
                  disabled={isSearching}
                />
                
                {/* Search Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-20">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="w-full text-left px-4 py-3 hover:bg-infinity-blue-50 flex items-center justify-between group"
                        onClick={() => {
                          setQuery(suggestion);
                          setShowSuggestions(false);
                          handleSearch(suggestion);
                        }}
                      >
                        <span className="text-neural-gray-700">{suggestion}</span>
                        <ChevronRight className="h-4 w-4 text-neural-gray-400 group-hover:text-infinity-blue-600" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <Button 
                variant="neural" 
                size="lg"
                onClick={() => handleSearch()}
                disabled={isSearching || !query.trim()}
                className="px-8"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Search
                  </>
                )}
              </Button>
            </div>

            {/* Search Stats */}
            {results.length > 0 && (
              <div className="mt-4 flex items-center justify-between text-sm text-neural-gray-600">
                <span>Found {results.length} results</span>
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {searchTime}ms
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-amber-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((result) => (
            <Card 
              key={result.id}
              className="hover:shadow-lg transition-all duration-200 border-2 hover:border-infinity-blue-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-infinity-blue-600" />
                      {result.documentName}
                    </CardTitle>
                    <div className="flex items-center gap-3 mt-2">
                      {getDocumentTypeBadge(result.documentType)}
                      <span className="text-sm text-neural-gray-500">
                        Chunk #{result.metadata.chunkIndex + 1}
                      </span>
                    </div>
                  </div>
                  
                  {/* Relevance Score */}
                  <div className="text-right">
                    <div className={cn('text-2xl font-bold', getRelevanceColor(result.score))}>
                      {getRelevancePercentage(result.score)}%
                    </div>
                    <div className="text-xs text-neural-gray-500">relevance</div>
                    <Progress 
                      value={getRelevancePercentage(result.score)} 
                      className="w-20 h-2 mt-1"
                    />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Highlights */}
                {result.highlights && result.highlights.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {result.highlights.map((highlight, index) => (
                      <div 
                        key={index}
                        className="p-3 bg-infinity-blue-50 rounded-lg border-l-4 border-infinity-blue-400"
                      >
                        <p className="text-sm text-neural-gray-700 italic">
                          "...{highlight}..."
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-neural-gray-500">
                  <span>{result.metadata.textLength} characters</span>
                  <span>•</span>
                  <span>Created {new Date(result.metadata.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isSearching && !error && results.length === 0 && query && (
        <Card className="text-center py-12">
          <CardContent>
            <Search className="h-16 w-16 text-neural-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-neural-gray-700 mb-2">
              Ready to Search
            </h3>
            <p className="text-neural-gray-600 max-w-md mx-auto">
              Enter a query above to search across all your uploaded documents using semantic AI
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Tips */}
      {!isSearching && results.length === 0 && !query && (
        <Card className="bg-gradient-to-r from-infinity-blue-50 to-infinity-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-infinity-blue-600" />
              Search Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-neural-gray-700">
              <li>• Ask natural questions like "What is machine learning?"</li>
              <li>• Search for concepts across all your documents</li>
              <li>• Use specific terms for more precise results</li>
              <li>• The AI understands context and synonyms</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};