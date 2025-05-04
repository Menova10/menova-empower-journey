
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create a Supabase client with the service role key
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");
    const token = url.searchParams.get("token");

    if (!email || !token) {
      return new Response("Missing email or token", { 
        status: 400, 
        headers: { ...corsHeaders }
      });
    }

    console.log(`Processing approval for email: ${email}`);

    // Validate token (in a real implementation, use a more secure validation)
    // For this example, we'll assume the token is valid

    // Get waitlist entry
    const { data: waitlistEntry, error: fetchError } = await supabase
      .from("waitlist")
      .select("*")
      .eq("email", email)
      .single();

    if (fetchError || !waitlistEntry) {
      console.error("Waitlist entry not found:", fetchError);
      return new Response("Waitlist entry not found", { 
        status: 404, 
        headers: { ...corsHeaders } 
      });
    }

    console.log("Found waitlist entry:", waitlistEntry);

    // Update waitlist status to approved
    const { error: updateError } = await supabase
      .from("waitlist")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("id", waitlistEntry.id);

    if (updateError) {
      console.error("Error updating waitlist status:", updateError);
      throw updateError;
    }

    console.log("Waitlist status updated to approved");

    // Create a user account
    const tempPassword = generateRandomPassword(12);
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: waitlistEntry.full_name
      }
    });

    if (authError) {
      console.error("Error creating user account:", authError);
      throw authError;
    }

    console.log("User account created successfully:", authData);

    // Send approval email to user
    const userSubject = "Your MeNova Access Has Been Approved!";
    const userText = `
      Hello ${waitlistEntry.full_name},
      
      Your MeNova waitlist request has been approved! You can now log in with:
      
      Email: ${email}
      Temporary Password: ${tempPassword}
      
      Please change your password after your first login.
      
      Best regards,
      The MeNova Team
    `;
    
    console.log(`Sending approval email to ${email}`);
    console.log("Email content:", userText);
    
    await sendEmail(email, userSubject, userText);

    return new Response("User approved and account created successfully", { 
      status: 200, 
      headers: { ...corsHeaders }
    });
  } catch (error) {
    console.error("Error approving waitlist entry:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});

// Generate random password
function generateRandomPassword(length: number) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
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
