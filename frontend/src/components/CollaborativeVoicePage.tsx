import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCollaboration } from '../hooks/useCollaboration';
import { VoiceQueryInterface } from './VoiceQueryInterface';
import { GraphVisualization } from './GraphVisualization';
import { SearchBar } from './SearchBar';
import { VoiceAnnotation } from './VoiceAnnotation';
import { AnnotationsList } from './AnnotationsList';
import { TestAnnotations } from './TestAnnotations';
import { KnowledgeTrails } from './KnowledgeTrails';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Mic, Users, Share2, Copy, Check, LogOut, Loader2, Volume2, Map } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

interface QueryResult {
  type: 'search' | 'explain' | 'count';
  count?: number;
  title?: string;
  content?: string;
  items?: any[];
  item?: any;
  relatedConcepts?: any[];
  aiResponse?: {
    response: string;
    model: string;
    confidence: number;
  };
}

interface Participant {
  userId: string;
  name: string;
  color: string;
  joinedAt: Date;
}

interface SharedQuery {
  query: string;
  userId: string;
  userName: string;
  timestamp: Date;
  results?: QueryResult;
}

export const CollaborativeVoicePage: React.FC = () => {
  // Add a test to ensure Tailwind CSS is working
  console.log('CollaborativeVoicePage loaded');
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  // User info (in production, get from auth context)
  const [userName, setUserName] = useState('');
  const [userId] = useState(`user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [hasJoined, setHasJoined] = useState(false);
  
  // UI state
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentResults, setCurrentResults] = useState<QueryResult | null>(null);
  const [activeTab, setActiveTab] = useState('voice');
  const [copied, setCopied] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAnnotationDialog, setShowAnnotationDialog] = useState(false);
  
  // Collaboration hook
  const {
    connected,
    session,
    participants,
    userColor,
    queryHistory,
    annotations,
    trails,
    shareVoiceQuery,
    addVoiceAnnotation,
    leaveSession,
    startTrail,
    endTrail,
    visitNode,
    participantCount,
    isSessionFull,
    getNodeAnnotations,
    getActiveTrail
  } = useCollaboration({
    sessionId: sessionId || '',
    userId,
    userName,
    onUserJoined: (user) => {
      console.log(`${user.name} joined the session`);
    },
    onUserLeft: (userId, userName) => {
      console.log(`${userName} left the session`);
    },
    onQueryShared: (query) => {
      console.log(`New query from ${query.userName}: ${query.query}`);
      // If it's from another user, show their results
      if (query.userId !== userId && query.results) {
        setCurrentQuery(query.query);
        setCurrentResults(query.results);
      }
    }
  });

  // Copy session link
  const copySessionLink = useCallback(() => {
    const link = `${window.location.origin}/collaborate/${sessionId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sessionId]);

  // Handle voice query
  const handleVoiceQuery = useCallback(async (transcript: string, intent: string) => {
    setCurrentQuery(transcript);
    
    try {
      // Make the API call
      const response = await axios.post(`${API_BASE_URL}/voice/process`, {
        transcript,
        intent,
        enableAI: true
      });
      
      if (response.data.success) {
        const results = response.data.data;
        setCurrentResults(results);
        
        // Share with other participants
        shareVoiceQuery(transcript, results);
      }
    } catch (error) {
      console.error('Error processing voice query:', error);
    }
  }, [shareVoiceQuery]);

  // Handle search
  const handleSearch = useCallback(async (query: string) => {
    setCurrentQuery(query);
    
    try {
      const response = await axios.post(`${API_BASE_URL}/graph/search`, {
        query,
        limit: 20
      });
      
      if (response.data.success) {
        const results: QueryResult = {
          type: 'search',
          items: response.data.data.results
        };
        setCurrentResults(results);
        
        // Share with other participants
        shareVoiceQuery(query, results);
      }
    } catch (error) {
      console.error('Error searching:', error);
    }
  }, [shareVoiceQuery]);

  // Join session
  const handleJoinSession = useCallback(() => {
    if (userName.trim()) {
      setHasJoined(true);
      setShowJoinDialog(false);
    }
  }, [userName]);

  // Leave session
  const handleLeaveSession = useCallback(() => {
    leaveSession();
    navigate('/voice');
  }, [leaveSession, navigate]);

  // Handle annotation added
  const handleAnnotationAdded = useCallback((nodeId: string, audioData: string, duration?: number) => {
    console.log('Adding annotation:', { nodeId, duration, audioDataLength: audioData.length });
    addVoiceAnnotation(nodeId, audioData, duration);
    setShowAnnotationDialog(false);
  }, [addVoiceAnnotation]);

  // Get all annotations across all nodes
  const getAllAnnotations = useCallback(() => {
    const allAnnotations: any[] = [];
    annotations.forEach((nodeAnnotations, nodeId) => {
      allAnnotations.push(...nodeAnnotations);
    });
    return allAnnotations.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [annotations]);

  // Render participant avatar
  const renderParticipant = (participant: Participant) => (
    <div key={participant.userId} className="flex items-center gap-2">
      <Avatar className="h-8 w-8" style={{ backgroundColor: participant.color }}>
        <AvatarFallback className="text-white text-xs">
          {participant.name.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium">
        {participant.name}
        {participant.userId === userId && ' (You)'}
      </span>
    </div>
  );

  // Render shared query
  const renderSharedQuery = (query: SharedQuery) => (
    <Card 
      key={`${query.userId}_${query.timestamp}`} 
      className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => {
        setCurrentQuery(query.query);
        setCurrentResults(query.results || null);
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Avatar className="h-6 w-6" style={{ backgroundColor: participants.find(p => p.userId === query.userId)?.color }}>
              <AvatarFallback className="text-white text-xs">
                {query.userName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{query.userName}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(query.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-sm">{query.query}</p>
          {query.results && (
            <Badge variant="secondary" className="mt-1">
              {query.results.type === 'count' ? `${query.results.count} results` :
               query.results.type === 'explain' ? 'Explanation' : 
               `${query.results.items?.length || 0} results`}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );

  // Show join dialog
  if (!hasJoined || showJoinDialog) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
        <Card className="max-w-md w-full p-6">
          <h2 className="text-2xl font-bold mb-4">Join Collaborative Session</h2>
          
          {isSessionFull ? (
            <Alert className="mb-4">
              <AlertDescription>
                This session is full. Maximum 10 participants allowed.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <p className="text-muted-foreground mb-6">
                Enter your name to join the collaborative knowledge exploration session.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Your Name</label>
                  <Input
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinSession()}
                    autoFocus
                  />
                </div>
                
                <Button 
                  onClick={handleJoinSession}
                  disabled={!userName.trim() || !connected}
                  className="w-full"
                >
                  {connected ? 'Join Session' : 
                   <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting...</>}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Collaborative Session</h1>
              <Badge variant={connected ? "default" : "secondary"}>
                {connected ? "Connected" : "Connecting..."}
              </Badge>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">{participantCount}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copySessionLink}
              >
                {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                <span className="ml-2">{copied ? 'Copied!' : 'Share'}</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLeaveSession}
              >
                <LogOut className="h-4 w-4" />
                <span className="ml-2">Leave</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Participants & History */}
          <div className="lg:col-span-1 space-y-6">
            {/* Participants */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participants ({participantCount})
              </h3>
              <div className="space-y-2">
                {participants.map(renderParticipant)}
              </div>
            </Card>

            {/* Query History */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Recent Queries
              </h3>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {queryHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No queries yet. Start exploring!</p>
                  ) : (
                    queryHistory.slice().reverse().map(renderSharedQuery)
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="voice">Voice Query</TabsTrigger>
                <TabsTrigger value="search">Search</TabsTrigger>
                <TabsTrigger value="graph">Knowledge Graph</TabsTrigger>
                <TabsTrigger value="annotations">
                  <Volume2 className="h-4 w-4 mr-1" />
                  Annotations
                </TabsTrigger>
                <TabsTrigger value="trails">
                  <Map className="h-4 w-4 mr-1" />
                  Trails
                </TabsTrigger>
              </TabsList>

              <TabsContent value="voice" className="mt-6">
                <VoiceQueryInterface 
                  onQueryProcessed={handleVoiceQuery}
                  collaborative={{
                    sessionId,
                    userName,
                    userColor,
                    participantCount
                  }}
                />
                
                {/* Results Display */}
                {currentResults && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4">
                      Results for: "{currentQuery}"
                    </h3>
                    
                    {currentResults.type === 'count' && (
                      <Card className="p-6">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-primary mb-2">
                            {currentResults.count}
                          </div>
                          <p className="text-muted-foreground">
                            {currentResults.title || 'Total Results'}
                          </p>
                        </div>
                      </Card>
                    )}
                    
                    {currentResults.type === 'explain' && currentResults.item && (
                      <Card className="p-6 border-l-4 border-knowledge-gold-500">
                        <h4 className="font-semibold text-lg mb-2">
                          {currentResults.item.label || currentResults.item.name}
                        </h4>
                        <p className="text-muted-foreground">
                          {currentResults.content || currentResults.item.content || 'No description available.'}
                        </p>
                        
                        {currentResults.relatedConcepts && currentResults.relatedConcepts.length > 0 && (
                          <div className="mt-4">
                            <h5 className="font-medium mb-2">Related Concepts:</h5>
                            <div className="flex flex-wrap gap-2">
                              {currentResults.relatedConcepts.map((concept: any, idx: number) => (
                                <Badge key={idx} variant="secondary">
                                  {concept.label || concept.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    )}
                    
                    {currentResults.type === 'search' && currentResults.items && (
                      <div className="space-y-4">
                        {currentResults.items.map((item: any, idx: number) => (
                          <Card key={idx} className="p-4">
                            <h4 className="font-semibold">{item.label || item.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.content || item.description || 'No description available.'}
                            </p>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    {/* AI Response */}
                    {currentResults.aiResponse && (
                      <Card className="mt-4 p-4 bg-accent/50">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">
                                AI Assistant • {currentResults.aiResponse.model}
                              </Badge>
                              <Badge variant="outline">
                                {Math.round(currentResults.aiResponse.confidence * 100)}% confidence
                              </Badge>
                            </div>
                            <p className="text-sm">{currentResults.aiResponse.response}</p>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="search" className="mt-6">
                <SearchBar onSearch={handleSearch} />
                
                {currentResults && currentResults.type === 'search' && (
                  <div className="mt-6 space-y-4">
                    {currentResults.items?.map((item: any, idx: number) => (
                      <Card key={idx} className="p-4">
                        <h4 className="font-semibold">{item.label || item.name}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.content || item.description}
                        </p>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="graph" className="mt-6">
                <Card className="p-4">
                  <GraphVisualization 
                    query={currentQuery}
                    collaborative={{
                      participants,
                      userColor,
                      onNodeFocus: (nodeId: string) => {
                        console.log('Focus on node:', nodeId);
                      }
                    }}
                  />
                </Card>
              </TabsContent>

              <TabsContent value="annotations" className="mt-6">
                <div className="space-y-6">
                  {/* Test Annotations - Temporary for debugging */}
                  <TestAnnotations
                    annotations={annotations}
                    onAddAnnotation={addVoiceAnnotation}
                    userId={userId}
                    userName={userName}
                    userColor={userColor}
                  />
                  
                  {/* Original components commented out for now
                  <VoiceAnnotation
                    nodeId={selectedNodeId || 'general'}
                    nodeName={selectedNodeId ? `Node: ${selectedNodeId}` : 'General Session Note'}
                    onAnnotationAdded={handleAnnotationAdded}
                    userColor={userColor}
                    userName={userName}
                  />
                  
                  <AnnotationsList
                    annotations={getAllAnnotations()}
                    currentUserId={userId}
                  />
                  */}
                </div>
              </TabsContent>

              <TabsContent value="trails" className="mt-6">
                <KnowledgeTrails
                  trails={trails}
                  currentUserId={userId}
                  onNavigateToNode={(nodeId) => {
                    // Record node visit if trail is active
                    const activeTrail = getActiveTrail();
                    if (activeTrail) {
                      visitNode(nodeId, `Node ${nodeId}`);
                    }
                    // Switch to graph tab and focus node
                    setActiveTab('graph');
                    // TODO: Implement node focus in graph
                  }}
                  onStartNewTrail={startTrail}
                  onEndTrail={endTrail}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};