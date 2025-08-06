import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ZoomIn, ZoomOut, RotateCcw, Search, Filter } from 'lucide-react';

// Types for graph data
interface GraphNode extends d3.SimulationNodeDatum {
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

interface KnowledgeGraphVisualizationProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  onLinkClick?: (link: GraphLink) => void;
  height?: number;
  className?: string;
}

const KnowledgeGraphVisualization: React.FC<KnowledgeGraphVisualizationProps> = ({
  data,
  onNodeClick,
  onLinkClick,
  height = 600,
  className = ""
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Color scheme for different node types
  const nodeColors = {
    document: '#1e40af', // infinity-blue
    concept: '#7c3aed',  // infinity-purple
    entity: '#f59e0b',   // knowledge-gold
    term: '#10b981'      // emerald-500
  };

  // Node size based on importance/connections
  const getNodeSize = (node: GraphNode): number => {
    if (node.size) return node.size;
    
    // Calculate size based on connections
    const connections = data.links.filter(
      link => link.source === node.id || link.target === node.id
    ).length;
    
    return Math.max(8, Math.min(20, 8 + connections * 2));
  };

  // Filter nodes and links based on search and filter type
  const getFilteredData = (): GraphData => {
    let filteredNodes = data.nodes;
    
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
    const filteredLinks = data.links.filter(
      link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        return nodeIds.has(sourceId) && nodeIds.has(targetId);
      }
    );
    
    return {
      nodes: filteredNodes,
      links: filteredLinks
    };
  };

  // Initialize and update D3 visualization
  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous visualization
    svg.selectAll('*').remove();

    // Get filtered data
    const filteredData = getFilteredData();

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    // Create main group for zoom/pan
    const g = svg.append('g');

    // Create simulation
    const simulation = d3.forceSimulation(filteredData.nodes)
      .force('link', d3.forceLink(filteredData.links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => getNodeSize(d as GraphNode) + 5));

    // Create links
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(filteredData.links)
      .join('line')
      .attr('stroke', '#6b7280')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt((d.confidence || 0.5) * 4))
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        onLinkClick?.(d);
      });

    // Create link labels
    const linkLabels = g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(filteredData.links)
      .join('text')
      .attr('font-size', '10px')
      .attr('fill', '#6b7280')
      .attr('text-anchor', 'middle')
      .style('pointer-events', 'none')
      .text(d => d.type);

    // Create nodes
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(filteredData.nodes)
      .join('circle')
      .attr('r', d => getNodeSize(d))
      .attr('fill', d => nodeColors[d.type])
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
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
        onNodeClick?.(d);
      })
      .on('mouseover', (_, d) => {
        // Highlight connected nodes and links
        node.style('opacity', n => n === d ? 1 : 0.3);
        link.style('opacity', l => {
          const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
          const targetId = typeof l.target === 'string' ? l.target : l.target.id;
          return sourceId === d.id || targetId === d.id ? 1 : 0.1;
        });
      })
      .on('mouseout', () => {
        // Reset opacity
        node.style('opacity', 1);
        link.style('opacity', 0.6);
      });

    // Create node labels
    const nodeLabels = g.append('g')
      .attr('class', 'node-labels')
      .selectAll('text')
      .data(filteredData.nodes)
      .join('text')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#1f2937')
      .attr('text-anchor', 'middle')
      .attr('dy', d => getNodeSize(d) + 15)
      .style('pointer-events', 'none')
      .text(d => d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name);

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

  }, [data, searchTerm, filterType]);

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

  return (
    <div className={`knowledge-graph-container ${className}`}>
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
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4">
          {Object.entries(nodeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm capitalize">{type}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Graph Container */}
      <div className="relative">
        <Card className="p-0 overflow-hidden">
          <svg
            ref={svgRef}
            width="100%"
            height={height}
            className="knowledge-graph-svg"
          />
        </Card>

        {/* Node Information Panel */}
        {selectedNode && (
          <Card className="absolute top-4 right-4 p-4 w-64 max-h-96 overflow-y-auto bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-lg">Node Details</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedNode(null)}
              >
                ×
              </Button>
            </div>
            <div className="space-y-2">
              <div>
                <Badge
                  variant="secondary"
                  style={{ backgroundColor: nodeColors[selectedNode.type] }}
                  className="text-white"
                >
                  {selectedNode.type}
                </Badge>
              </div>
              <div>
                <strong>Name:</strong> {selectedNode.name}
              </div>
              {selectedNode.metadata && (
                <div>
                  <strong>Metadata:</strong>
                  <pre className="text-xs bg-gray-100 p-2 mt-1 rounded">
                    {JSON.stringify(selectedNode.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Stats */}
      <Card className="mt-4 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-infinity-blue-600">
              {getFilteredData().nodes.length}
            </div>
            <div className="text-sm text-gray-600">Nodes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-infinity-purple-600">
              {getFilteredData().links.length}
            </div>
            <div className="text-sm text-gray-600">Links</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-knowledge-gold-500">
              {data.nodes.filter(n => n.type === 'document').length}
            </div>
            <div className="text-sm text-gray-600">Documents</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-500">
              {data.nodes.filter(n => n.type === 'concept').length}
            </div>
            <div className="text-sm text-gray-600">Concepts</div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default KnowledgeGraphVisualization;