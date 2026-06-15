-- 1. Add RLS policy on meal_consumption allowing creators to view consumptions of their own recipes
CREATE POLICY "creators can view consumptions for their recipes" 
ON "public"."meal_consumption" FOR SELECT USING (
  recipe_id IN (
    SELECT id FROM recipe WHERE creator_id IN (
      SELECT id FROM creator WHERE user_id = auth.uid()
    )
  )
);

-- 2. Update creator_dashboard_stats view to pull consumptions_current_month from meal_consumption table
CREATE OR REPLACE VIEW "public"."creator_dashboard_stats" WITH ("security_invoker"='on') AS
 SELECT "c"."id" AS "creator_id",
    "c"."display_name",
    "c"."username",
    "c"."recipe_count",
    "c"."fan_count",
    "c"."total_revenue",
    ("c"."recipe_count" >= 30) AS "is_fan_eligible",
    COALESCE(( SELECT "sum"("creator_revenue_log"."amount") AS "sum"
           FROM "public"."creator_revenue_log"
          WHERE (("creator_revenue_log"."creator_id" = "c"."id") AND ("date_trunc"('month'::"text", ("creator_revenue_log"."logged_at")::timestamp with time zone) = "date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone)))), (0)::numeric) AS "revenue_current_month",
    COALESCE(( SELECT "sum"("creator_revenue_log"."amount") AS "sum"
           FROM "public"."creator_revenue_log"
          WHERE (("creator_revenue_log"."creator_id" = "c"."id") AND ("date_trunc"('month'::"text", ("creator_revenue_log"."logged_at")::timestamp with time zone) = "date_trunc"('month'::"text", (CURRENT_DATE - '1 mon'::interval))))), (0)::numeric) AS "revenue_last_month",
    COALESCE(( SELECT "count"("mc"."id") AS "count"
           FROM "public"."meal_consumption" "mc"
           JOIN "public"."recipe" "r" ON "mc"."recipe_id" = "r"."id"
          WHERE (("r"."creator_id" = "c"."id") AND ("date_trunc"('month'::"text", ("mc"."consumed_at")::timestamp with time zone) = "date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone)))), (0)::bigint) AS "consumptions_current_month",
    (30 - (COALESCE(( SELECT "count"("mc"."id") AS "count"
           FROM "public"."meal_consumption" "mc"
           JOIN "public"."recipe" "r" ON "mc"."recipe_id" = "r"."id"
          WHERE (("r"."creator_id" = "c"."id") AND ("date_trunc"('month'::"text", ("mc"."consumed_at")::timestamp with time zone) = "date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone)))), (0)::bigint) % (30)::bigint)) AS "consumptions_to_next_euro"
   FROM "public"."creator" "c";
