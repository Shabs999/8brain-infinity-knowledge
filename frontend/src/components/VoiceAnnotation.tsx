import React, { useState, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Mic, MicOff, Play, Pause, Trash2, Send, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface VoiceAnnotationProps {
  nodeId: string;
  nodeName: string;
  onAnnotationAdded: (nodeId: string, audioData: string, transcript?: string) => void;
  userColor?: string;
  userName?: string;
}

interface Recording {
  blob: Blob;
  url: string;
  duration: number;
}

export const VoiceAnnotation: React.FC<VoiceAnnotationProps> = ({
  nodeId,
  nodeName,
  onAnnotationAdded,
  userColor = '#3b82f6',
  userName = 'User'
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecording({ blob, url, duration: recordingTime });
        setRecordingTime(0);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds++;
        setRecordingTime(seconds);
      }, 1000);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access microphone. Please check permissions.');
    }
  }, [recordingTime]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  // Play/pause recording
  const togglePlayback = useCallback(() => {
    if (!recording || !audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [recording, isPlaying]);

  // Delete recording
  const deleteRecording = useCallback(() => {
    if (recording) {
      URL.revokeObjectURL(recording.url);
      setRecording(null);
      setIsPlaying(false);
    }
  }, [recording]);

  // Send annotation
  const sendAnnotation = useCallback(async () => {
    if (!recording) return;
    
    setIsSending(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(recording.blob);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        
        // Send the annotation with duration
        onAnnotationAdded(nodeId, base64data, recording.duration);
        
        // Clean up
        deleteRecording();
        setIsSending(false);
      };
      reader.onerror = () => {
        console.error('Error reading audio file');
        setError('Failed to read audio file. Please try again.');
        setIsSending(false);
      };
    } catch (err) {
      console.error('Error sending annotation:', err);
      setError('Failed to send annotation. Please try again.');
      setIsSending(false);
    }
  }, [recording, nodeId, onAnnotationAdded, deleteRecording]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Add Voice Note</h3>
            <p className="text-sm text-muted-foreground">
              Annotate "{nodeName}"
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: userColor }}
            />
            <span className="text-sm">{userName}</span>
          </div>
        </div>

        {/* Recording Controls */}
        {!recording ? (
          <div className="flex flex-col items-center space-y-4">
            <Button
              size="lg"
              variant={isRecording ? "destructive" : "default"}
              className={`rounded-full h-16 w-16 ${isRecording ? 'animate-pulse' : ''} ${!isRecording ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
            
            {isRecording && (
              <div className="text-center">
                <Badge variant="destructive" className="animate-pulse">
                  Recording {formatTime(recordingTime)}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  Click to stop recording
                </p>
              </div>
            )}
            
            {!isRecording && (
              <p className="text-sm text-muted-foreground">
                Click to start recording
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Playback Controls */}
            <div className="flex items-center gap-4">
              <Button
                size="sm"
                variant="outline"
                onClick={togglePlayback}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <div className="flex-1">
                <audio
                  ref={audioRef}
                  src={recording.url}
                  onEnded={() => setIsPlaying(false)}
                />
                <div className="text-sm text-muted-foreground">
                  Duration: {formatTime(recording.duration)}
                </div>
              </div>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={deleteRecording}
                disabled={isSending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Send Button */}
            <Button
              className="w-full"
              onClick={sendAnnotation}
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Add Annotation
                </>
              )}
            </Button>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
};