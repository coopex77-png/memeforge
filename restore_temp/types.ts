
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
  category: string; // e.g. "Technology", "Gaming", "Politics", "Meme"
  description: string; // Context explaining WHY it is trending
  memeScore?: number; // NEW: 1-10 Score of how good this would be as a memecoin
  volume?: string; // e.g. "50K posts"
  url?: string; // Link to context
  source?: 'x' | 'reddit' | '4chan' | 'tiktok' | 'kym' | 'news' | 'mixed'; // NEW: Track origin platform
}
