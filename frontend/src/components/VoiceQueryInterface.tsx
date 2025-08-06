import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Loader2, AlertCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert } from './ui/alert';
import axios from 'axios';

interface VoiceQueryInterfaceProps {
  onQueryResult?: (query: string, results: any) => void;
  onTranscriptChange?: (transcript: string) => void;
  className?: string;
}

const VoiceQueryInterface: React.FC<VoiceQueryInterfaceProps> = ({
  onQueryResult,
  onTranscriptChange,
  className = ''
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [browserSupported, setBrowserSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const [voiceActivity, setVoiceActivity] = useState(0);
  const [manualInput, setManualInput] = useState('');

  // Check browser support
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setBrowserSupported(false);
      setError('Your browser does not support voice recognition. Please use Chrome, Edge, or Safari.');
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!browserSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;
    
    // Increase timeout and improve accuracy
    if ('webkitSpeechGrammarList' in window) {
      // Add custom vocabulary for better recognition
      const grammar = '#JSGF V1.0; grammar terms; public <term> = BDD | TDD | API | UI | UX | AI | ML | CRUD | REST | GraphQL | Neo4j | Gherkin | Cucumber | behavior driven development | test driven development | acceptance criteria | user stories;';
      const speechRecognitionList = new (window as any).webkitSpeechGrammarList();
      speechRecognitionList.addFromString(grammar, 1);
      recognition.grammars = speechRecognitionList;
    }

    recognition.onstart = () => {
      console.log('🎤 Voice recognition started');
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript + ' ';
        } else {
          interimText += transcript;
        }
      }

      if (finalText) {
        // Apply corrections for common misrecognitions
        const correctedText = applyCorrections(finalText);
        setTranscript(prev => prev + correctedText);
        if (onTranscriptChange) {
          onTranscriptChange(transcript + correctedText);
        }
      }
      setInterimTranscript(applyCorrections(interimText));

      // Simulate voice activity
      setVoiceActivity(Math.random() * 100);
    };

    recognition.onerror = (event: any) => {
      console.error('🎤 Speech recognition error:', event.error);
      
      let userFriendlyError = '';
      switch (event.error) {
        case 'aborted':
          userFriendlyError = 'Voice recognition was stopped. Try speaking again.';
          break;
        case 'no-speech':
          userFriendlyError = 'No speech detected. Please speak clearly and try again.';
          break;
        case 'audio-capture':
          userFriendlyError = 'Microphone not accessible. Please check permissions.';
          break;
        case 'network':
          userFriendlyError = 'Network error. Check your internet connection.';
          break;
        case 'not-allowed':
          userFriendlyError = 'Microphone permission denied. Please allow microphone access.';
          break;
        default:
          userFriendlyError = `Voice recognition error: ${event.error}. Try again.`;
      }
      
      setError(userFriendlyError);
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('🎤 Voice recognition ended');
      setIsListening(false);
      setVoiceActivity(0);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [browserSupported, transcript, onTranscriptChange]);

  // Apply corrections for common speech recognition errors
  const applyCorrections = (text: string): string => {
    const corrections: { [key: string]: string } = {
      // Common BDD/TDD misrecognitions
      'btd': 'BDD',
      'bvd': 'BDD',
      'bfd': 'BDD',
      'B T D': 'BDD',
      'B V D': 'BDD',
      'B F D': 'BDD',
      'behavior driven development': 'behavior driven development',
      'behaviour driven development': 'behavior driven development',
      
      // Other technical terms
      'TD D': 'TDD',
      'test driven development': 'test driven development',
      'gerkin': 'Gherkin',
      'jerkin': 'Gherkin',
      'cucumber': 'Cucumber',
      'neo 4j': 'Neo4j',
      'neo4 j': 'Neo4j',
      'new 4j': 'Neo4j',
      
      // Common query words
      'what is': 'what is',
      'show me': 'show me',
      'find': 'find',
      'how many': 'how many',
      'explain': 'explain',
    };

    let correctedText = text;
    
    // Apply corrections
    Object.entries(corrections).forEach(([wrong, right]) => {
      const regex = new RegExp(wrong, 'gi');
      correctedText = correctedText.replace(regex, right);
    });

    return correctedText;
  };

  // Start/stop listening
  const toggleListening = () => {
    if (!browserSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      
      // Process the final query if we have transcript
      if (transcript.trim()) {
        processVoiceQuery(transcript.trim());
      }
    } else {
      setTranscript('');
      setInterimTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Process voice query
  const processVoiceQuery = async (query: string) => {
    setIsProcessing(true);
    console.log('🔍 Processing voice query:', query);

    try {
      // Call the backend voice API
      const response = await axios.post('/api/voice/query', {
        transcript: query,
        intent: detectIntent(query)
      });

      console.log('📊 Voice query response:', response.data);
      
      if (onQueryResult && response.data.success) {
        onQueryResult(query, response.data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to process voice query';
      setError(errorMessage);
      console.error('❌ Voice query error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Basic intent detection
  const detectIntent = (query: string): string => {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('show') || lowerQuery.includes('find') || lowerQuery.includes('search')) {
      return 'search';
    } else if (lowerQuery.includes('what') || lowerQuery.includes('explain')) {
      return 'explain';
    } else if (lowerQuery.includes('how many') || lowerQuery.includes('count')) {
      return 'count';
    } else if (lowerQuery.includes('relate') || lowerQuery.includes('connect')) {
      return 'relationship';
    }
    
    return 'general';
  };

  // Keyboard shortcut (spacebar to talk) - only when not typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't activate voice if user is typing in an input field
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' || 
                      activeElement?.tagName === 'TEXTAREA' || 
                      (activeElement as HTMLElement)?.contentEditable === 'true';
      
      if (e.code === 'Space' && !isListening && browserSupported && !isTyping) {
        e.preventDefault();
        toggleListening();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Same check for key up
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' || 
                      activeElement?.tagName === 'TEXTAREA' || 
                      (activeElement as HTMLElement)?.contentEditable === 'true';
                      
      if (e.code === 'Space' && isListening && !isTyping) {
        e.preventDefault();
        toggleListening();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isListening, browserSupported]);

  return (
    <div className={`voice-query-interface ${className}`}>
      <Card className="p-6">
        <div className="flex flex-col items-center space-y-6">
          {/* Voice Button */}
          <div className="relative">
            <Button
              size="lg"
              variant={isListening ? "destructive" : "default"}
              className={`rounded-full w-24 h-24 ${isListening ? 'animate-pulse' : ''}`}
              onClick={toggleListening}
              disabled={!browserSupported || isProcessing}
            >
              {isListening ? (
                <MicOff className="h-10 w-10" />
              ) : (
                <Mic className="h-10 w-10" />
              )}
            </Button>
            
            {/* Voice Activity Indicator */}
            {isListening && (
              <div className="absolute inset-0 rounded-full pointer-events-none">
                <div 
                  className="absolute inset-0 rounded-full bg-infinity-blue-400 opacity-30 animate-ping"
                  style={{ 
                    transform: `scale(${1 + voiceActivity / 200})`,
                    transition: 'transform 0.1s ease-out'
                  }}
                />
              </div>
            )}
          </div>

          {/* Status */}
          <div className="text-center space-y-2">
            {isListening && (
              <Badge variant="default" className="animate-pulse">
                <Volume2 className="h-3 w-3 mr-1" />
                Listening...
              </Badge>
            )}
            
            {isProcessing && (
              <Badge variant="secondary">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Processing...
              </Badge>
            )}
            
            {!isListening && !isProcessing && (
              <p className="text-sm text-gray-600">
                Click the microphone to start (spacebar works when not typing)
              </p>
            )}
          </div>

          {/* Transcript Display */}
          {(transcript || interimTranscript) && (
            <Card className="w-full max-w-2xl p-4 bg-gray-50">
              <div className="space-y-2">
                {transcript && (
                  <div>
                    <p className="text-sm text-gray-800">{transcript}</p>
                    <div className="mt-2 flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setTranscript('');
                          setError(null);
                        }}
                      >
                        Clear
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => processVoiceQuery(transcript)}
                        disabled={isProcessing}
                      >
                        Process Query
                      </Button>
                    </div>
                  </div>
                )}
                {interimTranscript && (
                  <p className="text-sm text-gray-500 italic">{interimTranscript}</p>
                )}
              </div>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Alert className="max-w-2xl">
              <AlertCircle className="h-4 w-4" />
              <div className="ml-2">{error}</div>
            </Alert>
          )}

          {/* Manual Input Backup */}
          <Card className="w-full max-w-2xl p-4 bg-blue-50 border-blue-200">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Voice not working? Type your query:</h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type your question here..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-infinity-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && manualInput.trim()) {
                    processVoiceQuery(manualInput.trim());
                    setManualInput('');
                  }
                }}
              />
              <Button
                onClick={() => {
                  if (manualInput.trim()) {
                    processVoiceQuery(manualInput.trim());
                    setManualInput('');
                  }
                }}
                disabled={!manualInput.trim() || isProcessing}
              >
                Ask
              </Button>
            </div>
          </Card>

          {/* Instructions */}
          <div className="text-center space-y-3 text-sm text-gray-600">
            <p className="font-medium">Speech Recognition Tips:</p>
            <div className="space-y-2">
              <p>• Speak clearly and at normal pace</p>
              <p>• Use technical terms: "BDD", "Gherkin", "Cucumber"</p>
              <p>• Try: "What is behavior driven development?"</p>
            </div>
            <div className="space-x-2 mt-3">
              <Badge variant="outline">"Show me documents about BDD"</Badge>
              <Badge variant="outline">"What connects testing and cucumber?"</Badge>
              <Badge variant="outline">"Find all concepts"</Badge>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default VoiceQueryInterface;