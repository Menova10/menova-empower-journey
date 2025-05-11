
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  Alert, 
  AlertTitle, 
  AlertDescription 
} from './ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface ApiStatusProps {
  className?: string;
  showDetails?: boolean;
}

interface ApiTestResult {
  timestamp: string;
  firecrawl: {
    success: boolean;
    message: string;
    details?: any;
  };
  openai?: {
    success: boolean;
    message: string;
    details?: any;
  };
  environment?: {
    hasFirecrawlKey: boolean;
    hasOpenAIKey: boolean;
    firecrawlKeyFirstChars: string;
    timestamp: string;
    deployEnvironment: string;
  };
}

export default function ApiStatusIndicator({ className, showDetails = false }: ApiStatusProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<ApiTestResult | null>(null);
  const [showTestResults, setShowTestResults] = useState(false);

  const runApiTest = async () => {
    setLoading(true);
    setShowTestResults(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-api-connectivity');
      
      if (error) {
        console.error("Failed to test API connectivity:", error);
        toast({
          title: "API Test Failed",
          description: "Could not connect to API testing endpoint. Check console for details.",
          variant: "destructive"
        });
        setTestResults(null);
        return;
      }
      
      console.log("API Connectivity Test Results:", data);
      setTestResults(data);
      
      // Show toast message with results
      if (data?.firecrawl.success) {
        toast({
          title: "API Test Successful",
          description: "Firecrawl API connection is working properly.",
          variant: "default"
        });
      } else {
        toast({
          title: "API Connection Issue",
          description: data?.firecrawl.message || "Firecrawl API connection failed.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error("Error running API connectivity test:", err);
      toast({
        title: "Test Failed",
        description: "Failed to run API connectivity test. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getApiStatusVariant = () => {
    if (!testResults) return "default";
    if (testResults.firecrawl.success) return "success";
    return "destructive";
  };

  return (
    <div className={className}>
      {showDetails && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">API Connection Status</h3>
          
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              onClick={runApiTest}
              disabled={loading}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  Test API Connection
                </>
              )}
            </Button>
            
            {testResults && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Firecrawl API:
                </span>
                {testResults.firecrawl.success ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle className="h-4 w-4" /> Failed
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Test Results */}
          {showTestResults && testResults && (
            <Alert
              variant={getApiStatusVariant()}
              className="bg-card border-muted-foreground/20"
            >
              <AlertTitle className="flex items-center justify-between">
                <span>API Connection Test Results</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(testResults.timestamp).toLocaleTimeString()}
                </span>
              </AlertTitle>
              <AlertDescription>
                <div className="space-y-2 mt-2">
                  <div className="px-4 py-2 bg-background rounded border">
                    <h4 className="font-medium flex items-center gap-2">
                      Firecrawl API
                      {testResults.firecrawl.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </h4>
                    <p className="text-sm mt-1">{testResults.firecrawl.message}</p>
                    
                    {/* Show more detailed information */}
                    {testResults.firecrawl.details && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <p>Image Search: {testResults.firecrawl.details.imageSearch?.ok ? '✅' : '❌'} 
                          ({testResults.firecrawl.details.imageSearch?.status})
                        </p>
                        <p>Web Search: {testResults.firecrawl.details.webSearch?.ok ? '✅' : '❌'} 
                          ({testResults.firecrawl.details.webSearch?.status})
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Environment Info */}
                  {testResults.environment && (
                    <div className="border border-muted rounded p-2 bg-background/50">
                      <p className="text-xs text-muted-foreground">
                        <strong>API Keys:</strong> Firecrawl ({testResults.environment.hasFirecrawlKey ? '✅' : '❌'}),
                        OpenAI ({testResults.environment.hasOpenAIKey ? '✅' : '❌'})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>Environment:</strong> {testResults.environment.deployEnvironment}
                      </p>
                    </div>
                  )}
                  
                  {/* Troubleshooting help */}
                  {!testResults.firecrawl.success && (
                    <div className="border-l-4 border-amber-500 pl-3 py-2 bg-amber-50 dark:bg-amber-950/10 rounded-r">
                      <h5 className="font-medium text-sm text-amber-800 dark:text-amber-300">Troubleshooting Tips</h5>
                      <ul className="text-xs list-disc list-inside text-amber-700 dark:text-amber-400 mt-1 space-y-1">
                        <li>Check if your Firecrawl API key is correct in Supabase Edge Function Secrets</li>
                        <li>Verify that the Firecrawl service is operational</li>
                        <li>Check if the API endpoints in the code match Firecrawl documentation</li>
                        <li>
                          <a 
                            href="https://docs.firecrawl.dev" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center hover:underline gap-1"
                          >
                            Firecrawl API Docs <ExternalLink className="h-3 w-3" />
                          </a>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
      
      {!showDetails && (
        <Button
          onClick={runApiTest}
          disabled={loading}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Testing APIs...
            </>
          ) : (
            <>
              Test API Connectivity
            </>
          )}
        </Button>
      )}
    </div>
  );
}
