import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
async function collectUserFiles(admin: ReturnType<typeof createClient>, bucket: string, prefix: string): Promise<string[]> {
  const files: string[] = [];
  async function walk(path: string) {
    const { data, error } = await admin.storage.from(bucket).list(path, { limit: 1000 });
    if (error) throw new Error("Could not check uploaded media. Your account has not been deleted; please retry.");
    for (const item of data || []) {
      const fullPath = path ? path + "/" + item.name : item.name;
      if (item.id === null) await walk(fullPath);
      else files.push(fullPath);
    }
  }
  await walk(prefix);
  return files;
}
const reasons = new Set([
  "I no longer use Vibe.ly",
  "I have privacy or security concerns",
  "I’m receiving too many notifications",
  "I’m experiencing technical problems",
  "I’m not finding the content or people I want",
  "I’m concerned about harassment or inappropriate content",
  "I’m switching to another platform",
  "I created another account",
  "Other",
]);
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceRoleKey) return response({ error: "Account deletion is not configured." }, 500);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return response({ error: "Please sign in again." }, 401);
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: { user }, error: authError } = await caller.auth.getUser();
  if (authError || !user) return response({ error: "Your session has expired. Please sign in again." }, 401);
  let body: { confirmation?: unknown; reason?: unknown; details?: unknown };
  try { body = await req.json(); } catch { return response({ error: "Confirm account deletion to continue." }, 400); }
  if (body.confirmation !== "DELETE MY ACCOUNT") return response({ error: "Type DELETE MY ACCOUNT to confirm." }, 400);
  const reason = typeof body.reason === "string" && reasons.has(body.reason) ? body.reason : "Other";
  const details = typeof body.details === "string" ? body.details.trim().slice(0, 2000) : "";
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    // Anonymous feedback only: do not retain the account ID or email with this survey response.
    const { error: feedbackError } = await admin.from("account_deletion_feedback").insert({ reason, details: details || null });
    if (feedbackError) console.error("Could not save optional account deletion feedback:", feedbackError.message);
    for (const bucket of ["vibely-posts", "vibely-avatars"]) {
      const files = await collectUserFiles(admin, bucket, user.id);
      for (let i = 0; i < files.length; i += 100) {
        const { error } = await admin.storage.from(bucket).remove(files.slice(i, i + 100));
        if (error) throw new Error("Could not remove account media. Your account has not been deleted; please retry.");
      }
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw new Error("Account deletion failed. Your account has not been deleted; please retry.");
    return response({ success: true });
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Account deletion failed. Please retry." }, 500);
  }
});
