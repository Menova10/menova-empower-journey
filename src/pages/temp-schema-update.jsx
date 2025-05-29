import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

/**
 * Temporary page to update database schema
 * WARNING: DELETE THIS FILE AFTER USE
 */
const SchemaUpdatePage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  const updateSchema = async () => {
    setIsLoading(true);
    try {
      // You need to be logged in as a user with enough permissions
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setResult({
          success: false,
          message: 'You must be logged in to update the schema'
        });
        return;
      }

      // For standard users without rpc access, we'll try direct SQL
      const { error } = await supabase.from('profiles')
        .select('id')
        .limit(1)
        .then(async () => {
          // Now attempt to add the column via manual query
          // This requires permissions but might work depending on your Supabase config
          return supabase.rpc('add_phone_column');
        });

      if (error) {
        console.error('Error updating schema:', error);
        setResult({
          success: false,
          message: `Error: ${error.message}`
        });
        return;
      }

      setResult({
        success: true,
        message: 'Schema update attempted. Please check your profile page.'
      });
    } catch (error) {
      console.error('Error:', error);
      setResult({
        success: false,
        message: `Error: ${error.message}`
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-menova-beige flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Database Schema Update</h1>
        
        <p className="mb-6 text-gray-600">
          This page will attempt to add the 'phone' column to the profiles table.
          <br /><br />
          <strong className="text-red-500">WARNING:</strong> This is a temporary page and should be deleted after use.
        </p>
        
        <Button
          onClick={updateSchema}
          className="w-full mb-4 bg-menova-green hover:bg-menova-green/90"
          disabled={isLoading}
        >
          {isLoading ? 'Updating Schema...' : 'Update Schema'}
        </Button>
        
        {result && (
          <Alert className={result.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}>
            <AlertTitle>{result.success ? 'Success' : 'Error'}</AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-medium mb-2">Alternative Method</h2>
          <p className="text-sm text-gray-600 mb-4">
            If the button above doesn't work, you'll need to run the SQL statement in the Supabase dashboard:
          </p>
          
          <div className="bg-gray-100 p-3 rounded-md text-sm font-mono overflow-x-auto">
            <pre className="whitespace-pre-wrap">
              -- Add phone column to profiles table<br/>
              ALTER TABLE public.profiles<br/>
              ADD COLUMN IF NOT EXISTS phone TEXT;<br/><br/>
              
              -- Add comment to the column for documentation<br/>
              COMMENT ON COLUMN public.profiles.phone IS 'User phone number for WhatsApp notifications';<br/><br/>
              
              -- Create index for faster phone lookups<br/>
              CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchemaUpdatePage; 