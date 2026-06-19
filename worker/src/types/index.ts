export interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  LLM_API_URL: string;
  LLM_API_KEY: string;
  LLM_MODEL: string;
  PEXELS_API_KEY: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthenticatedUser;
  }
}

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  password: string;
  phone_number?: string | null;
  profile_picture?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  role_id: number;
  role_name: string;
  description?: string | null;
}

export interface AuthenticatedUser {
  user_id: number;
  full_name: string;
  email: string;
  roles: string[];
}

export interface Admin {
  admin_id: number;
  user_id: number;
  admin_level: string;
  permissions?: string | null;
}

export interface SuperAdmin {
  super_admin_id: number;
  user_id: number;
  access_level: string;
  system_permissions?: string | null;
}

export interface Editor {
  editor_id: number;
  user_id: number;
  editor_level: string;
  department?: string | null;
  approval_limit?: number | null;
}

export interface Reader {
  reader_id: number;
  user_id: number;
  preferences?: string | null;
  subscription_status: string;
}

export interface Journalist {
  journalist_id: number;
  user_id: number;
  staff_number?: string | null;
  specialization?: string | null;
  employment_date?: string | null;
  verification_status: string;
}

export interface Category {
  category_id: number;
  category_name: string;
  description?: string | null;
  admin_id?: number | null;
}

export interface District {
  district_id: number;
  district_name: string;
  region?: string | null;
  admin_id?: number | null;
}

export interface ScrapedSource {
  source_id: number;
  source_name: string;
  feed_url: string;
  site_url?: string | null;
  is_active: number;
  last_scraped_at?: string | null;
  created_at: string;
}

export interface Article {
  article_id: number;
  title: string;
  content: string;
  status: string;
  llm_checked: number;
  source_type: string;
  source_name?: string | null;
  source_url?: string | null;
  original_author?: string | null;
  cover_image_url?: string | null;
  cover_image_credit?: string | null;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  journalist_id?: number | null;
  category_id?: number | null;
  district_id?: number | null;
}

export interface ArticleWithDetails extends Article {
  category_name?: string | null;
  district_name?: string | null;
  journalist_name?: string | null;
}

export interface EditorialReview {
  review_id: number;
  article_id: number;
  review_status: string;
  feedback?: string | null;
  review_date: string;
  reviewer_id?: number | null;
}

export interface Comment {
  comment_id: number;
  comment_text: string;
  created_at: string;
  user_id: number;
  article_id: number;
  full_name?: string;
}

export interface Media {
  media_id: number;
  file_url: string;
  media_type?: string | null;
  uploaded_at: string;
  article_id: number;
}
