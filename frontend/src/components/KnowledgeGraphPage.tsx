import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import KnowledgeGraphVisualization from './KnowledgeGraphVisualization';
import { RefreshCw, Database, Search, TrendingUp, Network } from 'lucide-react';
import axios from 'axios';

// Types for API responses
interface GraphNode {
  id: string;
  name: string;
  type: 'document' | 'concept' | 'entity' | 'term';
  size?: number;
  color?: string;
  metadata?: {
    [key: string]: any;
  };
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'CONTAINS' | 'RELATES_TO' | 'MENTIONS' | 'CO_OCCURS' | 'DEFINED_BY';
  strength?: number;
  confidence?: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface GraphStats {
  available: boolean;
  nodes: {
    documents: number;
    concepts: number;
    entities: number;
    terms: number;
  };
  relationships: {
    total: number;
    types: { [key: string]: number };
  };
  lastUpdated: string;
}

const KnowledgeGraphPage: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [graphStats, setGraphStats] = useState<GraphStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Load graph data from API
  const loadGraphData = async (query?: string) => {
    setLoading(true);
    setError(null);

    try {
      // Get graph statistics (no auth required now)
      const statsResponse = await axios.get('/api/graph/stats');
      setGraphStats(statsResponse.data.data);

      // If no graph data available, show empty state
      if (!statsResponse.data.data.available) {
        setGraphData({ nodes: [], links: [] });
        setLoading(false);
        return;
      }

      // Query the knowledge graph
      const queryParams = {
        query: query || 'knowledge graph visualization',
        maxDepth: 2,
        limit: 100,
        includeRelationships: true
      };

      const graphResponse = await axios.post('/api/graph/query', queryParams, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const apiData = graphResponse.data.data.results;

      // Transform API response to graph format
      const nodes: GraphNode[] = [];
      const links: GraphLink[] = [];
      const nodeIds = new Set<string>();

      // Add document nodes
      if (apiData.documents) {
        apiData.documents.forEach((doc: any) => {
          if (!nodeIds.has(doc.id)) {
            nodes.push({
              id: doc.id,
              name: doc.title || doc.filename,
              type: 'document',
              metadata: {
                fileType: doc.fileType,
                fileSize: doc.fileSize,
                uploadedAt: doc.uploadedAt,
                summary: doc.summary
              }
            });
            nodeIds.add(doc.id);
          }
        });
      }

      // Add concept nodes
      if (apiData.concepts) {
        apiData.concepts.forEach((concept: any) => {
          const conceptId = `concept_${concept.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          if (!nodeIds.has(conceptId)) {
            nodes.push({
              id: conceptId,
              name: concept.name,
              type: 'concept',
              metadata: {
                description: concept.description,
                category: concept.category,
                importance: concept.importance,
                confidence: concept.confidence
              }
            });
            nodeIds.add(conceptId);
          }
        });
      }

      // Add entity nodes
      if (apiData.entities) {
        apiData.entities.forEach((entity: any) => {
          const entityId = `${entity.type.toLowerCase()}_${entity.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          if (!nodeIds.has(entityId)) {
            nodes.push({
              id: entityId,
              name: entity.name,
              type: 'entity',
              metadata: {
                entityType: entity.type,
                description: entity.description,
                aliases: entity.aliases,
                confidence: entity.confidence
              }
            });
            nodeIds.add(entityId);
          }
        });
      }

      // Add relationships as links
      if (apiData.relationships) {
        apiData.relationships.forEach((rel: any) => {
          // Create node IDs for source and target
          const sourceId = rel.from.includes('_') ? rel.from : `concept_${rel.from.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          const targetId = rel.to.includes('_') ? rel.to : `concept_${rel.to.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

          if (nodeIds.has(sourceId) && nodeIds.has(targetId)) {
            links.push({
              source: sourceId,
              target: targetId,
              type: rel.type as any,
              confidence: rel.confidence || 0.5
            });
          }
        });
      }

      // Create synthetic links between documents and their concepts/entities
      apiData.documents?.forEach((doc: any) => {
        // Link documents to concepts (if we had this data from extraction)
        apiData.concepts?.forEach((concept: any) => {
          const conceptId = `concept_${concept.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          if (nodeIds.has(conceptId)) {
            links.push({
              source: doc.id,
              target: conceptId,
              type: 'CONTAINS',
              confidence: concept.confidence || 0.5
            });
          }
        });

        // Link documents to entities
        apiData.entities?.forEach((entity: any) => {
          const entityId = `${entity.type.toLowerCase()}_${entity.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
          if (nodeIds.has(entityId)) {
            links.push({
              source: doc.id,
              target: entityId,
              type: 'CONTAINS',
              confidence: entity.confidence || 0.5
            });
          }
        });
      });

      setGraphData({ nodes, links });

    } catch (err) {
      console.error('Error loading graph data:', err);
      setError('Failed to load knowledge graph data');
      
      // Show mock data for demonstration if API fails
      setGraphData(getMockGraphData());
    } finally {
      setLoading(false);
    }
  };

  // Mock data for demonstration
  const getMockGraphData = (): GraphData => {
    return {
      nodes: [
        { id: 'doc1', name: 'Machine Learning Basics', type: 'document' },
        { id: 'doc2', name: 'Neural Networks', type: 'document' },
        { id: 'concept1', name: 'Deep Learning', type: 'concept' },
        { id: 'concept2', name: 'Artificial Intelligence', type: 'concept' },
        { id: 'entity1', name: 'TensorFlow', type: 'entity' },
        { id: 'entity2', name: 'Python', type: 'entity' },
        { id: 'term1', name: 'Gradient Descent', type: 'term' },
        { id: 'term2', name: 'Backpropagation', type: 'term' }
      ],
      links: [
        { source: 'doc1', target: 'concept1', type: 'CONTAINS' },
        { source: 'doc2', target: 'concept1', type: 'CONTAINS' },
        { source: 'concept1', target: 'concept2', type: 'RELATES_TO' },
        { source: 'doc1', target: 'entity1', type: 'MENTIONS' },
        { source: 'doc2', target: 'entity2', type: 'MENTIONS' },
        { source: 'concept1', target: 'term1', type: 'DEFINED_BY' },
        { source: 'concept1', target: 'term2', type: 'DEFINED_BY' }
      ]
    };
  };

  // Load data on component mount
  useEffect(() => {
    loadGraphData();
  }, []);

  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      loadGraphData(searchQuery);
    }
  };

  // Handle node click
  const handleNodeClick = (node: GraphNode) => {
    console.log('Node clicked:', node);
    if (node.type === 'document') {
      // You could navigate to document details or show more info
      console.log('Document selected:', node.id);
    }
  };

  // Handle link click
  const handleLinkClick = (link: GraphLink) => {
    console.log('Link clicked:', link);
    // You could show relationship details
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-infinity-blue-600" />
          <p className="text-lg text-gray-600">Loading Knowledge Graph...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Network className="h-8 w-8 text-infinity-blue-600" />
            Knowledge Graph
          </h1>
          <p className="text-gray-600 mt-2">
            Explore connections and relationships across your documents
          </p>
        </div>
        <Button onClick={() => loadGraphData()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search the knowledge graph..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-infinity-blue-500"
            />
          </div>
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
        </div>
      </Card>

      {/* Graph Stats */}
      {graphStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <Database className="h-8 w-8 mx-auto mb-2 text-infinity-blue-600" />
            <div className="text-2xl font-bold">{graphStats.nodes.documents}</div>
            <div className="text-sm text-gray-600">Documents</div>
          </Card>
          <Card className="p-4 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-infinity-purple-600" />
            <div className="text-2xl font-bold">{graphStats.nodes.concepts}</div>
            <div className="text-sm text-gray-600">Concepts</div>
          </Card>
          <Card className="p-4 text-center">
            <Network className="h-8 w-8 mx-auto mb-2 text-knowledge-gold-500" />
            <div className="text-2xl font-bold">{graphStats.nodes.entities}</div>
            <div className="text-sm text-gray-600">Entities</div>
          </Card>
          <Card className="p-4 text-center">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            <div className="text-2xl font-bold">{graphStats.relationships.total}</div>
            <div className="text-sm text-gray-600">Relationships</div>
          </Card>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <p className="text-sm text-red-600 mt-2">
            Showing demo data. To see real knowledge graph data, ensure Neo4j is configured and documents are processed.
          </p>
        </Card>
      )}

      {/* Graph Not Available State */}
      {graphStats && !graphStats.available && (
        <Card className="p-8 text-center">
          <Database className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">Knowledge Graph Not Available</h3>
          <p className="text-gray-600 mb-4">
            The knowledge graph requires Neo4j to be configured. Please check your environment settings.
          </p>
          <Badge variant="secondary">Neo4j Configuration Required</Badge>
        </Card>
      )}

      {/* Visualization */}
      {graphData.nodes.length > 0 && (
        <KnowledgeGraphVisualization
          data={graphData}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          height={700}
        />
      )}

      {/* Empty State */}
      {graphData.nodes.length === 0 && !loading && !error && (
        <Card className="p-8 text-center">
          <Network className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">No Graph Data Available</h3>
          <p className="text-gray-600 mb-4">
            Upload and process some documents to see the knowledge graph visualization.
          </p>
        </Card>
      )}
    </div>
  );
};

export default KnowledgeGraphPage;