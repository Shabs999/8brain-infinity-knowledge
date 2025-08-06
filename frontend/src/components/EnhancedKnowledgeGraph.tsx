import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ZoomIn, ZoomOut, RotateCcw, Search, Filter, Network, Info } from 'lucide-react';
import axios from 'axios';

// Types for enhanced graph data
interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: string;
  properties: any;
  size?: number;
  color?: string;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  properties?: any;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface EnhancedKnowledgeGraphProps {
  width?: number;
  height?: number;
  className?: string;
  highlightedNodes?: string[];
}

const EnhancedKnowledgeGraph: React.FC<EnhancedKnowledgeGraphProps> = ({
  width = 1200,
  height = 800,
  className = "",
  highlightedNodes = []
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Color scheme for different node types
  const nodeColors = {
    document: '#1e40af',    // infinity-blue
    concept: '#7c3aed',     // infinity-purple  
    entity: '#f59e0b',      // knowledge-gold
    term: '#10b981',        // emerald-500
    default: '#6b7280'      // gray-500
  };

  // Load real graph data from backend
  const loadGraphData = async () => {
    setLoading(true);
    setError(null);

    // Force demo data for now since backend query isn't working
    console.log('🎨 Using demo data for testing...');
    setError('Demo mode - showing sample knowledge graph');
    setGraphData(getDemoGraphData());
    setLoading(false);
    return;

    try {
      console.log('🎨 Loading enhanced graph visualization data...');
      
      // First try the new visualization endpoint
      const response = await axios.get('/api/graph/visualization', {
        params: { limit: 50 }
      });
      
      const { nodes, links } = response.data.data;
      console.log(`📊 Loaded ${nodes.length} nodes and ${links.length} links`);
      
      // If no data from backend, use demo data
      if (!nodes || nodes.length === 0) {
        console.log('📊 No data from backend, using demo data...');
        setError('Using demo data - no real data available');
        setGraphData(getDemoGraphData());
        return;
      }
      
      // Transform and enhance the data
      const enhancedNodes: GraphNode[] = nodes.map((node: any) => ({
        ...node,
        color: nodeColors[node.type as keyof typeof nodeColors] || nodeColors.default,
        size: getNodeSize(node.type, links.filter((l: any) => 
          l.source === node.id || l.target === node.id
        ).length)
      }));

      setGraphData({
        nodes: enhancedNodes,
        links: links
      });

    } catch (err) {
      console.error('❌ Error loading graph data:', err);
      
      // Fallback to demo data if API fails
      console.log('📊 API failed, using demo data...');
      setError('Using demo data - API not available');
      setGraphData(getDemoGraphData());
    } finally {
      setLoading(false);
    }
  };

  // Calculate node size based on type and connections
  const getNodeSize = (nodeType: string, connectionCount: number): number => {
    const baseSize = {
      document: 12,
      concept: 10,
      entity: 8,
      term: 6
    };

    const base = baseSize[nodeType as keyof typeof baseSize] || 8;
    return base + Math.min(connectionCount * 2, 15); // Max size boost of 15
  };

  // Demo data for fallback
  const getDemoGraphData = (): GraphData => ({
    nodes: [
      { id: '1', name: 'BDD Discovery Book', type: 'document', properties: {}, color: nodeColors.document, size: 15 },
      { id: '2', name: 'Behavior Driven Development', type: 'concept', properties: {}, color: nodeColors.concept, size: 12 },
      { id: '3', name: 'User Stories', type: 'concept', properties: {}, color: nodeColors.concept, size: 10 },
      { id: '4', name: 'Acceptance Criteria', type: 'concept', properties: {}, color: nodeColors.concept, size: 10 },
      { id: '5', name: 'Gherkin', type: 'entity', properties: {}, color: nodeColors.entity, size: 8 },
      { id: '6', name: 'Cucumber', type: 'entity', properties: {}, color: nodeColors.entity, size: 8 },
      { id: '7', name: 'Testing', type: 'term', properties: {}, color: nodeColors.term, size: 6 },
      { id: '8', name: 'Collaboration', type: 'term', properties: {}, color: nodeColors.term, size: 6 }
    ],
    links: [
      { source: '1', target: '2', type: 'CONTAINS' },
      { source: '1', target: '3', type: 'CONTAINS' },
      { source: '1', target: '4', type: 'CONTAINS' },
      { source: '2', target: '5', type: 'RELATES_TO' },
      { source: '2', target: '6', type: 'RELATES_TO' },
      { source: '2', target: '7', type: 'ENABLES' },
      { source: '3', target: '4', type: 'RELATES_TO' },
      { source: '5', target: '6', type: 'RELATES_TO' },
      { source: '7', target: '8', type: 'ENABLES' }
    ]
  });

  // Filter data based on search and type
  const getFilteredData = (): GraphData => {
    let filteredNodes = graphData.nodes;

    // Apply type filter
    if (filterType !== 'all') {
      filteredNodes = filteredNodes.filter(node => node.type === filterType);
    }

    // Apply search filter
    if (searchTerm) {
      filteredNodes = filteredNodes.filter(node =>
        node.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter links to only include those between filtered nodes
    const nodeIds = new Set(filteredNodes.map(node => node.id));
    const filteredLinks = graphData.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return {
      nodes: filteredNodes,
      links: filteredLinks
    };
  };

  // Initialize D3 visualization
  useEffect(() => {
    if (!svgRef.current || !graphData.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const filteredData = getFilteredData();
    if (filteredData.nodes.length === 0) return;

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    // Main group for zoom/pan
    const g = svg.append('g');

    // Create simulation
    const simulation = d3.forceSimulation(filteredData.nodes)
      .force('link', d3.forceLink(filteredData.links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => (d.size || 10) + 10));

    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(filteredData.links)
      .join('line')
      .attr('stroke', '#94a3b8')
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Create link labels
    const linkLabels = g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(filteredData.links)
      .join('text')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .attr('fill', '#64748b')
      .attr('text-anchor', 'middle')
      .style('pointer-events', 'none')
      .style('opacity', 0.7)
      .text(d => d.type);

    // Create nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(filteredData.nodes)
      .join('circle')
      .attr('r', d => d.size || 10)
      .attr('fill', d => d.color || nodeColors.default)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('filter', 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))')
      .style('opacity', d => highlightedNodes.length === 0 || highlightedNodes.includes(d.id) ? 1 : 0.3)
      .style('stroke-width', d => highlightedNodes.includes(d.id) ? 4 : 2)
      .style('stroke', d => highlightedNodes.includes(d.id) ? '#ff6b6b' : '#ffffff')
      .call(d3.drag<any, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }))
      .on('click', (_, d) => {
        setSelectedNode(d);
      })
      .on('mouseover', (_, d) => {
        // Highlight connected nodes and links
        node.style('opacity', n => n === d ? 1 : 0.3);
        link.style('opacity', l => {
          const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
          const targetId = typeof l.target === 'string' ? l.target : l.target.id;
          return sourceId === d.id || targetId === d.id ? 1 : 0.1;
        });
        linkLabels.style('opacity', l => {
          const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
          const targetId = typeof l.target === 'string' ? l.target : l.target.id;
          return sourceId === d.id || targetId === d.id ? 1 : 0.1;
        });
      })
      .on('mouseout', () => {
        node.style('opacity', 1);
        link.style('opacity', 0.8);
        linkLabels.style('opacity', 0.7);
      });

    // Create node labels
    const nodeLabels = g.append('g')
      .attr('class', 'node-labels')
      .selectAll('text')
      .data(filteredData.nodes)
      .join('text')
      .attr('font-size', '12px')
      .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
      .attr('font-weight', '500')
      .attr('fill', '#1f2937')
      .attr('text-anchor', 'middle')
      .attr('dy', d => (d.size || 10) + 18)
      .style('pointer-events', 'none')
      .text(d => d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name);

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x || 0)
        .attr('y1', (d: any) => d.source.y || 0)
        .attr('x2', (d: any) => d.target.x || 0)
        .attr('y2', (d: any) => d.target.y || 0);

      linkLabels
        .attr('x', (d: any) => ((d.source.x || 0) + (d.target.x || 0)) / 2)
        .attr('y', (d: any) => ((d.source.y || 0) + (d.target.y || 0)) / 2);

      node
        .attr('cx', (d: any) => d.x || 0)
        .attr('cy', (d: any) => d.y || 0);

      nodeLabels
        .attr('x', (d: any) => d.x || 0)
        .attr('y', (d: any) => d.y || 0);
    });

  }, [graphData, searchTerm, filterType, width, height, highlightedNodes]);

  // Load data on mount
  useEffect(() => {
    loadGraphData();
  }, []);

  // Zoom controls
  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1.5
    );
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1 / 1.5
    );
  };

  const handleReset = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().transform as any,
      d3.zoomIdentity
    );
    setZoomLevel(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-center">
          <Network className="h-12 w-12 animate-spin mx-auto mb-4 text-infinity-blue-600" />
          <p className="text-lg text-gray-600">Loading Your Knowledge Graph...</p>
        </div>
      </div>
    );
  }

  const filteredData = getFilteredData();

  return (
    <div className={`enhanced-knowledge-graph ${className}`}>
      {/* Controls Panel */}
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* Search */}
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-infinity-blue-500"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-infinity-blue-500"
            >
              <option value="all">All Types</option>
              <option value="document">Documents</option>
              <option value="concept">Concepts</option>
              <option value="entity">Entities</option>
              <option value="term">Terms</option>
            </select>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Badge variant="secondary">
              {Math.round(zoomLevel * 100)}%
            </Badge>
          </div>

          {/* Reload */}
          <Button onClick={loadGraphData} disabled={loading}>
            <Network className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Reload
          </Button>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4">
          {Object.entries(nodeColors).filter(([type]) => type !== 'default').map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border-2 border-white"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm capitalize">{type}s</span>
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-center gap-2 text-amber-700">
              <Info className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Graph Container */}
      <div className="relative">
        <Card className="p-0 overflow-hidden">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="knowledge-graph-svg border rounded-lg"
          />
        </Card>

        {/* Node Details Panel */}
        {selectedNode && (
          <Card className="absolute top-4 right-4 p-4 w-72 max-h-96 overflow-y-auto bg-white/95 backdrop-blur shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Node Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedNode(null)}
              >
                ×
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <Badge
                  style={{ backgroundColor: selectedNode.color }}
                  className="text-white"
                >
                  {selectedNode.type}
                </Badge>
              </div>
              <div>
                <strong>Name:</strong> <span className="font-mono text-sm">{selectedNode.name}</span>
              </div>
              <div>
                <strong>Connections:</strong> <span className="text-sm text-gray-600">
                  {filteredData.links.filter(l => 
                    (typeof l.source === 'string' ? l.source : l.source.id) === selectedNode.id ||
                    (typeof l.target === 'string' ? l.target : l.target.id) === selectedNode.id
                  ).length} relationships
                </span>
              </div>
              {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                <div>
                  <strong>Properties:</strong>
                  <pre className="text-xs bg-gray-100 p-2 mt-1 rounded max-h-32 overflow-auto">
                    {JSON.stringify(selectedNode.properties, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Stats Footer */}
      <Card className="mt-4 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
          <div>
            <div className="text-lg font-bold text-infinity-blue-600">
              {filteredData.nodes.length}
            </div>
            <div className="text-gray-600">Visible Nodes</div>
          </div>
          <div>
            <div className="text-lg font-bold text-infinity-purple-600">
              {filteredData.links.length}
            </div>
            <div className="text-gray-600">Visible Links</div>
          </div>
          <div>
            <div className="text-lg font-bold text-knowledge-gold-500">
              {graphData.nodes.length}
            </div>
            <div className="text-gray-600">Total Nodes</div>
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-500">
              {graphData.links.length}
            </div>
            <div className="text-gray-600">Total Links</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EnhancedKnowledgeGraph;