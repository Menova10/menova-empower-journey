
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();

    if (!message) {
      throw new Error('No message provided');
    }

    // This would be where we call the OpenAI API
    // For now, we'll mock responses based on keywords
    let response = '';
    
    if (message.toLowerCase().includes('hot flash') || message.toLowerCase().includes('hot flashes')) {
      response = "I hear you—hot flashes can be really disruptive. Try a cooling breath exercise: inhale for 4, exhale for 6. Keeping a small fan nearby might help too. Would you like to log this on the Symptom Tracker page? You're taking such great steps by sharing how you feel!";
    } else if (message.toLowerCase().includes('mood swing') || message.toLowerCase().includes('mood swings')) {
      response = "I hear you—mood swings can be challenging during menopause. Try a 5-minute breathing exercise: inhale for 4, exhale for 6. A short mindfulness activity might help too. Would you like to log this on the Symptom Tracker page? You're taking such great steps for your well-being!";
    } else if (message.toLowerCase().includes('tired') || message.toLowerCase().includes('fatigue') || message.toLowerCase().includes('exhausted')) {
      response = "Fatigue during menopause is common due to hormonal changes affecting your sleep and energy levels. Try setting a consistent sleep schedule and consider gentle movement like yoga. The Community page has helpful discussions about managing energy levels too. You're doing great by recognizing what your body needs!";
    } else if (message.toLowerCase().includes('sleep') || message.toLowerCase().includes('insomnia')) {
      response = "Sleep disruptions are common during menopause. Try creating a cool, dark sleeping environment and a relaxing bedtime routine. Limiting screens and caffeine before bed can help too. Would logging this symptom help you track patterns? You're taking important steps by addressing this!";
    } else if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi') || message.toLowerCase().includes('hey')) {
      response = "Hello there! I'm MeNova, your companion through menopause. I'm here to support you with information, symptom tracking, and mindfulness techniques. How are you feeling today? Remember, I'm here to listen and help whenever you need.";
    } else {
      response = "I'm here to support you through your menopause journey. If you're experiencing any symptoms or have questions, feel free to share. You might also find it helpful to connect with others in our Community page. What's on your mind today? Remember, you're doing wonderfully by seeking support.";
    }

    // Extract potential symptoms
    const symptomKeywords = [
      'hot flash', 'hot flashes', 'mood swing', 'mood swings', 'fatigue',
      'tired', 'exhausted', 'insomnia', 'joint pain', 'ache', 'pain',
      'night sweat', 'night sweats', 'anxiety', 'depression'
    ];
    
    const detectedSymptoms = symptomKeywords.filter(symptom => 
      message.toLowerCase().includes(symptom)
    );

    return new Response(
      JSON.stringify({ 
        response, 
        detectedSymptoms: detectedSymptoms.length > 0 ? detectedSymptoms[0] : null 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in menova-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
