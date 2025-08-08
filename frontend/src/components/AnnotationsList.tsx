import React, { useState, useRef, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Play, Pause, Volume2, Clock, User } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface Annotation {
  id: string;
  nodeId: string;
  userId: string;
  userName: string;
  userColor: string;
  audioData: string;
  timestamp: Date;
  duration?: number;
  transcript?: string;
}

interface AnnotationsListProps {
  annotations: Annotation[];
  currentUserId?: string;
  onPlay?: (annotationId: string) => void;
}

export const AnnotationsList: React.FC<AnnotationsListProps> = ({
  annotations,
  currentUserId,
  onPlay
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Toggle playback
  const togglePlayback = useCallback((annotation: Annotation) => {
    const audioElement = audioRefs.current[annotation.id];
    
    if (!audioElement) {
      // Create audio element
      const audio = new Audio(annotation.audioData);
      audioRefs.current[annotation.id] = audio;
      
      audio.onended = () => {
        setPlayingId(null);
      };
      
      audio.play();
      setPlayingId(annotation.id);
      onPlay?.(annotation.id);
    } else {
      if (playingId === annotation.id) {
        audioElement.pause();
        setPlayingId(null);
      } else {
        // Stop any other playing audio
        Object.values(audioRefs.current).forEach(audio => audio.pause());
        
        audioElement.play();
        setPlayingId(annotation.id);
        onPlay?.(annotation.id);
      }
    }
  }, [playingId, onPlay]);

  // Format timestamp
  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (annotations.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Volume2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-2">No Voice Annotations</h3>
          <p className="text-sm text-muted-foreground">
            Voice notes added to graph nodes will appear here
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Voice Annotations</h3>
          <Badge variant="secondary">{annotations.length} notes</Badge>
        </div>
        
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {annotations.map((annotation) => (
              <Card 
                key={annotation.id} 
                className={`p-4 ${annotation.userId === currentUserId ? 'border-primary/50' : ''}`}
              >
                <div className="space-y-3">
                  {/* User Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8" style={{ backgroundColor: annotation.userColor }}>
                        <AvatarFallback className="text-white text-xs">
                          {annotation.userName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{annotation.userName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(annotation.timestamp)}
                        </p>
                      </div>
                    </div>
                    
                    {annotation.userId === currentUserId && (
                      <Badge variant="outline" className="text-xs">
                        <User className="h-3 w-3 mr-1" />
                        You
                      </Badge>
                    )}
                  </div>
                  
                  {/* Playback Controls */}
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => togglePlayback(annotation)}
                      className="flex-shrink-0"
                    >
                      {playingId === annotation.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <div className="flex-1">
                      <div className="h-8 bg-accent rounded-full relative overflow-hidden">
                        <div 
                          className="h-full bg-primary/20 transition-all duration-300"
                          style={{ 
                            width: playingId === annotation.id ? '100%' : '0%',
                            background: `linear-gradient(to right, ${annotation.userColor}40, ${annotation.userColor}20)`
                          }}
                        />
                      </div>
                    </div>
                    
                    {annotation.duration && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {Math.round(annotation.duration)}s
                      </div>
                    )}
                  </div>
                  
                  {/* Transcript (if available) */}
                  {annotation.transcript && (
                    <div className="pt-2 border-t">
                      <p className="text-sm italic text-muted-foreground">
                        "{annotation.transcript}"
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
};