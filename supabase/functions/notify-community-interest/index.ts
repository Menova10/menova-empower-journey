import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.8.0'
import { corsHeaders } from '../_shared/cors.ts'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Parse request body
    const { email, full_name, admin_email, message } = await req.json()
    
    // Validate required fields
    if (!email || !admin_email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }
    
    // Log information
    console.log(`Processing community interest notification for: ${email}`)
    
    // Send notification email using SendGrid (if API key is available)
    if (SENDGRID_API_KEY) {
      const sendGridUrl = 'https://api.sendgrid.com/v3/mail/send'
      
      // Email to user (confirmation)
      const userEmailData = {
        personalizations: [
          {
            to: [{ email }],
            subject: 'Thank you for your interest in MeNova Community',
          },
        ],
        from: { email: admin_email, name: 'MeNova Support' },
        content: [
          {
            type: 'text/plain',
            value: `Hi ${full_name || 'there'},\n\nThank you for expressing interest in joining the MeNova community. We'll notify you as soon as our community is ready for you to join.\n\nStay well,\nThe MeNova Team`,
          },
        ],
      }
      
      // Email to admin (notification)
      const adminEmailData = {
        personalizations: [
          {
            to: [{ email: admin_email }],
            subject: 'New MeNova Community Interest',
          },
        ],
        from: { email: admin_email, name: 'MeNova Notifications' },
        content: [
          {
            type: 'text/plain',
            value: message || `A user has expressed interest in joining the MeNova community.\n\nEmail: ${email}\nName: ${full_name || 'Not provided'}\nDate: ${new Date().toLocaleString()}`,
          },
        ],
      }
      
      try {
        // Send notification to admin
        const adminEmailResponse = await fetch(sendGridUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(adminEmailData),
        })
        
        if (!adminEmailResponse.ok) {
          const errorText = await adminEmailResponse.text()
          console.error('SendGrid admin email error:', errorText)
        } else {
          console.log('Admin notification email sent successfully')
        }
        
        // Send confirmation to user
        const userEmailResponse = await fetch(sendGridUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userEmailData),
        })
        
        if (!userEmailResponse.ok) {
          const errorText = await userEmailResponse.text()
          console.error('SendGrid user email error:', errorText)
        } else {
          console.log('User confirmation email sent successfully')
        }
      } catch (sendGridError) {
        console.error('Error sending emails via SendGrid:', sendGridError)
      }
    } else {
      console.log('SENDGRID_API_KEY not found - skipping email sending')
    }
    
    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Community interest notification processed' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Notify community interest error:', error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}) 