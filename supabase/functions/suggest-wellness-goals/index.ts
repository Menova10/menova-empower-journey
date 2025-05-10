
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header provided' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with the user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://kiuaitdfimlmgvkybuxx.supabase.co';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, serviceRoleKey as string, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Error fetching user or unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's most recent check-in data from session_messages
    const { data: checkInData, error: checkInError } = await supabase
      .from('session_messages')
      .select('message, timestamp')
      .eq('sender', 'user')
      .order('timestamp', { ascending: false })
      .limit(5);

    if (checkInError) {
      console.error('Error fetching check-in data:', checkInError);
    }

    // Get user's menopause stage from profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('menopause_stage')
      .eq('id', user.id)
      .single();

    const menopauseStage = profileData?.menopause_stage || 'Not specified';

    // Fetch existing goals from today to avoid duplicates
    const { data: existingGoals } = await supabase
      .from('daily_goals')
      .select('goal')
      .eq('user_id', user.id)
      .eq('date', new Date().toISOString().split('T')[0]);

    const existingGoalTexts = existingGoals ? existingGoals.map(g => g.goal.toLowerCase()) : [];

    // Prepare context from check-in data
    let userContext = "The user has not shared any recent check-in information.";
    if (checkInData && checkInData.length > 0) {
      userContext = "Recent check-in information from the user: " + 
        checkInData.map(msg => msg.message).join(" ");
    }

    // Generate suggestions based on user context using OpenAI API
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      // Fallback suggestions if no API key
      const fallbackSuggestions = [
        "Take a 15-minute walk outside",
        "Drink 8 glasses of water today",
        "Practice deep breathing for 5 minutes",
        "Eat a meal rich in calcium and vitamin D",
        "Write down 3 things you're grateful for"
      ];
      
      return new Response(
        JSON.stringify({ 
          suggestions: fallbackSuggestions,
          error: null 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If we have an API key, generate personalized suggestions
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a wellness assistant for MeNova, an app supporting women through menopause. 
                     Generate 5 personalized daily wellness goal suggestions based on the user's info.
                     The user is in the ${menopauseStage} stage of menopause.
                     Goals should be specific, achievable in a day, and cover categories like nutrition, 
                     movement, mindfulness, symptom management, and self-care.
                     Use a warm, encouraging tone. Avoid suggesting goals the user already has.
                     Existing goals: ${existingGoalTexts.join(', ')}`
          },
          {
            role: "user",
            content: `Generate 5 personalized daily wellness goal suggestions based on this context: ${userContext}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const openaiData = await response.json();
    
    if (openaiData.error) {
      throw new Error(`OpenAI API error: ${openaiData.error.message}`);
    }

    // Extract suggestions from AI response
    let suggestions = [];
    try {
      const content = openaiData.choices[0].message.content;
      // Extract suggestions by finding numbered items
      const matches = content.match(/\d+\.\s+(.*?)(?=\n\d+\.|\n*$)/gs);
      if (matches && matches.length > 0) {
        suggestions = matches.map(match => {
          // Remove the number and any extra whitespace
          return match.replace(/^\d+\.\s+/, '').trim();
        });
      } else {
        // Fallback to splitting by newlines if numbered list not found
        suggestions = content
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && !line.startsWith('Here') && !line.includes('suggestions'));
      }

      // Ensure we have exactly 5 suggestions
      suggestions = suggestions.slice(0, 5);
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        suggestions,
        error: null 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in suggest-wellness-goals function:", error);
    return new Response(
      JSON.stringify({ 
        suggestions: null, 
        error: `Error generating suggestions: ${error.message}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
