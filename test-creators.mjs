import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://njzqcftjzskwcpforwzf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenFjZnRqenNrd2NwZm9yd3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0ODQzMzcsImV4cCI6MjA4ODA2MDMzN30.hnbx0os7WVRZpDP9_EmxMqFH3cN0aypQg1SvBgWtEmk";
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCreators() {
  const { data: creators, error } = await supabase.from("creator").select("id, username").limit(2);
  
  if (error) {
    console.error("Error fetching creators:", error);
    return;
  }
  
  console.log(`Found ${creators.length} creators:`, creators.map(c => c.username).join(", "));
  
  for (const creator of creators) {
    console.log(`\n--- Testing for creator: ${creator.username} ---`);
    
    // 1. Stats
    const { data: stats } = await supabase
      .from("creator_dashboard_stats")
      .select("*")
      .eq("creator_id", creator.id)
      .single();
    
    console.log("Stats:", stats);
      
    // 2. Top Recipes
    const { data: topRecipes } = await supabase
      .from("recipe_performance_summary")
      .select("recipe_id, title, total_consumptions, total_revenue")
      .eq("creator_id", creator.id)
      .order("total_revenue", { ascending: false })
      .limit(5);
      
    console.log("Top Recipes:", topRecipes);
    
    // 3. Revenue Logs
    const { data: logs } = await supabase
      .from("creator_revenue_log")
      .select("amount, revenue_type, logged_at")
      .eq("creator_id", creator.id)
      .order("logged_at", { ascending: false })
      .limit(5);
      
    console.log("Recent Revenue Logs (max 5):", logs);
  }
}

testCreators();
