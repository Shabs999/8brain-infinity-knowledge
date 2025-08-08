import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Types
interface UserSession {
  userId: string;
  name: string;
  color: string;
  joinedAt: Date;
}

interface VoiceQueryShared {
  query: string;
  userId: string;
  userName: string;
  timestamp: Date;
  results?: any;
}

interface VoiceAnnotation {
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

interface CollaborationSession {
  id: string;
  name: string;
  participants: UserSession[];
  queryHistory: VoiceQueryShared[];
  annotations?: Array<{
    nodeId: string;
    annotations: VoiceAnnotation[];
  }>;
  trails?: KnowledgeTrail[];
}

interface UseCollaborationOptions {
  sessionId: string;
  userId: string;
  userName: string;
  onUserJoined?: (user: UserSession) => void;
  onUserLeft?: (userId: string, userName: string) => void;
  onQueryShared?: (query: VoiceQueryShared) => void;
  onAnnotationAdded?: (data: any) => void;
  onFocusChanged?: (data: any) => void;
}

export const useCollaboration = (options: UseCollaborationOptions) => {
  const { sessionId, userId, userName, onUserJoined, onUserLeft, onQueryShared, onAnnotationAdded, onFocusChanged } = options;
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [participants, setParticipants] = useState<UserSession[]>([]);
  const [userColor, setUserColor] = useState<string>('#1e40af');
  const [queryHistory, setQueryHistory] = useState<VoiceQueryShared[]>([]);
  const [annotations, setAnnotations] = useState<Map<string, VoiceAnnotation[]>>(new Map());
  const [trails, setTrails] = useState<KnowledgeTrail[]>([]);
  
  const socketRef = useRef<Socket | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!sessionId || !userId || !userName) return;

    console.log('🔌 Connecting to collaboration session:', sessionId);
    
    const newSocket = io(window.location.hostname + ':8000', {
      transports: ['websocket'],
      withCredentials: true
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('✅ Connected to collaboration server');
      setConnected(true);
      
      // Join session
      newSocket.emit('join_session', { sessionId, userId, userName });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from collaboration server');
      setConnected(false);
    });

    // Session events
    newSocket.on('session_joined', (data: { session: CollaborationSession; userColor: string }) => {
      console.log('👥 Joined session:', data.session.name);
      setSession(data.session);
      setParticipants(data.session.participants);
      setUserColor(data.userColor);
      setQueryHistory(data.session.queryHistory || []);
      
      // Load existing annotations
      if (data.session.annotations) {
        const annotationsMap = new Map<string, VoiceAnnotation[]>();
        data.session.annotations.forEach(({ nodeId, annotations }) => {
          annotationsMap.set(nodeId, annotations);
        });
        setAnnotations(annotationsMap);
      }
      
      // Load existing trails
      if (data.session.trails) {
        setTrails(data.session.trails);
      }
    });

    newSocket.on('session_full', (data: { message: string }) => {
      console.error('❌ Session full:', data.message);
    });

    // User events
    newSocket.on('user_joined', (data: { user: UserSession; totalParticipants: number }) => {
      console.log('👤 User joined:', data.user.name);
      setParticipants(prev => [...prev, data.user]);
      onUserJoined?.(data.user);
    });

    newSocket.on('user_left', (data: { userId: string; userName: string; totalParticipants: number }) => {
      console.log('👋 User left:', data.userName);
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
      onUserLeft?.(data.userId, data.userName);
    });

    // Voice query events
    newSocket.on('voice_query_shared', (data: VoiceQueryShared) => {
      console.log('🎤 Voice query shared:', data.query);
      setQueryHistory(prev => [...prev, data]);
      onQueryShared?.(data);
    });

    // Annotation events
    newSocket.on('annotation_added', (data: VoiceAnnotation) => {
      console.log('📝 Annotation added:', data);
      
      // Update local annotations only if it's not from the current user
      // (since we already added it optimistically)
      setAnnotations(prev => {
        const updated = new Map(prev);
        const nodeAnnotations = updated.get(data.nodeId) || [];
        
        // Check if this annotation already exists (by checking userId and timestamp proximity)
        const isDuplicate = nodeAnnotations.some(ann => 
          ann.userId === data.userId && 
          Math.abs(new Date(ann.timestamp).getTime() - new Date(data.timestamp).getTime()) < 1000
        );
        
        if (!isDuplicate) {
          updated.set(data.nodeId, [...nodeAnnotations, data]);
        }
        
        return updated;
      });
      
      onAnnotationAdded?.(data);
    });

    // Focus events
    newSocket.on('user_focus_changed', (data: any) => {
      onFocusChanged?.(data);
    });

