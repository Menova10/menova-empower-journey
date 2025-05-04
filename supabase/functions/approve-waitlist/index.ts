
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

// Configure CORS headers for the function
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApproveWaitlistRequest {
  email: string;
  directAccess?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the request body
    const requestData: ApproveWaitlistRequest = await req.json();
    const { email, directAccess = false } = requestData;

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Processing waitlist approval for: ${email}`);

    // Get the waitlist entry
    const { data: waitlistUser, error: waitlistError } = await supabase
      .from("waitlist")
      .select("*")
      .eq("email", email)
      .single();

    if (waitlistError) {
      console.error("Error fetching waitlist entry:", waitlistError);
      return new Response(
        JSON.stringify({ error: "Waitlist entry not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update waitlist status to approved
    const { error: updateError } = await supabase
      .from("waitlist")
      .update({ status: "approved" })
      .eq("email", email);

    if (updateError) {
      console.error("Error updating waitlist status:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update waitlist status" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // If directAccess is true, create a user account
    if (directAccess) {
      const password = Math.random().toString(36).slice(-8);
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: waitlistUser.full_name,
        }
      });

      if (userError) {
        console.error("Error creating user:", userError);
        return new Response(
          JSON.stringify({ error: "Failed to create user account" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Update the profile with waitlist data
      if (userData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            menopause_stage: waitlistUser.menopause_stage,
            birth_date: waitlistUser.birth_date,
          })
          .eq("id", userData.user.id);

        if (profileError) {
          console.error("Error updating profile with waitlist data:", profileError);
        }
      }

      // Send email with credentials
      await sendCredentialEmail(email, waitlistUser.full_name, password);
      
      return new Response(
        JSON.stringify({ success: true, message: "User account created and email sent" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else {
      // Send approval email with signup link
      await sendApprovalEmail(email, waitlistUser.full_name);
      
      return new Response(
        JSON.stringify({ success: true, message: "Waitlist approved and email sent" }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
  } catch (error) {
    console.error("Error in approve-waitlist function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// Function to send approval email with signup link
async function sendApprovalEmail(email: string, fullName: string) {
  try {
    const client = new SmtpClient();

    await client.connect({
      hostname: "smtp.gmail.com",
      port: 465,
      username: "menovarocks@gmail.com",
      password: Deno.env.get("SMTP_PASSWORD") || "",
      tls: true,
    });

    // Create the signup URL with email as query parameter
    const signupLink = `https://menova.app/login?email=${encodeURIComponent(email)}`;

    // Prepare the email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px 0;">
          <img src="https://menova.app/logo.png" alt="MeNova Logo" style="max-width: 150px;">
        </div>
        <div style="padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #3a9861; margin-bottom: 20px;">Welcome to MeNova!</h1>
          <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.5;">
            Dear ${fullName || 'Friend'},
          </p>
          <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.5;">
            We're excited to let you know that your application to join MeNova has been approved! 
            You're now invited to create your account and begin your personalized wellness journey.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signupLink}" style="background-color: #3a9861; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Create Your Account
            </a>
          </div>
          <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.5;">
            If the button above doesn't work, you can copy and paste this link into your browser:
            <br>
            <a href="${signupLink}" style="color: #3a9861;">${signupLink}</a>
          </p>
          <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.5;">
            We look forward to supporting you on your wellness journey!
          </p>
          <p style="font-size: 16px; line-height: 1.5;">
            Warmly,<br>
            The MeNova Team
          </p>
        </div>
      </div>
    `;

    await client.send({
      from: "MeNova <menovarocks@gmail.com>",
      to: email,
      subject: "Welcome to MeNova - Your Account is Ready!",
      content: "Please view this email in an HTML-compatible email client.",
      html: htmlContent,
    });

    await client.close();
    console.log(`Approval email sent to ${email}`);
  } catch (error) {
    console.error("SMTP Error:", error);
    throw new Error(`Failed to send approval email: ${error.message}`);
  }
}

// Function to send credentials email for direct access
async function sendCredentialEmail(email: string, fullName: string, password: string) {
  try {
    const client = new SmtpClient();

    await client.connect({
      hostname: "smtp.gmail.com",
      port: 465,
      username: "menovarocks@gmail.com",
      password: Deno.env.get("SMTP_PASSWORD") || "",
      tls: true,
    });

    // Login URL
    const loginUrl = "https://menova.app/login";

    // Prepare the email content
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px 0;">
          <img src="https://menova.app/logo.png" alt="MeNova Logo" style="max-width: 150px;">
        </div>
        <div style="padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #3a9861; margin-bottom: 20px;">Your MeNova Account is Ready!</h1>
          <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.5;">
            Dear ${fullName || 'User'},
          </p>
          <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.5;">
            We've created a default account for you to access MeNova. Below are your credentials:
          </p>
          <div style="background-color: #f7f7f7; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin-bottom: 10px;"><strong>Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.5;">
            Please keep this information secure. We recommend changing your password after your first login.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background-color: #3a9861; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Login to MeNova
            </a>
          </div>
          <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.5;">
            We're excited to have you join MeNova and support you on your wellness journey!
          </p>
          <p style="font-size: 16px; line-height: 1.5;">
            Best regards,<br>
            The MeNova Team
          </p>
        </div>
      </div>
    `;

    await client.send({
      from: "MeNova <menovarocks@gmail.com>",
      to: email,
      subject: "Your MeNova Account Credentials",
      content: "Please view this email in an HTML-compatible email client.",
      html: htmlContent,
    });

    await client.close();
    console.log(`Credentials email sent to ${email}`);
  } catch (error) {
    console.error("SMTP Error:", error);
    throw new Error(`Failed to send credentials email: ${error.message}`);
  }
}
