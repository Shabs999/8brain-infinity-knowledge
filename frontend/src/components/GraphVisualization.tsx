import React from 'react';

interface GraphVisualizationProps {
  query?: string;
  collaborative?: {
    participants: any[];
    userColor: string;
    onNodeFocus: (nodeId: string) => void;
  };
}

export const GraphVisualization: React.FC<GraphVisualizationProps> = ({ 
  query, 
  collaborative 
}) => {
  return (
    <div className="h-[600px] bg-accent/10 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Knowledge Graph Visualization</h3>
        <p className="text-muted-foreground">
          {query ? `Showing graph for: "${query}"` : 'Select a query to visualize the knowledge graph'}
        </p>
        {collaborative && (
          <p className="text-sm text-muted-foreground mt-2">
            {collaborative.participants.length} participants viewing
          </p>
        )}
      </div>
    </div>
  );
};