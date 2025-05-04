
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create a Supabase client with the service role key
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Email configuration
const smtpConfig = {
  hostname: "smtp.gmail.com", // Replace with your SMTP server
  port: 465,
  username: "menovarocks@gmail.com", // Replace with your email
  password: Deno.env.get("EMAIL_PASSWORD") || "", // Get password from environment variable
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body for invoke method
    const requestData = await req.json().catch(() => null);
    
    // Handle both URL parameters and JSON body
    const url = new URL(req.url);
    const email = requestData?.email || url.searchParams.get("email");
    const token = requestData?.token || url.searchParams.get("token");
    const directAccess = requestData?.directAccess || url.searchParams.get("directAccess") === "true";
    
    // Special case for the specific email
    if (directAccess && email === "Shettysandhya1985@gmail.com") {
      return await handleDirectAccess(email);
    }

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
        full_name: waitlistEntry.full_name,
        menopause_stage: waitlistEntry.menopause_stage,
        birth_date: waitlistEntry.birth_date
      }
    });

    if (authError) {
      console.error("Error creating user account:", authError);
      throw authError;
    }

    console.log("User account created successfully:", authData);
    
    // Ensure user's profile has the waitlist data
    if (authData?.user?.id) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: authData.user.id,
          full_name: waitlistEntry.full_name,
          menopause_stage: waitlistEntry.menopause_stage,
          birth_date: waitlistEntry.birth_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
      if (profileError) {
        console.error("Error updating profile:", profileError);
      } else {
        console.log("Profile data synced from waitlist");
      }
    }

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
    
    // Create SMTP client and send email
    try {
      const client = new SmtpClient();
      await client.connectTLS(smtpConfig);
      
      await client.send({
        from: "menovarocks@gmail.com",
        to: email,
        subject: userSubject,
        content: userText,
      });
      
      await client.close();
    } catch (smtpError) {
      console.error("SMTP Error:", smtpError);
      // Continue with the response even if email fails
    }

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

// Handle direct access for specific email
async function handleDirectAccess(email: string) {
  try {
    console.log(`Creating direct access account for: ${email}`);
    
    // Create a user account with a fixed password
    const tempPassword = "MeNova2025!";
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: "Sandhya Shetty"
      }
    });

    if (authError) {
      // If the user already exists, we'll just continue
      if (authError.message.includes("User already registered")) {
        console.log("User already exists, proceeding");
      } else {
        console.error("Error creating default user account:", authError);
        throw authError;
      }
    } else {
      console.log("Default user account created successfully:", authData);
      
      // Ensure profile exists
      if (authData?.user?.id) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: authData.user.id,
            full_name: "Sandhya Shetty",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (profileError) {
          console.error("Error creating profile:", profileError);
        } else {
          console.log("Profile created successfully");
        }
      }
    }

    // Send login email to user
    const userSubject = "Your MeNova Account Login Information";
    const userText = `
      Hello Sandhya Shetty,
      
      Your MeNova account has been created! You can now log in with:
      
      Email: ${email}
      Password: ${tempPassword}
      
      Please change your password after your first login.
      
      Best regards,
      The MeNova Team
    `;
    
    console.log(`Sending login email to ${email}`);
    
    // Create SMTP client and send email
    try {
      const client = new SmtpClient();
      await client.connectTLS(smtpConfig);
      
      await client.send({
        from: "menovarocks@gmail.com",
        to: email,
        subject: userSubject,
        content: userText,
      });
      
      await client.close();
    } catch (smtpError) {
      console.error("SMTP Error:", smtpError);
      // Continue with the response even if email fails
    }

    // Return HTML response with auto-redirect to login page
    const htmlResponse = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="refresh" content="5;url=${supabaseUrl}/login">
        <title>MeNova - Account Created</title>
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
          <h1>MeNova Account Ready!</h1>
          <p>Your account for <strong>${email}</strong> is ready to use.</p>
          <p>An email has been sent with your login credentials.</p>
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
    console.error("Error creating direct access account:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}

// Generate random password
function generateRandomPassword(length: number) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}
