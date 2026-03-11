export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_conversation: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversation_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_message: {
        Row: {
          content: string
          conversation_id: string | null
          id: string
          role: string
          sent_at: string | null
          tokens_used: number | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          id?: string
          role: string
          sent_at?: string | null
          tokens_used?: number | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          id?: string
          role?: string
          sent_at?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_message_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversation"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message: {
        Row: {
          content: string
          conversation_id: string | null
          group_id: string | null
          id: string
          message_type: string | null
          recipe_id: string | null
          sender_id: string | null
          sent_at: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          group_id?: string | null
          id?: string
          message_type?: string | null
          recipe_id?: string | null
          sender_id?: string | null
          sent_at?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          group_id?: string | null
          id?: string
          message_type?: string | null
          recipe_id?: string | null
          sender_id?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_message_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      community_group: {
        Row: {
          cover_url: string | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          id: string
          is_public: boolean | null
          member_count: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          member_count?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          member_count?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_group_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_support_open: boolean | null
          name: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_support_open?: boolean | null
          name?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_support_open?: boolean | null
          name?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participant: {
        Row: {
          conversation_id: string
          joined_at: string | null
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participant_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participant_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_request: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          recipient_id: string | null
          requester_id: string | null
          responded_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          recipient_id?: string | null
          requester_id?: string | null
          responded_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          recipient_id?: string | null
          requester_id?: string | null
          responded_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_request_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_request_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      creator: {
        Row: {
          bio: string | null
          created_at: string | null
          display_name: string
          fan_count: number | null
          heritage_region: string | null
          id: string
          instagram_handle: string | null
          language_codes: string[] | null
          profile_image_url: string | null
          recipe_count: number | null
          specialties: string[] | null
          specialty_codes: string[] | null
          tiktok_handle: string | null
          total_revenue: number | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          website_url: string | null
          youtube_handle: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          display_name: string
          fan_count?: number | null
          heritage_region?: string | null
          id?: string
          instagram_handle?: string | null
          language_codes?: string[] | null
          profile_image_url?: string | null
          recipe_count?: number | null
          specialties?: string[] | null
          specialty_codes?: string[] | null
          tiktok_handle?: string | null
          total_revenue?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          website_url?: string | null
          youtube_handle?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          display_name?: string
          fan_count?: number | null
          heritage_region?: string | null
          id?: string
          instagram_handle?: string | null
          language_codes?: string[] | null
          profile_image_url?: string | null
          recipe_count?: number | null
          specialties?: string[] | null
          specialty_codes?: string[] | null
          tiktok_handle?: string | null
          total_revenue?: number | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          website_url?: string | null
          youtube_handle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_balance: {
        Row: {
          available_balance: number | null
          creator_id: string
          last_payout_at: string | null
          lifetime_earnings: number | null
          pending_balance: number | null
          updated_at: string | null
        }
        Insert: {
          available_balance?: number | null
          creator_id: string
          last_payout_at?: string | null
          lifetime_earnings?: number | null
          pending_balance?: number | null
          updated_at?: string | null
        }
        Update: {
          available_balance?: number | null
          creator_id?: string
          last_payout_at?: string | null
          lifetime_earnings?: number | null
          pending_balance?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_balance_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creator"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_balance_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creator_dashboard_stats"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "creator_balance_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creator_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_revenue_log: {
        Row: {
          amount: number
          created_at: string | null
          creator_id: string | null
          id: string
          logged_at: string | null
          recipe_id: string | null
          revenue_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          creator_id?: string | null
          id?: string
          logged_at?: string | null
          recipe_id?: string | null
          revenue_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          creator_id?: string | null
          id?: string
          logged_at?: string | null
          recipe_id?: string | null
          revenue_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_revenue_log_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_revenue_log_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_dashboard_stats"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "creator_revenue_log_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_revenue_log_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_nutrition_log: {
        Row: {
          created_at: string | null
          date: string
          id: string
          total_calories: number | null
          total_carbs_g: number | null
          total_fat_g: number | null
          total_protein_g: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          total_calories?: number | null
          total_carbs_g?: number | null
          total_fat_g?: number | null
          total_protein_g?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          total_calories?: number | null
          total_carbs_g?: number | null
          total_fat_g?: number | null
          total_protein_g?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_nutrition_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_external_recipe_counter: {
        Row: {
          consumption_count: number | null
          created_at: string | null
          external_recipe_url: string
          id: string
          last_consumed_at: string | null
          subscription_id: string | null
        }
        Insert: {
          consumption_count?: number | null
          created_at?: string | null
          external_recipe_url: string
          id?: string
          last_consumed_at?: string | null
          subscription_id?: string | null
        }
        Update: {
          consumption_count?: number | null
          created_at?: string | null
          external_recipe_url?: string
          id?: string
          last_consumed_at?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fan_external_recipe_counter_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "fan_subscription"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_subscription: {
        Row: {
          cancelled_at: string | null
          created_at: string | null
          creator_id: string | null
          id: string
          status: string | null
          subscribed_at: string | null
          user_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string | null
          creator_id?: string | null
          id?: string
          status?: string | null
          subscribed_at?: string | null
          user_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string | null
          creator_id?: string | null
          id?: string
          status?: string | null
          subscribed_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fan_subscription_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fan_subscription_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_dashboard_stats"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "fan_subscription_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fan_subscription_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      fan_subscription_history: {
        Row: {
          changed_at: string | null
          id: string
          status: string
          subscription_id: string | null
        }
        Insert: {
          changed_at?: string | null
          id?: string
          status: string
          subscription_id?: string | null
        }
        Update: {
          changed_at?: string | null
          id?: string
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fan_subscription_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "fan_subscription"
            referencedColumns: ["id"]
          },
        ]
      }
      food_region: {
        Row: {
          code: string
          created_at: string | null
          name_en: string
          name_es: string | null
          name_fr: string
          name_pt: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          name_en: string
          name_es?: string | null
          name_fr: string
          name_pt?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          name_en?: string
          name_es?: string | null
          name_fr?: string
          name_pt?: string | null
        }
        Relationships: []
      }
      group_member: {
        Row: {
          group_id: string
          joined_at: string | null
          last_read_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string | null
          last_read_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_member_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_group"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_member_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      ingredient: {
        Row: {
          calories_per_100g: number | null
          carbs_per_100g: number | null
          category: string | null
          created_at: string | null
          fat_per_100g: number | null
          id: string
          name: string
          name_en: string | null
          name_es: string | null
          name_fr: string | null
          name_pt: string | null
          protein_per_100g: number | null
          status: string | null
        }
        Insert: {
          calories_per_100g?: number | null
          carbs_per_100g?: number | null
          category?: string | null
          created_at?: string | null
          fat_per_100g?: number | null
          id?: string
          name: string
          name_en?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_pt?: string | null
          protein_per_100g?: number | null
          status?: string | null
        }
        Update: {
          calories_per_100g?: number | null
          carbs_per_100g?: number | null
          category?: string | null
          created_at?: string | null
          fat_per_100g?: number | null
          id?: string
          name?: string
          name_en?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_pt?: string | null
          protein_per_100g?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "ingredient_category"
            referencedColumns: ["code"]
          },
        ]
      }
      ingredient_category: {
        Row: {
          code: string
          created_at: string | null
          name_en: string
          name_fr: string
        }
        Insert: {
          code: string
          created_at?: string | null
          name_en: string
          name_fr: string
        }
        Update: {
          code?: string
          created_at?: string | null
          name_en?: string
          name_fr?: string
        }
        Relationships: []
      }
      ingredient_submission: {
        Row: {
          category_hint: string | null
          created_at: string | null
          id: string
          ingredient_id: string | null
          name: string
          name_en: string | null
          name_fr: string | null
          notes: string | null
          reviewed_at: string | null
          status: string | null
          submitted_by: string | null
        }
        Insert: {
          category_hint?: string | null
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          name: string
          name_en?: string | null
          name_fr?: string | null
          notes?: string | null
          reviewed_at?: string | null
          status?: string | null
          submitted_by?: string | null
        }
        Update: {
          category_hint?: string | null
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          name?: string
          name_en?: string | null
          name_fr?: string | null
          notes?: string | null
          reviewed_at?: string | null
          status?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_submission_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredient_submission_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_consumption: {
        Row: {
          consumed_at: string | null
          created_at: string | null
          id: string
          meal_plan_entry_id: string | null
          rating: number | null
          recipe_id: string | null
          servings: number | null
          user_id: string | null
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string | null
          id?: string
          meal_plan_entry_id?: string | null
          rating?: number | null
          recipe_id?: string | null
          servings?: number | null
          user_id?: string | null
        }
        Update: {
          consumed_at?: string | null
          created_at?: string | null
          id?: string
          meal_plan_entry_id?: string | null
          rating?: number | null
          recipe_id?: string | null
          servings?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_consumption_meal_plan_entry_id_fkey"
            columns: ["meal_plan_entry_id"]
            isOneToOne: false
            referencedRelation: "meal_plan_entry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_consumption_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_consumption_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          name: string | null
          start_date: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          start_date: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          start_date?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_entry: {
        Row: {
          created_at: string | null
          date: string
          id: string
          meal_plan_id: string | null
          meal_type: string | null
          recipe_id: string | null
          servings: number | null
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          meal_plan_id?: string | null
          meal_type?: string | null
          recipe_id?: string | null
          servings?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          meal_plan_id?: string | null
          meal_type?: string | null
          recipe_id?: string | null
          servings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_entry_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_plan_entry_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_reminder: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          meal_type: string | null
          reminder_time: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          meal_type?: string | null
          reminder_time: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          meal_type?: string | null
          reminder_time?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meal_reminder_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_unit: {
        Row: {
          code: string
          created_at: string | null
          name_en: string
          name_es: string | null
          name_fr: string
          name_pt: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          name_en: string
          name_es?: string | null
          name_fr: string
          name_pt?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          name_en?: string
          name_es?: string | null
          name_fr?: string
          name_pt?: string | null
        }
        Relationships: []
      }
      notification: {
        Row: {
          body: string
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      payout: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          creator_id: string | null
          id: string
          requested_at: string | null
          status: string | null
          stripe_payout_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string | null
          creator_id?: string | null
          id?: string
          requested_at?: string | null
          status?: string | null
          stripe_payout_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          creator_id?: string | null
          id?: string
          requested_at?: string | null
          status?: string | null
          stripe_payout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payout_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_dashboard_stats"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "payout_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_public_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      push_token: {
        Row: {
          created_at: string | null
          id: string
          platform: string | null
          token: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform?: string | null
          token: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string | null
          token?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_token_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe: {
        Row: {
          cook_time_min: number | null
          cover_image_url: string | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          difficulty: string | null
          draft_data: Json | null
          id: string
          instructions: string
          is_pork_free: boolean | null
          is_published: boolean | null
          language: string | null
          prep_time_min: number | null
          region: string | null
          servings: number | null
          slug: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          cook_time_min?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          difficulty?: string | null
          draft_data?: Json | null
          id?: string
          instructions: string
          is_pork_free?: boolean | null
          is_published?: boolean | null
          language?: string | null
          prep_time_min?: number | null
          region?: string | null
          servings?: number | null
          slug?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          cook_time_min?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          difficulty?: string | null
          draft_data?: Json | null
          id?: string
          instructions?: string
          is_pork_free?: boolean | null
          is_published?: boolean | null
          language?: string | null
          prep_time_min?: number | null
          region?: string | null
          servings?: number | null
          slug?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_dashboard_stats"
            referencedColumns: ["creator_id"]
          },
          {
            foreignKeyName: "recipe_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_public_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_region_fkey"
            columns: ["region"]
            isOneToOne: false
            referencedRelation: "food_region"
            referencedColumns: ["code"]
          },
        ]
      }
      recipe_comment: {
        Row: {
          content: string
          created_at: string | null
          id: string
          recipe_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          recipe_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          recipe_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_comment_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_comment_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_image: {
        Row: {
          created_at: string | null
          id: string
          recipe_id: string | null
          sort_order: number | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          recipe_id?: string | null
          sort_order?: number | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          recipe_id?: string | null
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_image_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredient: {
        Row: {
          created_at: string | null
          id: string
          ingredient_id: string | null
          is_optional: boolean | null
          quantity: number
          recipe_id: string | null
          sort_order: number | null
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          is_optional?: boolean | null
          quantity: number
          recipe_id?: string | null
          sort_order?: number | null
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ingredient_id?: string | null
          is_optional?: boolean | null
          quantity?: number
          recipe_id?: string | null
          sort_order?: number | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredient_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredient_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredient_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "measurement_unit"
            referencedColumns: ["code"]
          },
        ]
      }
      recipe_like: {
        Row: {
          created_at: string | null
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_like_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_like_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_macro: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string | null
          fat_g: number | null
          fiber_g: number | null
          id: string
          protein_g: number | null
          recipe_id: string | null
          sodium_mg: number | null
          updated_at: string | null
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          protein_g?: number | null
          recipe_id?: string | null
          sodium_mg?: number | null
          updated_at?: string | null
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          fat_g?: number | null
          fiber_g?: number | null
          id?: string
          protein_g?: number | null
          recipe_id?: string | null
          sodium_mg?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_macro_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: true
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_tag: {
        Row: {
          recipe_id: string
          tag_id: string
        }
        Insert: {
          recipe_id: string
          tag_id: string
        }
        Update: {
          recipe_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_tag_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_tag_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tag"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_translation: {
        Row: {
          description: string | null
          generated_at: string | null
          id: string
          instructions: string
          is_auto: boolean | null
          locale: string
          recipe_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          description?: string | null
          generated_at?: string | null
          id?: string
          instructions: string
          is_auto?: boolean | null
          locale: string
          recipe_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          description?: string | null
          generated_at?: string | null
          id?: string
          instructions?: string
          is_auto?: boolean | null
          locale?: string
          recipe_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recipe_translation_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_vector: {
        Row: {
          last_computed: string | null
          recipe_id: string
          updated_at: string | null
          vector: string
        }
        Insert: {
          last_computed?: string | null
          recipe_id: string
          updated_at?: string | null
          vector: string
        }
        Update: {
          last_computed?: string | null
          recipe_id?: string
          updated_at?: string | null
          vector?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_vector_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: true
            referencedRelation: "recipe"
            referencedColumns: ["id"]
          },
        ]
      }
      referral: {
        Row: {
          converted_at: string | null
          created_at: string | null
          id: string
          referral_code: string
          referred_id: string | null
          referrer_id: string | null
          status: string | null
        }
        Insert: {
          converted_at?: string | null
          created_at?: string | null
          id?: string
          referral_code: string
          referred_id?: string | null
          referrer_id?: string | null
          status?: string | null
        }
        Update: {
          converted_at?: string | null
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_id?: string | null
          referrer_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list: {
        Row: {
          created_at: string | null
          id: string
          is_completed: boolean | null
          meal_plan_id: string | null
          name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          meal_plan_id?: string | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          meal_plan_id?: string | null
          name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_list_item: {
        Row: {
          created_at: string | null
          custom_name: string | null
          id: string
          ingredient_id: string | null
          is_checked: boolean | null
          quantity: number
          shopping_list_id: string | null
          unit: string | null
        }
        Insert: {
          created_at?: string | null
          custom_name?: string | null
          id?: string
          ingredient_id?: string | null
          is_checked?: boolean | null
          quantity: number
          shopping_list_id?: string | null
          unit?: string | null
        }
        Update: {
          created_at?: string | null
          custom_name?: string | null
          id?: string
          ingredient_id?: string | null
          is_checked?: boolean | null
          quantity?: number
          shopping_list_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_item_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredient"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_item_shopping_list_id_fkey"
            columns: ["shopping_list_id"]
            isOneToOne: false
            referencedRelation: "shopping_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopping_list_item_unit_fkey"
            columns: ["unit"]
            isOneToOne: false
            referencedRelation: "measurement_unit"
            referencedColumns: ["code"]
          },
        ]
      }
      specialty: {
        Row: {
          code: string
          created_at: string | null
          id: string
          name_en: string
          name_es: string | null
          name_fr: string
          name_pt: string | null
          region: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          name_en: string
          name_es?: string | null
          name_fr: string
          name_pt?: string | null
          region?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          name_en?: string
          name_es?: string | null
          name_fr?: string
          name_pt?: string | null
          region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "specialty_region_fkey"
            columns: ["region"]
            isOneToOne: false
            referencedRelation: "food_region"
            referencedColumns: ["code"]
          },
        ]
      }
      subscription: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      support_message: {
        Row: {
          content: string
          created_at: string | null
          email: string
          id: string
          status: string | null
          subject: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          email: string
          id?: string
          status?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          email?: string
          id?: string
          status?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_message_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      tag: {
        Row: {
          created_at: string | null
          id: string
          name: string
          name_en: string | null
          name_es: string | null
          name_fr: string | null
          name_pt: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          name_en?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_pt?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          name_en?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_pt?: string | null
        }
        Relationships: []
      }
      user_cuisine_preference: {
        Row: {
          created_at: string | null
          id: string
          preference_score: number | null
          region: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          preference_score?: number | null
          region?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          preference_score?: number | null
          region?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_cuisine_preference_region_fkey"
            columns: ["region"]
            isOneToOne: false
            referencedRelation: "food_region"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_cuisine_preference_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      user_dietary_restriction: {
        Row: {
          created_at: string | null
          id: string
          restriction: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          restriction?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          restriction?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_dietary_restriction_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      user_goal: {
        Row: {
          created_at: string | null
          goal_type: string | null
          id: string
          is_active: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          goal_type?: string | null
          id?: string
          is_active?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          goal_type?: string | null
          id?: string
          is_active?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_goal_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      user_health_profile: {
        Row: {
          activity_level: string | null
          birth_date: string | null
          created_at: string | null
          height_cm: number | null
          id: string
          sex: string | null
          target_weight_kg: number | null
          updated_at: string | null
          user_id: string | null
          weight_kg: number | null
        }
        Insert: {
          activity_level?: string | null
          birth_date?: string | null
          created_at?: string | null
          height_cm?: number | null
          id?: string
          sex?: string | null
          target_weight_kg?: number | null
          updated_at?: string | null
          user_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          activity_level?: string | null
          birth_date?: string | null
          created_at?: string | null
          height_cm?: number | null
          id?: string
          sex?: string | null
          target_weight_kg?: number | null
          updated_at?: string | null
          user_id?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_health_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          first_name: string | null
          id: string
          is_creator: boolean | null
          last_name: string | null
          locale: string | null
          onboarding_done: boolean | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id: string
          is_creator?: boolean | null
          last_name?: string | null
          locale?: string | null
          onboarding_done?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          is_creator?: boolean | null
          last_name?: string | null
          locale?: string | null
          onboarding_done?: boolean | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      user_vector: {
        Row: {
          last_computed: string | null
          updated_at: string | null
          user_id: string
          vector: string
        }
        Insert: {
          last_computed?: string | null
          updated_at?: string | null
          user_id: string
          vector: string
        }
        Update: {
          last_computed?: string | null
          updated_at?: string | null
          user_id?: string
          vector?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_vector_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_log: {
        Row: {
          created_at: string | null
          id: string
          logged_at: string | null
          note: string | null
          user_id: string | null
          weight_kg: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          logged_at?: string | null
          note?: string | null
          user_id?: string | null
          weight_kg: number
        }
        Update: {
          created_at?: string | null
          id?: string
          logged_at?: string | null
          note?: string | null
          user_id?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "weight_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      creator_dashboard_stats: {
        Row: {
          consumptions_current_month: number | null
          consumptions_to_next_euro: number | null
          creator_id: string | null
          display_name: string | null
          fan_count: number | null
          is_fan_eligible: boolean | null
          recipe_count: number | null
          revenue_current_month: number | null
          revenue_last_month: number | null
          total_revenue: number | null
          username: string | null
        }
        Insert: {
          consumptions_current_month?: never
          consumptions_to_next_euro?: never
          creator_id?: string | null
          display_name?: string | null
          fan_count?: number | null
          is_fan_eligible?: never
          recipe_count?: number | null
          revenue_current_month?: never
          revenue_last_month?: never
          total_revenue?: number | null
          username?: string | null
        }
        Update: {
          consumptions_current_month?: never
          consumptions_to_next_euro?: never
          creator_id?: string | null
          display_name?: string | null
          fan_count?: number | null
          is_fan_eligible?: never
          recipe_count?: number | null
          revenue_current_month?: never
          revenue_last_month?: never
          total_revenue?: number | null
          username?: string | null
        }
        Relationships: []
      }
      creator_public_profile: {
        Row: {
          bio: string | null
          created_at: string | null
          display_name: string | null
          fan_count: number | null
          id: string | null
          instagram_handle: string | null
          is_fan_eligible: boolean | null
          language_codes: string[] | null
          profile_image_url: string | null
          recipe_count: number | null
          specialty_codes: string[] | null
          tiktok_handle: string | null
          total_revenue: number | null
          username: string | null
          website_url: string | null
          youtube_handle: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          fan_count?: number | null
          id?: string | null
          instagram_handle?: string | null
          is_fan_eligible?: never
          language_codes?: string[] | null
          profile_image_url?: string | null
          recipe_count?: number | null
          specialty_codes?: string[] | null
          tiktok_handle?: string | null
          total_revenue?: number | null
          username?: string | null
          website_url?: string | null
          youtube_handle?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          fan_count?: number | null
          id?: string | null
          instagram_handle?: string | null
          is_fan_eligible?: never
          language_codes?: string[] | null
          profile_image_url?: string | null
          recipe_count?: number | null
          specialty_codes?: string[] | null
          tiktok_handle?: string | null
          total_revenue?: number | null
          username?: string | null
          website_url?: string | null
          youtube_handle?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_recipe_macros: { Args: { p_recipe_id: string }; Returns: Json }
      get_creator_by_username: { Args: { p_username: string }; Returns: Json }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
