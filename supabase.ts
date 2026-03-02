import { createClient } from '@supabase/supabase-js';
import { DatabaseUser } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const deductCredits = async (
  accessCode: string,
  type: 'art' | 'lore',
  amount: number
): Promise<boolean> => {
  try {
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('art_credits, lore_credits, is_active, can_use_art, can_use_scrape, can_use_news_scrape, is_admin')
      .eq('access_code', accessCode)
      .single();

    if (fetchError || !user || !user.is_active) return false;

    if (user.is_admin) return true; // Admins get unlimited credits

    if (type === 'art') {
      if (!user.can_use_art || user.art_credits < amount) return false;
      const { error: updateError } = await supabase
        .from('users')
        .update({ art_credits: user.art_credits - amount })
        .eq('access_code', accessCode);
      return !updateError;
    } else {
      if (!user.can_use_scrape && !user.can_use_news_scrape) return false;
      if (user.lore_credits < amount) return false;
      const { error: updateError } = await supabase
        .from('users')
        .update({ lore_credits: user.lore_credits - amount })
        .eq('access_code', accessCode);
      return !updateError;
    }
  } catch (err) {
    console.error('Error deducting credits:', err);
    return false;
  }
};
