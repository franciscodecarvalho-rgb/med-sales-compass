import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" });
    const callerId = claimsData.claims.sub;

    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) return json({ error: "Apenas administradores" });

    const body = (await req.json()) as { user_id: string; password: string };
    if (!body?.user_id || !body?.password) return json({ error: "user_id e password obrigatórios" });
    if (body.password.length < 6) return json({ error: "Senha deve ter ao menos 6 caracteres" });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { error } = await admin.auth.admin.updateUserById(body.user_id, { password: body.password });
    if (error) {
      const msg = /pwned|leaked|compromised/i.test(error.message)
        ? "Esta senha aparece em vazamentos públicos. Escolha uma senha mais forte e única."
        : /weak|short|password/i.test(error.message)
        ? `Senha rejeitada: ${error.message}`
        : error.message;
      return json({ error: msg });
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
