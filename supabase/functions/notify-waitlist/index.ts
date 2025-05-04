
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create a single supabase client for interacting with your database
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name, reason, birth_date, menopause_stage } = await req.json();

    console.log("Received waitlist submission:", { email, full_name, reason, birth_date, menopause_stage });

    // Send email to admin
    const adminEmail = "menovarocks@gmail.com";
    const adminSubject = `New MeNova Waitlist Submission: ${full_name}`;
    const adminText = `
      New waitlist submission:
      
      Name: ${full_name}
      Email: ${email}
      Date of Birth: ${birth_date || 'Not specified'}
      Menopause Stage: ${menopause_stage || 'Not specified'}
      Reason: ${reason || 'Not specified'}
      
      To approve this user, click here: ${supabaseUrl}/functions/v1/approve-waitlist?email=${encodeURIComponent(email)}&token=${generateApprovalToken(email)}
    `;
    
    // Log the admin email content
    console.log("Sending admin email to:", adminEmail);
    console.log("Admin email content:", adminText);

    await sendEmail(adminEmail, adminSubject, adminText);
    
    // Send confirmation email to user
    const userSubject = "Thank you for joining the MeNova waitlist!";
    const userText = `
      Hello ${full_name},
      
      Thank you for joining the MeNova waitlist! We are reviewing your submission and will notify you once your access has been approved.
      
      Best regards,
      The MeNova Team
    `;
    
    // Log the user email content
    console.log("Sending user confirmation email to:", email);
    console.log("User email content:", userText);

    await sendEmail(email, userSubject, userText);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error) {
    console.error("Error processing waitlist submission:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});

// Simple function to generate approval token (in production, use a more secure method)
function generateApprovalToken(email: string) {
  const timestamp = Date.now();
  return btoa(`${email}:${timestamp}`);
}

// Simple email sending function (would use a service like Resend or SendGrid in production)
async function sendEmail(to: string, subject: string, text: string) {
  // In a real implementation, this would use an email service
  console.log(`Email to ${to}:`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${text}`);
  console.log("-----");
  
  // For this example, we'll simulate successful email sending
  return { success: true };
}
