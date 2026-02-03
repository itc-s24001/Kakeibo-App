export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          user_id: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          category_id: number;
          name: string;
          icon: string;
          color: string;
          type: string;
          display_order: number;
        };
      };
      transactions: {
        Row: {
          transaction_id: number;
          user_id: string;
          type: string;
          amount: number;
          category_id: number;
          date: string;
          memo: string | null;
          receipt_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          transaction_id?: number;
          user_id: string;
          type: string;
          amount: number;
          category_id: number;
          date: string;
          memo?: string | null;
          receipt_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      savings_goals: {
        Row: {
          goal_id: number;
          user_id: string;
          goal_name: string;
          target_amount: number;
          current_amount: number;
          deadline: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          goal_id?: number;
          user_id: string;
          goal_name: string;
          target_amount: number;
          current_amount?: number;
          deadline?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      monthly_budgets: {
        Row: {
          budget_id: number;
          user_id: string;
          year_month: string;
          total_budget: number;
          created_at: string;
          updated_at: string;
        };
      };
    };
    Views: {
      savings_goals_with_calculations: {
        Row: {
          goal_id: number;
          user_id: string;
          goal_name: string;
          target_amount: number;
          current_amount: number;
          deadline: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          monthly_required_amount: number;
          progress_percentage: number;
          days_remaining: number | null;
          months_remaining: number | null;
        };
      };
    };
  };
}
