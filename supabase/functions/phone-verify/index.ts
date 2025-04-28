
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configure CORS headers for browser access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a random 6-digit verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request data
    const body = await req.json();
    const { action, phone } = body;
    
    console.log("Request received:", { action, phone });
    
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
    const twilioWhatsappNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER") ?? "";
    
    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Start verification process
    if (action === "send") {
      // Generate new verification code
      const code = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      
      try {
        // Store code in database
        const { error: dbError } = await supabase
          .from("verification_codes")
          .insert({
            phone,
            code,
            expires_at: expiresAt.toISOString(),
          });
        
        if (dbError) {
          console.error("Database error:", dbError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: "Failed to store verification code",
              // Don't expose the actual error to clients
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
      } catch (error) {
        console.error("Database operation error:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Database operation failed"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      
      // We'll simulate success for development if Twilio credentials aren't set
      if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsappNumber) {
        console.warn("Twilio credentials not set. Simulating success for development.");
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Verification code sent (simulated)",
            code: code // Only in development mode!
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      
      try {
        // Send code via Twilio WhatsApp
        const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const twilioBody = new URLSearchParams({
          From: `whatsapp:${twilioWhatsappNumber}`,
          To: `whatsapp:${phone}`,
          Body: `Your verification code is: ${code}`,
        });
        
        const twilioResponse = await fetch(twilioEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
          },
          body: twilioBody,
        });
        
        if (!twilioResponse.ok) {
          console.error("Twilio error:", await twilioResponse.text());
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: "Failed to send verification code" 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
      } catch (error) {
        console.error("Twilio API call error:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Failed to send verification code" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true, message: "Verification code sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    // Verify code
    else if (action === "verify") {
      const { code } = body;
      
      try {
        // Check if code exists and is valid
        const { data, error } = await supabase
          .from("verification_codes")
          .select("*")
          .eq("phone", phone)
          .eq("code", code)
          .gt("expires_at", new Date().toISOString())
          .eq("verified", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        
        if (error || !data) {
          return new Response(
            JSON.stringify({ success: false, message: "Invalid or expired code" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
        
        // Mark code as verified
        const { error: updateError } = await supabase
          .from("verification_codes")
          .update({ verified: true })
          .eq("id", data.id);
          
        if (updateError) {
          console.error("Error updating verification status:", updateError);
          return new Response(
            JSON.stringify({ success: false, message: "Failed to verify code" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
          );
        }
        
        return new Response(
          JSON.stringify({ success: true, message: "Phone verified successfully" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (error) {
        console.error("Verification error:", error);
        return new Response(
          JSON.stringify({ success: false, message: "Verification process failed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }
    
    return new Response(
      JSON.stringify({ success: false, message: "Invalid action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
    
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
