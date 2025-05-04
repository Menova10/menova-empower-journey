
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

    // Return HTML response with auto-redirect to login page
    const htmlResponse = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="refresh" content="5;url=${supabaseUrl}/login">
        <title>MeNova - Waitlist Approved</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #f9f5f1;
            color: #333;
          }
          .container {
            max-width: 600px;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            text-align: center;
          }
          h1 {
            color: #5a825a;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background-color: #5a825a;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 4px;
            font-weight: bold;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>MeNova Waitlist Approved!</h1>
          <p>The user account for <strong>${email}</strong> has been created successfully.</p>
          <p>An email has been sent to the user with their temporary login credentials.</p>
          <p>You will be redirected to the login page in 5 seconds...</p>
          <a href="${supabaseUrl}/login" class="button">Go to Login Now</a>
        </div>
      </body>
      </html>
    `;

    return new Response(htmlResponse, { 
      status: 200, 
      headers: { 
        "Content-Type": "text/html",
        ...corsHeaders 
      }
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
