import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { RefreshCw, Database, Network } from 'lucide-react';
import axios from 'axios';

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

const SimpleGraphPage: React.FC = () => {
  const [graphStats, setGraphStats] = useState<GraphStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGraphStats = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Loading graph stats...');
      const response = await axios.get('/api/graph/stats');
      console.log('Graph stats response:', response.data);
      setGraphStats(response.data.data);
    } catch (err) {
      console.error('Error loading graph stats:', err);
      setError('Failed to load graph statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGraphStats();
  }, []);

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
            Knowledge Graph - Simple View
          </h1>
          <p className="text-gray-600 mt-2">
            Your Neo4j knowledge graph statistics and data overview
          </p>
        </div>
        <Button onClick={loadGraphStats} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        </Card>
      )}

      {/* Graph Stats */}
      {graphStats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <Database className="h-8 w-8 mx-auto mb-2 text-infinity-blue-600" />
              <div className="text-2xl font-bold">{graphStats.nodes.documents}</div>
              <div className="text-sm text-gray-600">Documents</div>
            </Card>
            <Card className="p-4 text-center">
              <Network className="h-8 w-8 mx-auto mb-2 text-infinity-purple-600" />
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

          {/* Status Info */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Knowledge Graph Status</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Neo4j Connection:</span>
                <span className={graphStats.available ? 'text-green-600' : 'text-red-600'}>
                  {graphStats.available ? '✅ Connected' : '❌ Not Available'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span>{new Date(graphStats.lastUpdated).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Nodes:</span>
                <span>{graphStats.nodes.documents + graphStats.nodes.concepts + graphStats.nodes.entities + graphStats.nodes.terms}</span>
              </div>
            </div>
          </Card>

          {/* Raw Data Display (for debugging) */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Raw Graph Data</h2>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
              {JSON.stringify(graphStats, null, 2)}
            </pre>
          </Card>
        </>
      )}

      {/* No Data State */}
      {graphStats && (graphStats.nodes.documents + graphStats.nodes.concepts + graphStats.nodes.entities + graphStats.nodes.terms) === 0 && (
        <Card className="p-8 text-center">
          <Database className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">No Graph Data Found</h3>
          <p className="text-gray-600 mb-4">
            Your Neo4j database is connected, but no processed documents were found. 
            Try processing a document through the Graph RAG system.
          </p>
        </Card>
      )}
    </div>
  );
};

export default SimpleGraphPage;