-- Migration: Add show_on_website to recipe table
ALTER TABLE "public"."recipe" ADD COLUMN "show_on_website" boolean DEFAULT false NOT NULL;
