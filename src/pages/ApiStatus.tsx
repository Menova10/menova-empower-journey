
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ApiStatusTester from '@/components/ApiStatusTester';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BreadcrumbTrail } from '@/components/BreadcrumbTrail';
import { AlertTriangle, Database, Key, RefreshCw, Server, ShieldAlert } from 'lucide-react';

const ApiStatus: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const { toast } = useToast();
  
  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Test the key before saving
      const { data, error } = await supabase.functions.invoke('set-firecrawl-api-key', {
        body: { apiKey }
      });
      
      if (error) {
        console.error('Error setting API key:', error);
        toast({
          title: "Error",
          description: "Failed to save API key: " + error.message,
          variant: "destructive",
        });
        return;
      }
      
      if (data?.success) {
        toast({
          title: "Success",
          description: "Firecrawl API key has been saved and verified",
        });
        // Run a connectivity test to update the status
        const testResult = await supabase.functions.invoke('test-api-connectivity');
        setTestResult(testResult.data);
      } else {
        toast({
          title: "Warning",
          description: data?.message || "API key was saved but could not be verified",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error in saveApiKey:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setApiKey(''); // Clear the input for security
    }
  };
  
  return (
    <div className="min-h-screen bg-menova-beige bg-menova-pattern">
      <div className="container mx-auto px-4 py-8">
        <BreadcrumbTrail currentPath="/api-status" />
        
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2 text-menova-text">API Status & Configuration</h1>
          <p className="text-gray-600 mb-8">
            Monitor and manage API connections that power MeNova's content features
          </p>
          
          <Tabs defaultValue="status">
            <TabsList className="grid grid-cols-3 mb-8">
              <TabsTrigger value="status" className="flex items-center gap-2">
                <Server className="w-4 h-4" /> API Status
              </TabsTrigger>
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Key className="w-4 h-4" /> API Configuration
              </TabsTrigger>
              <TabsTrigger value="test" className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Advanced Testing
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="status" className="space-y-6">
              <Card className="bg-white shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" /> API Connectivity Status
                  </CardTitle>
                  <CardDescription>
                    Check if MeNova can connect to external APIs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ApiStatusTester showDetails={true} />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="config" className="space-y-6">
              <Card className="bg-white shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" /> Firecrawl API Configuration
                  </CardTitle>
                  <CardDescription>
                    Update your Firecrawl API key to enable content features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-md bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-amber-800">Important Security Notice</h4>
                        <p className="text-sm text-amber-700">
                          This API key will be stored securely in your Supabase project's function secrets.
                          It will only be used server-side and will not be exposed to the browser.
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid gap-3">
                      <Label htmlFor="apiKey">Firecrawl API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder="Enter your Firecrawl API key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                      <p className="text-xs text-gray-500">
                        You can find your API key in the Firecrawl dashboard. Don't have one?{" "}
                        <a 
                          href="https://firecrawl.dev" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-green-600 hover:underline"
                        >
                          Get one here
                        </a>
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button 
                    onClick={saveApiKey} 
                    disabled={isSaving || !apiKey.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      "Save API Key"
                    )}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="bg-white shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5" /> API Security
                  </CardTitle>
                  <CardDescription>
                    Information about how API keys are stored and used
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <p>
                      <strong>How API keys are stored:</strong> API keys are stored as secrets in your Supabase Edge Functions environment.
                      They are never exposed to the client and are only used server-side.
                    </p>
                    <p>
                      <strong>How API keys are used:</strong> These keys are used by our edge functions to fetch content from external sources
                      like Firecrawl for articles and OpenAI for AI-generated content when needed.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="test" className="space-y-6">
              <Card className="bg-white shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" /> Edge Function Testing
                  </CardTitle>
                  <CardDescription>
                    Test the various edge functions that power MeNova's content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">Advanced Diagnostics</h4>
                      <p className="text-sm text-blue-700 mb-4">
                        These tools allow you to test specific edge functions directly. This can help isolate issues
                        with specific API integrations.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                          variant="outline"
                          className="border-blue-400 text-blue-700 hover:bg-blue-50"
                          onClick={async () => {
                            toast({
                              title: "Testing Content Fetch",
                              description: "Checking the enhanced-content-fetch function...",
                            });
                            
                            try {
                              const { data, error } = await supabase.functions.invoke('enhanced-content-fetch', {
                                body: { 
                                  params: { 
                                    type: 'article', 
                                    topic: 'menopause test', 
                                    count: 1 
                                  } 
                                }
                              });
                              
                              if (error) throw error;
                              
                              toast({
                                title: "Content Fetch Result",
                                description: "Function executed successfully. Check console for details.",
                              });
                              
                              console.log("Enhanced Content Fetch Result:", data);
                            } catch (err) {
                              console.error("Error testing content fetch:", err);
                              toast({
                                title: "Error",
                                description: "Failed to test content fetch function. See console for details.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Test Content Fetch
                        </Button>
                        
                        <Button
                          variant="outline"
                          className="border-blue-400 text-blue-700 hover:bg-blue-50"
                          onClick={async () => {
                            toast({
                              title: "Testing Research Function",
                              description: "Checking the fetch-menopause-research function...",
                            });
                            
                            try {
                              const { data, error } = await supabase.functions.invoke('fetch-menopause-research', {
                                body: { topic: "menopause test", phase: "test", limit: 1 }
                              });
                              
                              if (error) throw error;
                              
                              toast({
                                title: "Research Function Result",
                                description: "Function executed successfully. Check console for details.",
                              });
                              
                              console.log("Research Function Result:", data);
                            } catch (err) {
                              console.error("Error testing research function:", err);
                              toast({
                                title: "Error",
                                description: "Failed to test research function. See console for details.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Test Research Function
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ApiStatus;
