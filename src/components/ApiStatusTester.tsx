
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ApiTestResult {
  success: boolean;
  message: string;
  details?: any;
}

interface TestResults {
  timestamp: string;
  firecrawl: ApiTestResult;
  openai: ApiTestResult;
  environment: {
    hasFirecrawlKey: boolean;
    hasOpenAIKey: boolean;
  };
}

export default function ApiStatusTester() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const testApiConnectivity = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-api-connectivity');
      
      if (error) {
        console.error('API test error:', error);
        setError(`Error testing APIs: ${error.message}`);
        return;
      }
      
      console.log('API test results:', data);
      setResults(data);
    } catch (err) {
      console.error('Error during API testing:', err);
      setError(`Error: ${err.message || 'Unknown error occurred'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const testMainEdgeFunctions = async () => {
    setIsLoading(true);
    
    try {
      // Test fetch-menopause-research function
      console.log('Testing fetch-menopause-research function...');
      const researchResult = await supabase.functions.invoke('fetch-menopause-research', {
        body: { topic: "api test", phase: "test", limit: 1 }
      });
      
      console.log('Research function result:', researchResult);
      
      // Test enhanced-content-fetch function
      console.log('Testing enhanced-content-fetch function...');
      const contentResult = await supabase.functions.invoke('enhanced-content-fetch', {
        body: { params: { type: 'article', topic: 'api test', count: 1 } }
      });
      
      console.log('Content function result:', contentResult);
    } catch (err) {
      console.error('Error testing main functions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gray-50 dark:bg-gray-900">
        <CardTitle className="text-lg flex items-center gap-2">
          API Connectivity Tester
          <Badge variant={expanded ? "default" : "outline"} className="ml-2">
            {expanded ? "Advanced" : "Diagnostic"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Check if your external API connections are working
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {error && (
          <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}
        
        {results && (
          <div className="space-y-4">
            <div className="text-sm text-gray-500">
              Last tested: {new Date(results.timestamp).toLocaleString()}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-md p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Firecrawl API</h3>
                  {results.firecrawl.success ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" /> Failed
                    </Badge>
                  )}
                </div>
                <p className="text-sm">{results.firecrawl.message}</p>
                {expanded && results.firecrawl.details && (
                  <div className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                    <pre>{JSON.stringify(results.firecrawl.details, null, 2)}</pre>
                  </div>
                )}
              </div>
              
              <div className="border rounded-md p-3">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">OpenAI API</h3>
                  {results.openai.success ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" /> Failed
                    </Badge>
                  )}
                </div>
                <p className="text-sm">{results.openai.message}</p>
                {expanded && results.openai.details && (
                  <div className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                    <pre>{JSON.stringify(results.openai.details, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
            
            {expanded && (
              <div className="border rounded-md p-3">
                <h3 className="font-medium mb-2">Environment</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center">
                    <span className="text-sm mr-2">Firecrawl API Key:</span>
                    {results.environment.hasFirecrawlKey ? (
                      <Badge className="bg-green-100 text-green-800">Present</Badge>
                    ) : (
                      <Badge variant="destructive">Missing</Badge>
                    )}
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm mr-2">OpenAI API Key:</span>
                    {results.environment.hasOpenAIKey ? (
                      <Badge className="bg-green-100 text-green-800">Present</Badge>
                    ) : (
                      <Badge variant="destructive">Missing</Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-wrap gap-2 bg-gray-50 dark:bg-gray-900 p-4">
        <Button
          onClick={testApiConnectivity}
          disabled={isLoading}
          className="bg-[#4caf50] hover:bg-[#388e3c] text-white flex items-center gap-1"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Test API Connectivity
        </Button>
        
        {expanded && (
          <Button
            onClick={testMainEdgeFunctions}
            disabled={isLoading}
            variant="outline"
            className="flex items-center gap-1"
          >
            <ExternalLink className="h-4 w-4" />
            Test Edge Functions
          </Button>
        )}
        
        <Button
          onClick={() => setExpanded(!expanded)}
          variant="ghost"
          size="sm"
          className="ml-auto"
        >
          {expanded ? "Show Less" : "Show More"}
        </Button>
      </CardFooter>
    </Card>
  );
}