    // Trail events
    newSocket.on('trail_started', (data: KnowledgeTrail) => {
      console.log('🚀 Trail started:', data);
      setTrails(prev => [...prev, data]);
    });

    newSocket.on('trail_updated', (data: KnowledgeTrail) => {
      console.log('🗺️ Trail updated:', data);
      setTrails(prev => prev.map(trail => 
        trail.id === data.id ? data : trail
      ));
    });

    newSocket.on('trail_ended', (data: { trailId: string; endTime: Date }) => {
      console.log('🏁 Trail ended:', data.trailId);
      setTrails(prev => prev.map(trail => 
        trail.id === data.trailId 
          ? { ...trail, isActive: false, endTime: new Date(data.endTime) }
          : trail
      ));
    });

    newSocket.on('node_visited', (data: { trailId: string; node: TrailNode }) => {
      console.log('📍 Node visited:', data);
      setTrails(prev => prev.map(trail => 
        trail.id === data.trailId 
          ? { ...trail, nodes: [...trail.nodes, data.node] }
          : trail
      ));
    });

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_session', { sessionId, userId });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [sessionId, userId, userName]);

  // Share voice query
  const shareVoiceQuery = useCallback((query: string, results?: any) => {
    if (!socket || !connected) return;
    
    socket.emit('voice_query', {
      sessionId,
      userId,
      userName,
      query,
      timestamp: new Date(),
      results
    });
  }, [socket, connected, sessionId, userId, userName]);

  // Add voice annotation
  const addVoiceAnnotation = useCallback((nodeId: string, audioData: string, duration?: number, transcript?: string) => {
    if (!socket || !connected) {
      console.error('Cannot add annotation - socket not connected');
      return;
    }
    
    console.log('Emitting add_annotation event:', { nodeId, userId, userName });
    
    // Optimistically add the annotation locally
    const localAnnotation: VoiceAnnotation = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nodeId,
      userId,
      userName,
      userColor,
      audioData,
      timestamp: new Date(),
      duration,
      transcript
    };
    
    // Update local state immediately
    setAnnotations(prev => {
      const updated = new Map(prev);
      const nodeAnnotations = updated.get(nodeId) || [];
      updated.set(nodeId, [...nodeAnnotations, localAnnotation]);
      return updated;
    });
    
    // Then emit to server
    socket.emit('add_annotation', {
      nodeId,
      audioData,
      userId,
      userName,
      duration,
      transcript
    });
  }, [socket, connected, userId, userName, userColor]);

  // Update focus
  const updateNodeFocus = useCallback((nodeId: string) => {
    if (!socket || !connected) return;
    
    socket.emit('focus_node', {
      sessionId,
      nodeId,
      userId
    });
  }, [socket, connected, sessionId, userId]);

  // Leave session
  const leaveSession = useCallback(() => {
    if (!socket || !connected) return;
    
    socket.emit('leave_session', { sessionId, userId });
  }, [socket, connected, sessionId, userId]);

  // Trail management methods
  const startTrail = useCallback(() => {
    if (!socket || !connected) return;
    
    socket.emit('start_trail', { sessionId, userId, userName });
  }, [socket, connected, sessionId, userId, userName]);

  const endTrail = useCallback(() => {
    if (!socket || !connected) return;
    
    // Find active trail for current user
    const activeTrail = trails.find(t => t.userId === userId && t.isActive);
    if (!activeTrail) return;
    
    socket.emit('end_trail', { sessionId, trailId: activeTrail.id });
  }, [socket, connected, sessionId, userId, trails]);

  const visitNode = useCallback((nodeId: string, nodeName: string) => {
    if (!socket || !connected) return;
    
    // Find active trail for current user
    const activeTrail = trails.find(t => t.userId === userId && t.isActive);
    if (!activeTrail) return;
    
    socket.emit('visit_node', {
      sessionId,
      trailId: activeTrail.id,
      nodeId,
      nodeName
    });
  }, [socket, connected, sessionId, userId, trails]);

  return {
    // Connection state
    connected,
    socket,
    
    // Session data
    session,
    participants,
    userColor,
    queryHistory,
    annotations,
    trails,
    
    // Actions
    shareVoiceQuery,
    addVoiceAnnotation,
    updateNodeFocus,
    leaveSession,
    startTrail,
    endTrail,
    visitNode,
    
    // Participant info
    participantCount: participants.length,
    isSessionFull: session ? participants.length >= (session as any).maxParticipants : false,
    
    // Helper functions
    getNodeAnnotations: (nodeId: string) => annotations.get(nodeId) || [],
    getActiveTrail: () => trails.find(t => t.userId === userId && t.isActive)
  };
};