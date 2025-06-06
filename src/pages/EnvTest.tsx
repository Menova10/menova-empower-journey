import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const EnvTest = () => {
  const apiKey = import.meta.env.VITE_VAPI_API_KEY;
  const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;
  
  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables Test</CardTitle>
            <CardDescription>Check if environment variables are loading</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">VITE_VAPI_API_KEY:</div>
              <div className="text-xs bg-gray-100 p-2 rounded">
                {apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'NOT SET'}
              </div>
              <div className="text-xs text-gray-500">
                Length: {apiKey?.length || 0} characters
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm font-medium">VITE_VAPI_ASSISTANT_ID:</div>
              <div className="text-xs bg-gray-100 p-2 rounded">
                {assistantId ? `${assistantId.substring(0, 8)}...${assistantId.substring(assistantId.length - 4)}` : 'NOT SET'}
              </div>
              <div className="text-xs text-gray-500">
                Length: {assistantId?.length || 0} characters
              </div>
            </div>
            
            <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded">
              <strong>Debug Info:</strong><br/>
              • API Key Valid: {apiKey && apiKey.length > 10 ? '✅' : '❌'}<br/>
              • Assistant ID Valid: {assistantId && assistantId.length > 10 ? '✅' : '❌'}<br/>
              • Both Required: {apiKey && assistantId ? '✅' : '❌'}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnvTest; 