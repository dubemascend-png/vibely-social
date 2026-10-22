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
  async function walk(folder: string): Promise<void> {
    let offset = 0;
    while (true) {
      const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw new Error("Could not prepare account media deletion.");
      if (!data?.length) break;
      for (const item of data) {
        const path = folder ? folder + "/" + item.name : item.name;
        if (item.id === null) await walk(path);
        else files.push(path);
      }
      if (data.length < 100) break;
      offset += data.length;
    }
  }
  await walk(prefix);
  return files;
}
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
  let confirmation: string;
  try { confirmation = (await req.json()).confirmation; } catch { return response({ error: "Confirm account deletion to continue." }, 400); }
  if (confirmation !== "DELETE MY ACCOUNT") return response({ error: "Type DELETE MY ACCOUNT to confirm." }, 400);
  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
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