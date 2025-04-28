
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, phone, code } = await req.json();
    
    console.log("Request received:", { action, phone, code });
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
    const twilioWhatsappNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER") ?? "";
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (action === "send") {
      const verificationCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      
      // Store verification code in database
      const { error: dbError } = await supabase
        .from("verification_codes")
        .insert({
          phone,
          code: verificationCode,
          expires_at: expiresAt.toISOString(),
        });
      
      if (dbError) {
        console.error("Database error:", dbError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Failed to store verification code" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      
      // Development mode - return code if Twilio credentials aren't set
      if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsappNumber) {
        console.warn("Twilio credentials not set. Simulating success for development.");
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Verification code sent (simulated)",
            code: verificationCode // Only in development mode!
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      
      try {
        const twilioEndpoint = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
        const twilioBody = new URLSearchParams({
          From: `whatsapp:${twilioWhatsappNumber}`,
          To: `whatsapp:${phone}`,
          Body: `Your verification code is: ${verificationCode}`,
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
          throw new Error(await twilioResponse.text());
        }
        
        return new Response(
          JSON.stringify({ success: true, message: "Verification code sent" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (error) {
        console.error("Twilio error:", error);
        return new Response(
          JSON.stringify({ success: false, message: "Failed to send verification code" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    } 
    else if (action === "verify") {
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
