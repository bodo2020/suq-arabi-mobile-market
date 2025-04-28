
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatPhoneNumber(phone: string) {
  // Strip ALL non-digit characters completely
  // Just return the cleaned digits without adding any prefix
  return phone.replace(/\D/g, '');
}

function isValidPhoneNumber(phone: string) {
  // Since we're supporting international numbers, just validate there are digits
  const digits = phone.replace(/\D/g, '');
  
  // Basic validation - should have at least 8 digits
  return digits.length >= 8;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, phone, code } = await req.json();
    
    console.log("Request received:", { action, phone, code });
    
    // Format the phone number to ensure consistency
    const formattedPhone = formatPhoneNumber(phone);
    
    // Validate phone format
    if (!isValidPhoneNumber(formattedPhone) && !isValidPhoneNumber(phone)) {
      console.error("Invalid phone number format:", phone);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Invalid phone number format. Phone number must have at least 8 digits." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER") ?? "";
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (action === "send") {
      const verificationCode = generateVerificationCode();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      
      try {
        // First check if verification_codes table exists
        const { error: checkError } = await supabase
          .from("verification_codes")
          .select("id")
          .limit(1);
        
        if (checkError && checkError.message.includes("does not exist")) {
          // Create the verification_codes table if it doesn't exist
          await supabase.rpc("create_verification_codes_table");
          console.log("Created verification_codes table");
        }
        
        // Store verification code in database with the formatted phone number
        const { error: dbError } = await supabase
          .from("verification_codes")
          .insert({
            phone: formattedPhone,
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
      } catch (err) {
        console.error("Error checking or creating verification_codes table:", err);
      }
      
      // Always return the code in development mode
      const isDevelopment = !twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber;
      
      // Display verification code directly in the app
      const responseObject: any = { 
        success: true,
        message: "رمز التحقق للتطوير",
        code: verificationCode // Provide code directly for display in the app
      };
      
      console.log("Development mode: Returning verification code", verificationCode);
      return new Response(
        JSON.stringify(responseObject),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
      
      // Remove the Twilio SMS sending code since we're not using it anymore
      // We're now showing the verification code directly in the app
    } 
    else if (action === "verify") {
      try {
        // Check if code exists and is valid using the formatted phone number
        const { data, error } = await supabase
          .from("verification_codes")
          .select("*")
          .eq("phone", formattedPhone)
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
        console.error("Error verifying code:", error);
        return new Response(
          JSON.stringify({ success: false, message: "Failed to verify code" }),
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
