import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface TestAnnotationsProps {
  annotations: Map<string, any[]>;
  onAddAnnotation: (nodeId: string, audioData: string, duration?: number) => void;
  userId: string;
  userName: string;
  userColor: string;
}

export const TestAnnotations: React.FC<TestAnnotationsProps> = ({
  annotations,
  onAddAnnotation,
  userId,
  userName,
  userColor
}) => {
  const [testCount, setTestCount] = useState(0);

  const sendTestAnnotation = () => {
    const testData = {
      nodeId: 'test-node',
      audioData: `data:audio/webm;base64,TEST_AUDIO_${Date.now()}`,
      duration: 5
    };
    
    console.log('Sending test annotation:', testData);
    console.log('Current annotations before send:', annotations);
    onAddAnnotation(testData.nodeId, testData.audioData, testData.duration);
    setTestCount(prev => prev + 1);
    
    // Log after a short delay to see if it was added
    setTimeout(() => {
      console.log('Annotations after send:', annotations);
    }, 1000);
  };

  // Get all annotations
  const allAnnotations: any[] = [];
  annotations.forEach((nodeAnnotations) => {
    allAnnotations.push(...nodeAnnotations);
  });

  return (
    <div className="space-y-4">
      {/* Debug Info */}
      <Card className="p-4 bg-gray-50">
        <h3 className="font-semibold mb-2">Debug Info</h3>
        <div className="space-y-1 text-sm">
          <p>User ID: {userId}</p>
          <p>User Name: {userName}</p>
          <p>User Color: <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: userColor }}></span> {userColor}</p>
          <p>Test Annotations Sent: {testCount}</p>
          <p>Total Annotations: {allAnnotations.length}</p>
        </div>
      </Card>

      {/* Test Button */}
      <Card className="p-4">
        <Button onClick={sendTestAnnotation} className="w-full">
          Send Test Annotation
        </Button>
      </Card>

      {/* Annotations List */}
      <Card className="p-4">
        <h3 className="font-semibold mb-2">All Annotations ({allAnnotations.length})</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {allAnnotations.length === 0 ? (
            <p className="text-sm text-gray-500">No annotations yet</p>
          ) : (
            allAnnotations.map((ann, idx) => (
              <div key={idx} className="p-2 bg-gray-100 rounded text-xs">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: ann.userColor }}></span>
                  <span className="font-medium">{ann.userName}</span>
                  <Badge variant="outline" className="text-xs">{ann.nodeId}</Badge>
                </div>
                <p className="mt-1 text-gray-600">
                  {new Date(ann.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};