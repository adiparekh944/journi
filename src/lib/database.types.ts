export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      badges: {
        Row: {
          description: string
          icon: string
          key: string
          name: string
          tier: string
        }
        Insert: {
          description: string
          icon: string
          key: string
          name: string
          tier: string
        }
        Update: {
          description?: string
          icon?: string
          key?: string
          name?: string
          tier?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
          status: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
          status?: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_responses: {
        Row: {
          completed_at: string | null
          completed_steps: number[]
          likert: Json
          seed_taps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: number[]
          likert?: Json
          seed_taps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_steps?: number[]
          likert?: Json
          seed_taps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          address: string | null
          best_time: string | null
          borough: string
          category: string
          created_at: string
          crowd_level: number
          geog: unknown
          hero_image_url: string
          id: string
          indoor_outdoor: string
          is_free: boolean | null
          lat: number
          lng: number
          name: string
          neighborhood: string
          popularity_seed: number
          price_tier: number
          short_description: string
          slug: string
          taste_vector: number[]
          typical_duration_minutes: number | null
          typical_price_usd: number | null
        }
        Insert: {
          address?: string | null
          best_time?: string | null
          borough: string
          category: string
          created_at?: string
          crowd_level: number
          geog?: unknown
          hero_image_url: string
          id?: string
          indoor_outdoor: string
          is_free?: boolean | null
          lat: number
          lng: number
          name: string
          neighborhood: string
          popularity_seed?: number
          price_tier: number
          short_description: string
          slug: string
          taste_vector: number[]
          typical_duration_minutes?: number | null
          typical_price_usd?: number | null
        }
        Update: {
          address?: string | null
          best_time?: string | null
          borough?: string
          category?: string
          created_at?: string
          crowd_level?: number
          geog?: unknown
          hero_image_url?: string
          id?: string
          indoor_outdoor?: string
          is_free?: boolean | null
          lat?: number
          lng?: number
          name?: string
          neighborhood?: string
          popularity_seed?: number
          price_tier?: number
          short_description?: string
          slug?: string
          taste_vector?: number[]
          typical_duration_minutes?: number | null
          typical_price_usd?: number | null
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          badge_key: string | null
          comment_count: number
          created_at: string
          id: string
          kind: string
          like_count: number
          place_id: string | null
          user_id: string
          visit_id: string | null
        }
        Insert: {
          badge_key?: string | null
          comment_count?: number
          created_at?: string
          id?: string
          kind?: string
          like_count?: number
          place_id?: string | null
          user_id: string
          visit_id?: string | null
        }
        Update: {
          badge_key?: string | null
          comment_count?: number
          created_at?: string
          id?: string
          kind?: string
          like_count?: number
          place_id?: string | null
          user_id?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_badge_key_fk"
            columns: ["badge_key"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "posts_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: true
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          countries_visited_count: number
          created_at: string
          crowd_tolerance: number
          display_name: string
          home_city: string | null
          id: string
          is_private: boolean
          onboarding_complete: boolean
          price_sensitivity: number
          taste_vector: number[]
          theme: string
          travel_frequency: string | null
          typical_companion: string | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          countries_visited_count?: number
          created_at?: string
          crowd_tolerance?: number
          display_name: string
          home_city?: string | null
          id: string
          is_private?: boolean
          onboarding_complete?: boolean
          price_sensitivity?: number
          taste_vector?: number[]
          theme?: string
          travel_frequency?: string | null
          typical_companion?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          countries_visited_count?: number
          created_at?: string
          crowd_tolerance?: number
          display_name?: string
          home_city?: string | null
          id?: string
          is_private?: boolean
          onboarding_complete?: boolean
          price_sensitivity?: number
          taste_vector?: number[]
          theme?: string
          travel_frequency?: string | null
          typical_companion?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          dismissed: boolean
          dismissed_at: string | null
          generated_at: string
          id: string
          place_id: string
          rank: number
          reason: string
          score: number
          user_id: string
        }
        Insert: {
          dismissed?: boolean
          dismissed_at?: string | null
          generated_at?: string
          id?: string
          place_id: string
          rank: number
          reason: string
          score: number
          user_id: string
        }
        Update: {
          dismissed?: boolean
          dismissed_at?: string | null
          generated_at?: string
          id?: string
          place_id?: string
          rank?: number
          reason?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_key: string
          earned_at: string
          seen: boolean
          user_id: string
        }
        Insert: {
          badge_key: string
          earned_at?: string
          seen?: boolean
          user_id: string
        }
        Update: {
          badge_key?: string
          earned_at?: string
          seen?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_key_fkey"
            columns: ["badge_key"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_photos: {
        Row: {
          created_at: string
          height: number
          id: string
          place_id: string
          sort_order: number
          storage_path: string
          user_id: string
          visit_id: string
          width: number
        }
        Insert: {
          created_at?: string
          height: number
          id?: string
          place_id: string
          sort_order?: number
          storage_path: string
          user_id: string
          visit_id: string
          width: number
        }
        Update: {
          created_at?: string
          height?: number
          id?: string
          place_id?: string
          sort_order?: number
          storage_path?: string
          user_id?: string
          visit_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "visit_photos_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_photos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_photos_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          amount_paid_usd: number | null
          bucket: string
          companion: string | null
          created_at: string
          crowd_experienced: number | null
          id: string
          note: string | null
          place_id: string
          rank_position: number
          score: number
          time_spent_minutes: number | null
          updated_at: string
          user_id: string
          value_rating: number | null
          visited_on: string
          was_paid: boolean
          would_return: boolean | null
        }
        Insert: {
          amount_paid_usd?: number | null
          bucket: string
          companion?: string | null
          created_at?: string
          crowd_experienced?: number | null
          id?: string
          note?: string | null
          place_id: string
          rank_position: number
          score: number
          time_spent_minutes?: number | null
          updated_at?: string
          user_id: string
          value_rating?: number | null
          visited_on?: string
          was_paid?: boolean
          would_return?: boolean | null
        }
        Update: {
          amount_paid_usd?: number | null
          bucket?: string
          companion?: string | null
          created_at?: string
          crowd_experienced?: number | null
          id?: string
          note?: string | null
          place_id?: string
          rank_position?: number
          score?: number
          time_spent_minutes?: number | null
          updated_at?: string
          user_id?: string
          value_rating?: number | null
          visited_on?: string
          was_paid?: boolean
          would_return?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      want_to_go: {
        Row: {
          created_at: string
          id: string
          place_id: string
          source: string
          source_user_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          place_id: string
          source?: string
          source_user_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          place_id?: string
          source?: string
          source_user_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "want_to_go_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "want_to_go_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "want_to_go_source_user_id_fkey"
            columns: ["source_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "want_to_go_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "want_to_go_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          id: string | null
          is_private: boolean | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string | null
          is_private?: boolean | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          id?: string | null
          is_private?: boolean | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_view_user: { Args: { target: string }; Returns: boolean }
      current_streak: { Args: { p_user: string }; Returns: number }
      delete_visit_and_rescore: {
        Args: { p_visit_id: string }
        Returns: undefined
      }
      edit_visit_details: {
        Args: { p_payload: Json; p_visit_id: string }
        Returns: {
          amount_paid_usd: number | null
          bucket: string
          companion: string | null
          created_at: string
          crowd_experienced: number | null
          id: string
          note: string | null
          place_id: string
          rank_position: number
          score: number
          time_spent_minutes: number | null
          updated_at: string
          user_id: string
          value_rating: number | null
          visited_on: string
          was_paid: boolean
          would_return: boolean | null
        }
        SetofOptions: {
          from: "*"
          to: "visits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      evaluate_badges_for_user: {
        Args: { p_user: string }
        Returns: {
          badge_key: string
        }[]
      }
      feed_page: {
        Args: { p_before: string; p_limit?: number; p_user: string }
        Returns: Json[]
      }
      log_visit: {
        Args: {
          p_bucket: string
          p_payload?: Json
          p_place_id: string
          p_position: number
        }
        Returns: {
          amount_paid_usd: number | null
          bucket: string
          companion: string | null
          created_at: string
          crowd_experienced: number | null
          id: string
          note: string | null
          place_id: string
          rank_position: number
          score: number
          time_spent_minutes: number | null
          updated_at: string
          user_id: string
          value_rating: number | null
          visited_on: string
          was_paid: boolean
          would_return: boolean | null
        }
        SetofOptions: {
          from: "*"
          to: "visits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      map_pins: {
        Args: { p_user: string }
        Returns: {
          category: string
          kind: string
          lat: number
          lng: number
          name: string
          place_id: string
          score: number
        }[]
      }
      profile_summary: { Args: { p_username: string }; Returns: Json }
      public_place: {
        Args: { p_ref_username?: string; p_slug: string }
        Returns: Json
      }
      rescore_bucket: {
        Args: { p_bucket: string; p_user: string }
        Returns: undefined
      }
      reset_hidden_recommendations: { Args: never; Returns: undefined }
      search_all: { Args: { p_limit?: number; p_query: string }; Returns: Json }
      set_recommendation_dismissal: {
        Args: { p_dismissed: boolean; p_place_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

