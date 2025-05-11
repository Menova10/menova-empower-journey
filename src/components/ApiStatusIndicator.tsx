
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface ApiStatus {
  firecrawl: {
    success: boolean;
    message: string;
    details?: any;
  };
  openai: {
    success: boolean;
    message: string;
    details?: any;
  };
  timestamp?: string;
  environment?: {
    hasFirecrawlKey: boolean;
    firecrawlKeyFirstChars: string;
    hasOpenAIKey: boolean;
    timestamp: string;
  };
}

interface ApiStatusIndicatorProps {
  showDetails?: boolean;
  compact?: boolean;
}

export default function ApiStatusIndicator({ showDetails = false, compact = false }: ApiStatusIndicatorProps) {
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('test-api-connectivity', {});
      
      if (error) {
        setError(`Failed to check API status: ${error.message}`);
        toast({
          title: "Connection Error",
          description: "Failed to check API status. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      if (data) {
        console.log("=== API CONNECTIVITY TEST RESULTS ===", data);
        setStatus(data as ApiStatus);
        
        // Show toast notification with results
        if (data.firecrawl?.success || data.openai?.success) {
          toast({
            title: "API Status",
            description: `Firecrawl: ${data.firecrawl?.success ? '✅' : '❌'} | OpenAI: ${data.openai?.success ? '✅' : '❌'}`,
            variant: data.firecrawl?.success && data.openai?.success ? "default" : "warning"
          });
        } else {
          toast({
            title: "API Connection Issues",
            description: "Both APIs are currently unavailable. Using fallback content.",
            variant: "destructive"
          });
        }
      }
    } catch (err) {
      console.error("Error checking API status:", err);
      setError("Failed to check API status");
    } finally {
      setLoading(false);
    }
  };

  // Fetch status on initial load
  useEffect(() => {
    if (showDetails && !status) {
      fetchStatus();
    }
  }, [showDetails]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchStatus} 
          disabled={loading}
          className="h-7 px-2 text-xs"
        >
          {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Check APIs"}
        </Button>
        
        {status && (
          <>
            <Badge 
              variant={status.firecrawl.success ? "default" : "outline"} 
              className={`h-6 px-2 text-xs ${status.firecrawl.success ? 'bg-green-500' : 'text-amber-500 border-amber-500'}`}
            >
              {status.firecrawl.success ? (
                <CheckCircle className="h-3 w-3 mr-1" />
              ) : (
                <XCircle className="h-3 w-3 mr-1" />
              )}
              Firecrawl
            </Badge>
            
            <Badge 
              variant={status.openai.success ? "default" : "outline"} 
              className={`h-6 px-2 text-xs ${status.openai.success ? 'bg-green-500' : 'text-amber-500 border-amber-500'}`}
            >
              {status.openai.success ? (
                <CheckCircle className="h-3 w-3 mr-1" />
              ) : (
                <XCircle className="h-3 w-3 mr-1" />
              )}
              OpenAI
            </Badge>
          </>
        )}
        
        {error && <XCircle className="h-4 w-4 text-red-500" title={error} />}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" /> 
        <span>Checking API status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Connection Error</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{error}</p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={fetchStatus}
            className="mt-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" /> Try Again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (status && showDetails) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Badge 
            variant={status.firecrawl.success ? "default" : "outline"} 
            className={`${status.firecrawl.success ? 'bg-green-500' : 'text-amber-500 border-amber-500'}`}
          >
            {status.firecrawl.success ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <XCircle className="h-3 w-3 mr-1" />
            )}
            Firecrawl API {status.firecrawl.success ? 'Connected' : 'Issue'}
          </Badge>
          
          <Badge 
            variant={status.openai.success ? "default" : "outline"} 
            className={`${status.openai.success ? 'bg-green-500' : 'text-amber-500 border-amber-500'}`}
          >
            {status.openai.success ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <XCircle className="h-3 w-3 mr-1" />
            )}
            OpenAI API {status.openai.success ? 'Connected' : 'Issue'}
          </Badge>
          
          <span className="text-xs text-muted-foreground">
            Last checked: {status.timestamp ? new Date(status.timestamp).toLocaleTimeString() : 'Unknown'}
          </span>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchStatus}
            className="h-7 ml-auto"
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Recheck
          </Button>
        </div>
        
        {!status.firecrawl.success && !status.openai.success && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>API Connectivity Issues</AlertTitle>
            <AlertDescription>
              <p>Both APIs are currently unavailable. Using fallback content.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Firecrawl: {status.firecrawl.message}<br />
                OpenAI: {status.openai.message}
              </p>
            </AlertDescription>
          </Alert>
        )}
        
        {(!status.firecrawl.success && status.openai.success) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Using OpenAI API for Content</AlertTitle>
            <AlertDescription>
              <p>Firecrawl API is unavailable. Using OpenAI as fallback for content generation.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Firecrawl error: {status.firecrawl.message}
              </p>
            </AlertDescription>
          </Alert>
        )}
        
        {(status.firecrawl.success && !status.openai.success) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Using Firecrawl API for Content</AlertTitle>
            <AlertDescription>
              <p>OpenAI API is unavailable. Using Firecrawl for content, with static fallbacks if needed.</p>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={fetchStatus}
      disabled={loading}
      className="bg-transparent border-amber-500 text-amber-600 hover:bg-amber-50"
    >
      {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <AlertCircle className="h-4 w-4 mr-2" />}
      Check API Status
    </Button>
  );
}
