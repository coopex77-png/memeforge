
export interface Mascot {
  id: string;
  name: string;
  narrative: string;
  artStyle: string;
  styleId?: string; // Tracks the ID of the art style used
  imageUrl: string;
  originalPrompt: string;
  scenes?: Scene[];
  modelUsed?: string; // Tracks which AI model generated the image
  ticker?: string;
  preserveOriginal?: boolean; // NEW: If true, character pose/style is locked
  sourceLink?: string; // NEW: Link to the viral source
  traitsConfig?: string; // NEW: Store trait definitions for further generation
  traitMode?: 'mix' | 'scenes'; // NEW: 'mix' = AI combinations, 'scenes' = Direct scenarios
}

export interface MascotIdea {
  name: string;
  narrative: string;
  artStyleDescription: string;
  imagePrompt: string;
  styleId?: string; // ID of the style used
  referenceImage?: string; // Optional field to support upload-based generation
  ticker?: string;
  preserveOriginal?: boolean; // NEW: Pass preference to generation
  sourceLink?: string; // NEW: Link to the viral source
}

export interface Scene {
  id: string;
  imageUrl: string;
  description: string;
  modelUsed?: string; // Tracks which AI model generated the image
}

export interface XTrend {
  topic: string; // The main headline (e.g. "SpaceX Launch", "GTA VI Trailer")
  publishedDate?: string; // NEW: YYYY-MM-DD timestamp for timeline filtering
  category: string; // e.g. "Technology", "Gaming", "Politics", "Meme"
  description: string; // Context explaining WHY it is trending
  memeScore?: number; // NEW: 1-10 Score of how good this would be as a memecoin
  volume?: string; // e.g. "50K posts"
  url?: string; // Link to context
  newsUrl?: string; // NEW: Direct link to the actual news article
  source?: 'x' | 'reddit' | '4chan' | 'tiktok' | 'kym' | 'news' | 'mixed'; // NEW: Track origin platform
}

export interface DatabaseUser {
  access_code: string;
  is_admin: boolean;
  is_active: boolean;
  can_use_art: boolean;
  can_use_scrape: boolean;
  can_use_news_scrape?: boolean;
  art_credits: number;
  lore_credits: number;
  created_at: string;
  last_login: string | null;
  subscription_days: number | null;
  subscription_start: string | null;
  package_name: string | null;
}

export interface DiscountCode {
  id: string;
  code: string;
  percentage: number;
  is_active: boolean;
  created_at: string;
  expires_at?: string | null;
}
