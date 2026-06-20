-- supabase/migrations/20260620101000_add_recipe_newsletter_trigger.sql

CREATE TRIGGER on_recipe_published_newsletter
  AFTER UPDATE ON public.recipe
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://njzqcftjzskwcpforwzf.supabase.co/functions/v1/send-creator-newsletter',
    'POST',
    '{"Content-type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qenFjZnRqenNrd2NwZm9yd3pmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ4NDMzNywiZXhwIjoyMDg4MDYwMzM3fQ.zUzuJ9yE0OiICESauNb7p_4nSTGlbFykeROoYpsIdD4"}',
    '{}',
    '5000'
  );
