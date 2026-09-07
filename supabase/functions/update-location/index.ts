
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configure CORS headers for browser access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Get request data
    const { latitude, longitude, addressId } = await req.json();
    
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    // Initialize Supabase client with service role key for admin access
    const adminSupabase = createClient(supabaseUrl, supabaseKey);
    
    // Initialize Supabase client with the user's token
    const userSupabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });
    
    // Get the user ID from the token
    const { data: userData, error: userError } = await userSupabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    const userId = userData.user.id;
    
    if (addressId) {
      // Update existing address with location
      const { error } = await userSupabase
        .from("customer_addresses")
        .update({
          latitude,
          longitude,
          updated_at: new Date().toISOString(),
        })
        .eq("id", addressId)
        .eq("user_id", userId);
        
      if (error) {
        console.error("Error updating location:", error);
        return new Response(
          JSON.stringify({ error: "Failed to update location" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    } else {
      // Check if user has a default address
      const { data: addresses, error: findError } = await userSupabase
        .from("customer_addresses")
        .select("*")
        .eq("user_id", userId)
        .eq("is_default", true)
        .limit(1);
        
      if (findError) {
        console.error("Error finding default address:", findError);
        return new Response(
          JSON.stringify({ error: "Failed to check for existing address" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      if (addresses && addresses.length > 0) {
        // Update default address
        const { error } = await userSupabase
          .from("customer_addresses")
          .update({
            latitude,
            longitude,
            updated_at: new Date().toISOString(),
          })
          .eq("id", addresses[0].id);
          
        if (error) {
          console.error("Error updating default address:", error);
          return new Response(
            JSON.stringify({ error: "Failed to update default address" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
      } else {
        // Create new address entry
        const { error } = await userSupabase
          .from("customer_addresses")
          .insert({
            user_id: userId,
            address: "Auto-detected location",
            latitude,
            longitude,
            is_default: true,
          });
          
        if (error) {
          console.error("Error creating new address:", error);
          return new Response(
            JSON.stringify({ error: "Failed to create new address" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
      }
    }
    
    return new Response(
      JSON.stringify({ success: true, message: "Location updated successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

