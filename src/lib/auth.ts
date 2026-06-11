import { supabase } from './supabase';
import { openUrl } from '@tauri-apps/plugin-opener';

export async function signInWithProvider(provider: 'github' | 'google') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: 'abstrakx-blueprint://callback',
      skipBrowserRedirect: true, // We open it manually using Tauri's opener
    },
  });

  if (error) throw error;
  
  if (data?.url) {
    // Open the OAuth authorization page in the default system browser
    await openUrl(data.url);
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
