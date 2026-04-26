import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Body = {
  nome: string;
  email: string;
  password: string;
  role: "admin" | "gerente" | "vendedor" | "pos_venda" | "assistente_vendas";
  linha_ids?: string[];
  telefone?: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verifica chamador
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const callerId = claimsData.claims.sub;

    // Confere role admin via RPC has_role (executa com permissões do chamador)
    const { data: isAdmin, error: roleErr } = await userClient.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) return json({ error: "Apenas administradores" }, 403);

    const body = (await req.json()) as Body;
    if (!body?.nome || !body?.email || !body?.password || !body?.role) {
      return json({ error: "Campos obrigatórios: nome, email, password, role" }, 400);
    }
    if (body.password.length < 6) {
      return json({ error: "Senha deve ter ao menos 6 caracteres" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Cria usuário já confirmado
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { nome: body.nome },
    });
    if (createErr || !created.user) {
      return json({ error: createErr?.message ?? "Falha ao criar usuário" }, 400);
    }

    const userId = created.user.id;

    // O trigger handle_new_user já cria profile + role 'vendedor'.
    // Atualiza role para o solicitado e dados do profile.
    await admin.from("user_roles").delete().eq("user_id", userId);
    await admin.from("user_roles").insert({ user_id: userId, role: body.role });

    await admin
      .from("profiles")
      .update({ nome: body.nome, telefone: body.telefone ?? null })
      .eq("id", userId);

    if (body.linha_ids?.length) {
      const rows = body.linha_ids.map((lid) => ({ user_id: userId, linha_id: lid }));
      await admin.from("user_linhas").insert(rows);
    }

    return json({ ok: true, user_id: userId });
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
