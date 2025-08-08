import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ChevronRight, MapPin, Clock } from 'lucide-react';

interface TrailNode {
  nodeId: string;
  nodeName: string;
  timestamp: Date;
  userId: string;
  userName: string;
  userColor: string;
}

interface KnowledgeTrail {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  nodes: TrailNode[];
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
}

interface KnowledgeTrailsProps {
  trails: KnowledgeTrail[];
  currentUserId: string;
  onNavigateToNode?: (nodeId: string) => void;
  onStartNewTrail?: () => void;
  onEndTrail?: () => void;
}

export const KnowledgeTrails: React.FC<KnowledgeTrailsProps> = ({
  trails,
  currentUserId,
  onNavigateToNode,
  onStartNewTrail,
  onEndTrail
}) => {
  console.log('KnowledgeTrails rendering with:', { trails, currentUserId });
  
  // Add error boundary
  if (!trails) {
    console.error('KnowledgeTrails: trails prop is undefined');
    return <div className="p-4 text-red-500">Error: Trails data not available</div>;
  }
  
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);
  const [showOnlyMyTrails, setShowOnlyMyTrails] = useState(false);

  // Ensure trails is an array
  const safeTrails = trails || [];

  // Filter trails based on user preference
  const displayedTrails = showOnlyMyTrails 
    ? safeTrails.filter(trail => trail.userId === currentUserId)
    : safeTrails;

  // Get current user's active trail
  const myActiveTrail = safeTrails.find(
    trail => trail.userId === currentUserId && trail.isActive
  );

  // Calculate trail duration
  const getTrailDuration = (trail: KnowledgeTrail): string => {
    const endTime = trail.endTime || new Date();
    const duration = endTime.getTime() - trail.startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Get trail summary
  const getTrailSummary = (trail: KnowledgeTrail): string => {
    if (trail.nodes.length === 0) return 'No nodes visited';
    if (trail.nodes.length === 1) return trail.nodes[0].nodeName;
    return `${trail.nodes[0].nodeName} → ... → ${trail.nodes[trail.nodes.length - 1].nodeName}`;
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Knowledge Trails</span>
            <div className="flex items-center gap-2">
              <Button
                variant={showOnlyMyTrails ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyMyTrails(!showOnlyMyTrails)}
              >
                {showOnlyMyTrails ? 'All Trails' : 'My Trails'}
              </Button>
              {myActiveTrail ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onEndTrail}
                >
                  End Trail
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onStartNewTrail}
                >
                  Start Trail
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myActiveTrail && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Recording trail...</span>
                <Badge variant="default" className="animate-pulse">
                  {myActiveTrail.nodes.length} nodes
                </Badge>
              </div>
            </div>
          )}

          {/* Trail List */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {displayedTrails.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No knowledge trails yet
                </p>
              ) : (
                displayedTrails.map(trail => (
                  <Card
                    key={trail.id}
                    className={`p-3 cursor-pointer transition-all ${
                      selectedTrailId === trail.id ? 'ring-2 ring-blue-500' : ''
                    } ${trail.isActive ? 'border-green-500' : ''}`}
                    onClick={() => setSelectedTrailId(trail.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback
                            style={{ backgroundColor: trail.userColor }}
                            className="text-white text-xs"
                          >
                            {trail.userName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{trail.userName}</span>
                            {trail.isActive && (
                              <Badge variant="default" className="text-xs">
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {getTrailSummary(trail)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {getTrailDuration(trail)}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <MapPin className="h-3 w-3" />
                          {trail.nodes.length} nodes
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Trail Details */}
      {selectedTrailId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trail Details</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {displayedTrails
                  .find(t => t.id === selectedTrailId)
                  ?.nodes.map((node, index) => (
                    <div
                      key={`${node.nodeId}-${index}`}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                      onClick={() => onNavigateToNode?.(node.nodeId)}
                    >
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-grow">
                        <p className="text-sm font-medium">{node.nodeName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(node.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};