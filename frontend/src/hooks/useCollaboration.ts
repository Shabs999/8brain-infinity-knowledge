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

interface CollaborationSession {
  id: string;
  name: string;
  participants: UserSession[];
  queryHistory: VoiceQueryShared[];
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
    newSocket.on('annotation_added', (data: any) => {
      console.log('📝 Annotation added:', data);
      onAnnotationAdded?.(data);
    });

    // Focus events
    newSocket.on('user_focus_changed', (data: any) => {
      onFocusChanged?.(data);
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
  const addVoiceAnnotation = useCallback((nodeId: string, audioData: string) => {
    if (!socket || !connected) return;
    
    socket.emit('add_annotation', {
      nodeId,
      audioData,
      userId
    });
  }, [socket, connected, userId]);

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

  return {
    // Connection state
    connected,
    socket,
    
    // Session data
    session,
    participants,
    userColor,
    queryHistory,
    
    // Actions
    shareVoiceQuery,
    addVoiceAnnotation,
    updateNodeFocus,
    leaveSession,
    
    // Participant info
    participantCount: participants.length,
    isSessionFull: session ? participants.length >= (session as any).maxParticipants : false
  };
};