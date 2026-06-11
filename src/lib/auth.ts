import { supabase } from "./supabase";
import { openUrl } from "@tauri-apps/plugin-opener";

export async function signInWithProvider(provider: "github" | "google") {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: "abstrakx-blueprint://callback",
      skipBrowserRedirect: true, // We open it manually using Tauri's opener
      // Request repo scope for GitHub so we can list/read private repositories
      ...(provider === "github" && { scopes: "repo read:user" }),
    },
  });

  if (error) throw error;

  if (data?.url) {
    // Open the OAuth authorization page in the default system browser
    console.log(data.url);
    await openUrl(data.url);
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function handleDeepLinkCallback(url: string) {
  try {
    const urlObj = new URL(url);

    // Check if it's code (PKCE) or hash parameters (implicit flow)
    const code = urlObj.searchParams.get("code");
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return data.session;
    }

    // Handle hash fragments just in case (e.g. access_token=xxx&refresh_token=yyy)
    const hash = urlObj.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) throw error;
        return data.session;
      }
    }

    return null;
  } catch (error) {
    console.error("Error handling deep link callback:", error);
    throw error;
  }
}
