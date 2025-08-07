import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Mic, MicOff, Loader2, Users } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface CollaborativeInfo {
  sessionId?: string;
  userName?: string;
  userColor?: string;
  participantCount?: number;
}

interface VoiceQueryInterfaceProps {
  onQueryProcessed: (transcript: string, intent: string) => void;
  collaborative?: CollaborativeInfo;
}

export const VoiceQueryInterface: React.FC<VoiceQueryInterfaceProps> = ({ 
  onQueryProcessed,
  collaborative 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [intent, setIntent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [browserSupported, setBrowserSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>('');

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setBrowserSupported(false);
      return;
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setError(null);
      setTranscript('');
      finalTranscriptRef.current = '';
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        finalTranscriptRef.current = finalTranscript;
        setTranscript(finalTranscript);
        
        // Detect intent
        const detectedIntent = detectIntent(finalTranscript);
        setIntent(detectedIntent);
      } else if (interimTranscript) {
        setTranscript(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsListening(false);
      setIsWarmingUp(false);
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsListening(false);
      setIsWarmingUp(false);
      
      // Process the final transcript
      if (finalTranscriptRef.current) {
        const finalIntent = detectIntent(finalTranscriptRef.current);
        onQueryProcessed(finalTranscriptRef.current, finalIntent);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onQueryProcessed]);

  // Detect intent from transcript
  const detectIntent = useCallback((text: string): string => {
    const lowerText = text.toLowerCase();
    
    // Order matters! More specific patterns first
    if (/^(how many|count|number of|total)/i.test(text)) {
      return 'count';
    } else if (/^(what is|explain|tell me about|describe)/i.test(text)) {
      return 'explain';
    } else if (/^(show|find|search|get|list|display)/i.test(text)) {
      return 'search';
    }
    
    // Default intents based on keywords anywhere in the text
    if (lowerText.includes('how many') || lowerText.includes('count')) {
      return 'count';
    } else if (lowerText.includes('what') || lowerText.includes('explain')) {
      return 'explain';
    }
    
    return 'search';
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsWarmingUp(true);
      setTranscript('');
      setIntent('');
      
      // Add warmup delay
      setTimeout(() => {
        setIsWarmingUp(false);
        recognitionRef.current.start();
        setIsListening(true);
      }, 800);
    }
  }, [isListening]);

  if (!browserSupported) {
    return (
      <Alert>
        <AlertDescription>
          Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Voice Query</h3>
          {collaborative && collaborative.participantCount > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {collaborative.participantCount} participants
            </Badge>
          )}
        </div>

        {/* Microphone Button */}
        <div className="flex flex-col items-center space-y-4">
          <Button
            size="lg"
            variant={isListening ? "destructive" : "default"}
            className={`rounded-full h-20 w-20 ${isListening ? 'animate-pulse' : ''}`}
            onClick={toggleListening}
            disabled={isWarmingUp}
          >
            {isWarmingUp ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : isListening ? (
              <MicOff className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>

          <div className="text-center">
            {isWarmingUp && (
              <p className="text-sm text-muted-foreground">Warming up microphone...</p>
            )}
            {isListening && !isWarmingUp && (
              <p className="text-sm text-muted-foreground animate-pulse">Listening...</p>
            )}
            {!isListening && !isWarmingUp && (
              <p className="text-sm text-muted-foreground">Click to start voice query</p>
            )}
          </div>
        </div>

        {/* Transcript Display */}
        {transcript && (
          <div className="space-y-2">
            <div className="p-4 bg-accent rounded-lg">
              <p className="text-sm font-medium">{transcript}</p>
            </div>
            {intent && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Intent:</span>
                <Badge variant="outline">{intent}</Badge>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Collaborative Info */}
        {collaborative && collaborative.userName && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: collaborative.userColor }}
            />
            <span>Speaking as {collaborative.userName}</span>
          </div>
        )}
      </div>
    </Card>
  );
};