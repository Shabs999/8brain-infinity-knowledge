import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { NeuralAnimation } from './BrandElements';
import {
  FileText,
  Brain,
  Hash,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  Filter,
  Info,
  Maximize2
} from 'lucide-react';

// Graph data interfaces
interface GraphNode {
  id: string;
  label: string;
  type: 'document' | 'concept' | 'keyword' | 'user';
  size: number;
  color: string;
  metadata: {
    documentType?: string;
    textLength?: number;
    uploadDate?: string;
    frequency?: number;
    connections?: number;
  };
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  strength: number;
  type: 'contains' | 'relates_to' | 'references' | 'similar_to';
  metadata?: {
    cooccurrence?: number;
    similarity?: number;
  };
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface KnowledgeGraphVizProps {
  className?: string;
  data?: GraphData;
  height?: number;
  width?: number;
}

export const KnowledgeGraphViz: React.FC<KnowledgeGraphVizProps> = ({
  className,
  data,
  height = 600,
  width = 800
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [simulation, setSimulation] = useState<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [nodeFilter, setNodeFilter] = useState<string>('all');

  // Mock data for demonstration (when no real data is provided)
  const mockData: GraphData = {
    nodes: [
      {
        id: 'user1',
        label: 'Your Knowledge Base',
        type: 'user',
        size: 30,
        color: '#1e40af',
        metadata: { connections: 12 }
      },
      {
        id: 'doc1',
        label: 'Machine Learning Guide.pdf',
        type: 'document',
        size: 25,
        color: '#dc2626',
        metadata: { documentType: 'PDF', textLength: 15000, uploadDate: '2024-08-05' }
      },
      {
        id: 'doc2',
        label: 'AI Research Paper.docx',
        type: 'document',
        size: 22,
        color: '#2563eb',
        metadata: { documentType: 'DOCX', textLength: 8500, uploadDate: '2024-08-04' }
      },
      {
        id: 'doc3',
        label: 'Neural Networks Notes.txt',
        type: 'document',
        size: 18,
        color: '#64748b',
        metadata: { documentType: 'TXT', textLength: 5200, uploadDate: '2024-08-03' }
      },
      {
        id: 'concept1',
        label: 'Machine Learning',
        type: 'concept',
        size: 20,
        color: '#7c3aed',
        metadata: { frequency: 45, connections: 8 }
      },
      {
        id: 'concept2',
        label: 'Neural Networks',
        type: 'concept',
        size: 18,
        color: '#7c3aed',
        metadata: { frequency: 32, connections: 6 }
      },
      {
        id: 'concept3',
        label: 'Deep Learning',
        type: 'concept',
        size: 16,
        color: '#7c3aed',
        metadata: { frequency: 28, connections: 5 }
      },
      {
        id: 'keyword1',
        label: 'algorithms',
        type: 'keyword',
        size: 12,
        color: '#f59e0b',
        metadata: { frequency: 67 }
      },
      {
        id: 'keyword2',
        label: 'training',
        type: 'keyword',
        size: 10,
        color: '#f59e0b',
        metadata: { frequency: 54 }
      },
      {
        id: 'keyword3',
        label: 'models',
        type: 'keyword',
        size: 14,
        color: '#f59e0b',
        metadata: { frequency: 78 }
      },
      {
        id: 'keyword4',
        label: 'data',
        type: 'keyword',
        size: 16,
        color: '#f59e0b',
        metadata: { frequency: 89 }
      }
    ],
    links: [
      { source: 'user1', target: 'doc1', strength: 1, type: 'contains' },
      { source: 'user1', target: 'doc2', strength: 1, type: 'contains' },
      { source: 'user1', target: 'doc3', strength: 1, type: 'contains' },
      { source: 'doc1', target: 'concept1', strength: 0.9, type: 'contains' },
      { source: 'doc1', target: 'concept2', strength: 0.7, type: 'contains' },
      { source: 'doc2', target: 'concept1', strength: 0.8, type: 'contains' },
      { source: 'doc2', target: 'concept3', strength: 0.6, type: 'contains' },
      { source: 'doc3', target: 'concept2', strength: 0.9, type: 'contains' },
      { source: 'concept1', target: 'concept2', strength: 0.8, type: 'relates_to' },
      { source: 'concept1', target: 'concept3', strength: 0.7, type: 'relates_to' },
      { source: 'concept2', target: 'concept3', strength: 0.9, type: 'relates_to' },
      { source: 'concept1', target: 'keyword1', strength: 0.6, type: 'references' },
      { source: 'concept1', target: 'keyword4', strength: 0.8, type: 'references' },
      { source: 'concept2', target: 'keyword2', strength: 0.7, type: 'references' },
      { source: 'concept2', target: 'keyword3', strength: 0.9, type: 'references' },
      { source: 'concept3', target: 'keyword1', strength: 0.5, type: 'references' },
      { source: 'concept3', target: 'keyword2', strength: 0.8, type: 'references' }
    ]
  };

  const graphData = data || mockData;

  // Initialize D3 visualization
  const initializeVisualization = useCallback(() => {
    if (!svgRef.current) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    const container = svg.append('g').attr('class', 'graph-container');

    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    // Filter nodes based on current filter
    const filteredNodes = nodeFilter === 'all' 
      ? graphData.nodes 
      : graphData.nodes.filter(node => node.type === nodeFilter);

    const filteredLinks = graphData.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return filteredNodes.some(n => n.id === sourceId) && filteredNodes.some(n => n.id === targetId);
    });

    // Create force simulation
    const newSimulation = d3.forceSimulation(filteredNodes)
      .force('link', d3.forceLink(filteredLinks).id((d: any) => d.id).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => d.size + 5));

    setSimulation(newSimulation);

    // Create links
    const links = container.selectAll('.link')
      .data(filteredLinks)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#64748b')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: GraphLink) => Math.sqrt(d.strength * 5));

    // Create nodes
    const nodes = container.selectAll('.node')
      .data(filteredNodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) newSimulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) newSimulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Add node circles
    nodes.append('circle')
      .attr('r', (d: GraphNode) => d.size)
      .attr('fill', (d: GraphNode) => d.color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', d.size * 1.2)
          .attr('stroke-width', 3);
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', d.size)
          .attr('stroke-width', 2);
      })
      .on('click', (event, d) => {
        setSelectedNode(d);
      });

    // Add node labels
    nodes.append('text')
      .attr('dy', (d: GraphNode) => d.size + 15)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .style('fill', '#374151')
      .style('pointer-events', 'none')
      .text((d: GraphNode) => {
        // Truncate long labels
        const maxLength = d.type === 'document' ? 20 : 15;
        return d.label.length > maxLength 
          ? d.label.substring(0, maxLength) + '...' 
          : d.label;
      });

    // Add node type icons
    nodes.append('text')
      .attr('dy', 5)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', 'white')
      .style('pointer-events', 'none')
      .text((d: GraphNode) => {
        switch (d.type) {
          case 'document': return '📄';
          case 'concept': return '🧠';
          case 'keyword': return '#';
          case 'user': return '👤';
          default: return '•';
        }
      });

    // Update positions on simulation tick
    newSimulation.on('tick', () => {
      links
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodes
        .attr('transform', (d: GraphNode) => `translate(${d.x},${d.y})`);
    });

  }, [graphData, nodeFilter, width, height]);

  // Initialize visualization on mount and data changes
  useEffect(() => {
    initializeVisualization();
  }, [initializeVisualization]);

  // Control functions
  const handleZoomIn = () => {
    if (svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .call(d3.zoom<SVGSVGElement, unknown>().scaleBy, 1.5);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .call(d3.zoom<SVGSVGElement, unknown>().scaleBy, 0.67);
    }
  };

  const handleReset = () => {
    if (svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .call(d3.zoom<SVGSVGElement, unknown>().transform, d3.zoomIdentity);
    }
    initializeVisualization();
  };

  const toggleSimulation = () => {
    if (simulation) {
      if (isSimulationRunning) {
        simulation.stop();
      } else {
        simulation.restart();
      }
      setIsSimulationRunning(!isSimulationRunning);
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="h-4 w-4" />;
      case 'concept': return <Brain className="h-4 w-4" />;
      case 'keyword': return <Hash className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'document': return 'bg-red-100 text-red-700';
      case 'concept': return 'bg-purple-100 text-purple-700';
      case 'keyword': return 'bg-yellow-100 text-yellow-700';
      case 'user': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="text-2xl transform rotate-90">∞</div>
              Knowledge Graph Visualization
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleSimulation}
                className={isSimulationRunning ? 'bg-green-50' : 'bg-red-50'}
              >
                {isSimulationRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-neutral-gray-500" />
              <span className="text-sm text-neutral-gray-600">Filter:</span>
            </div>
            <div className="flex space-x-2">
              {['all', 'document', 'concept', 'keyword'].map((filter) => (
                <Button
                  key={filter}
                  variant={nodeFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNodeFilter(filter)}
                  className="capitalize"
                >
                  {filter === 'all' ? 'All Nodes' : `${filter}s`}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Graph Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Graph Canvas */}
        <Card className="lg:col-span-3 relative overflow-hidden">
          <NeuralAnimation className="absolute inset-0 opacity-5" />
          <CardContent className="p-6 relative z-10">
            <div className="border-2 border-dashed border-infinity-blue-200 rounded-lg relative bg-white">
              <svg
                ref={svgRef}
                width={width}
                height={height}
                className="w-full h-full"
                style={{ minHeight: `${height}px` }}
              />
              
              {/* Zoom indicator */}
              <div className="absolute top-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-xs">
                Zoom: {Math.round(zoomLevel * 100)}%
              </div>

              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg">
                <div className="text-xs font-medium text-neutral-gray-700 mb-2">Node Types</div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-xs text-neutral-gray-600">Documents</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-xs text-neutral-gray-600">Concepts</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span className="text-xs text-neutral-gray-600">Keywords</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-xs text-neutral-gray-600">User</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Node Details Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Node Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {getNodeIcon(selectedNode.type)}
                    <Badge className={getNodeTypeColor(selectedNode.type)}>
                      {selectedNode.type}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-lg">{selectedNode.label}</h3>
                </div>

                <div className="space-y-2 text-sm">
                  {selectedNode.metadata.documentType && (
                    <div>
                      <span className="font-medium">Type:</span> {selectedNode.metadata.documentType}
                    </div>
                  )}
                  {selectedNode.metadata.textLength && (
                    <div>
                      <span className="font-medium">Length:</span> {selectedNode.metadata.textLength.toLocaleString()} chars
                    </div>
                  )}
                  {selectedNode.metadata.frequency && (
                    <div>
                      <span className="font-medium">Frequency:</span> {selectedNode.metadata.frequency}
                    </div>
                  )}
                  {selectedNode.metadata.connections && (
                    <div>
                      <span className="font-medium">Connections:</span> {selectedNode.metadata.connections}
                    </div>
                  )}
                  {selectedNode.metadata.uploadDate && (
                    <div>
                      <span className="font-medium">Upload Date:</span> {selectedNode.metadata.uploadDate}
                    </div>
                  )}
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Explore Connections
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-gray-500">
                <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Click on any node to explore its details and connections</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Graph Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Graph Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-infinity-blue-600">
                {graphData.nodes.filter(n => n.type === 'document').length}
              </div>
              <div className="text-sm text-neutral-gray-600">Documents</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-infinity-purple-600">
                {graphData.nodes.filter(n => n.type === 'concept').length}
              </div>
              <div className="text-sm text-neutral-gray-600">Concepts</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-knowledge-gold-500">
                {graphData.nodes.filter(n => n.type === 'keyword').length}
              </div>
              <div className="text-sm text-neutral-gray-600">Keywords</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-neural-gray-600">
                {graphData.links.length}
              </div>
              <div className="text-sm text-neutral-gray-600">Connections</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};