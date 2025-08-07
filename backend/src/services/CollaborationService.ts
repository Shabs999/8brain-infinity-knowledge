import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

// User session info
interface UserSession {
  userId: string;
  name: string;
  socketId: string;
  color: string;
  joinedAt: Date;
}

// Voice query event
interface VoiceQueryEvent {
  sessionId: string;
  userId: string;
  userName: string;
  query: string;
  timestamp: Date;
  results?: any;
}

// Collaborative session
interface CollaborativeSession {
  id: string;
  name: string;
  participants: Map<string, UserSession>;
  queryHistory: VoiceQueryEvent[];
  createdAt: Date;
  maxParticipants: number;
}

export class CollaborationService {
  private io: SocketIOServer | null = null;
  private sessions: Map<string, CollaborativeSession> = new Map();
  private userColors = [
    '#1e40af', '#7c3aed', '#dc2626', '#059669', 
    '#d97706', '#e11d48', '#0891b2', '#7c2d12'
  ];

  /**
   * Initialize WebSocket server
   */
  initialize(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      }
    });

    this.setupEventHandlers();
    console.log('🤝 CollaborationService initialized with WebSocket support');
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: Socket) => {
      console.log('👤 New user connected:', socket.id);

      // Join collaborative session
      socket.on('join_session', (data: { sessionId: string; userId: string; userName: string }) => {
        this.handleJoinSession(socket, data);
      });

      // Leave session
      socket.on('leave_session', (data: { sessionId: string; userId: string }) => {
        this.handleLeaveSession(socket, data);
      });

      // Voice query broadcast
      socket.on('voice_query', (data: VoiceQueryEvent) => {
        this.handleVoiceQuery(socket, data);
      });

      // Voice annotation
      socket.on('add_annotation', (data: { nodeId: string; audioData: string; userId: string }) => {
        this.handleVoiceAnnotation(socket, data);
      });

      // Cursor/focus tracking
      socket.on('focus_node', (data: { nodeId: string; userId: string; sessionId: string }) => {
        this.handleNodeFocus(socket, data);
      });

      // Disconnect handling
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Handle user joining a collaborative session
   */
  private handleJoinSession(socket: Socket, data: { sessionId: string; userId: string; userName: string }): void {
    const { sessionId, userId, userName } = data;
    
    // Get or create session
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = this.createSession(sessionId);
    }

    // Check participant limit
    if (session.participants.size >= session.maxParticipants) {
      socket.emit('session_full', { message: 'Session is full' });
      return;
    }

    // Create user session
    const userSession: UserSession = {
      userId,
      name: userName,
      socketId: socket.id,
      color: this.userColors[session.participants.size % this.userColors.length],
      joinedAt: new Date()
    };

    // Add user to session
    session.participants.set(userId, userSession);
    socket.join(sessionId);

    // Notify user
    socket.emit('session_joined', {
      session: {
        id: session.id,
        name: session.name,
        participants: Array.from(session.participants.values()),
        queryHistory: session.queryHistory.slice(-20) // Last 20 queries
      },
      userColor: userSession.color
    });

    // Notify other participants
    socket.to(sessionId).emit('user_joined', {
      user: userSession,
      totalParticipants: session.participants.size
    });

    console.log(`👥 User ${userName} joined session ${sessionId}. Total: ${session.participants.size}`);
  }

  /**
   * Handle user leaving a session
   */
  private handleLeaveSession(socket: Socket, data: { sessionId: string; userId: string }): void {
    const { sessionId, userId } = data;
    const session = this.sessions.get(sessionId);
    
    if (!session) return;

    const user = session.participants.get(userId);
    if (user) {
      session.participants.delete(userId);
      socket.leave(sessionId);

      // Notify others
      socket.to(sessionId).emit('user_left', {
        userId,
        userName: user.name,
        totalParticipants: session.participants.size
      });

      console.log(`👋 User ${user.name} left session ${sessionId}`);

      // Clean up empty sessions
      if (session.participants.size === 0) {
        this.sessions.delete(sessionId);
        console.log(`🧹 Cleaned up empty session ${sessionId}`);
      }
    }
  }

  /**
   * Handle voice query broadcast
   */
  private handleVoiceQuery(socket: Socket, data: VoiceQueryEvent): void {
    const session = this.sessions.get(data.sessionId);
    if (!session) return;

    // Add to history
    session.queryHistory.push(data);

    // Broadcast to all participants
    this.io?.to(data.sessionId).emit('voice_query_shared', {
      query: data.query,
      userId: data.userId,
      userName: data.userName,
      timestamp: data.timestamp,
      results: data.results
    });

    console.log(`🎤 Voice query shared in session ${data.sessionId}: "${data.query}"`);
  }

  /**
   * Handle voice annotation on graph nodes
   */
  private handleVoiceAnnotation(socket: Socket, data: any): void {
    // Find user's session
    const sessionId = this.findUserSession(socket.id);
    if (!sessionId) return;

    // Broadcast annotation to session
    socket.to(sessionId).emit('annotation_added', {
      nodeId: data.nodeId,
      userId: data.userId,
      audioData: data.audioData,
      timestamp: new Date()
    });

    console.log(`📝 Voice annotation added to node ${data.nodeId}`);
  }

  /**
   * Handle node focus tracking
   */
  private handleNodeFocus(socket: Socket, data: any): void {
    const { sessionId, nodeId, userId } = data;
    
    // Broadcast focus to other users
    socket.to(sessionId).emit('user_focus_changed', {
      userId,
      nodeId,
      timestamp: new Date()
    });
  }

  /**
   * Handle user disconnect
   */
  private handleDisconnect(socket: Socket): void {
    // Find and remove user from any sessions
    for (const [sessionId, session] of this.sessions) {
      for (const [userId, user] of session.participants) {
        if (user.socketId === socket.id) {
          this.handleLeaveSession(socket, { sessionId, userId });
          break;
        }
      }
    }
    console.log('👤 User disconnected:', socket.id);
  }

  /**
   * Create a new collaborative session
   */
  private createSession(sessionId: string): CollaborativeSession {
    const session: CollaborativeSession = {
      id: sessionId,
      name: `Knowledge Session ${sessionId.substring(0, 6)}`,
      participants: new Map(),
      queryHistory: [],
      createdAt: new Date(),
      maxParticipants: 10
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Find user's current session
   */
  private findUserSession(socketId: string): string | null {
    for (const [sessionId, session] of this.sessions) {
      for (const user of session.participants.values()) {
        if (user.socketId === socketId) {
          return sessionId;
        }
      }
    }
    return null;
  }

  /**
   * Get active sessions info
   */
  getActiveSessions(): any[] {
    return Array.from(this.sessions.values()).map(session => ({
      id: session.id,
      name: session.name,
      participants: session.participants.size,
      maxParticipants: session.maxParticipants,
      createdAt: session.createdAt,
      queryCount: session.queryHistory.length
    }));
  }

  /**
   * Get session details
   */
  getSessionDetails(sessionId: string): CollaborativeSession | null {
    return this.sessions.get(sessionId) || null;
  }
}

// Export singleton instance
export const collaborationService = new CollaborationService();