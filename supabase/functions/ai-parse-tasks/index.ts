import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, currentPhase } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Texto demasiado curto. Cole pelo menos uma frase." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (text.length > 10000) {
      return new Response(
        JSON.stringify({ error: "Texto demasiado longo. Máximo 10.000 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Sou um assistente de gestão de projetos de produção audiovisual.
Analiso texto livre e extraio tarefas estruturadas.

Contexto de fases:
- "captacao" = filmagem, gravação, captação de imagem/som, preparação de equipamento, scouting, entrevistas
- "edicao" = pós-produção, edição de vídeo, correção de cor, áudio, legendas, motion graphics, entregas

Regras:
- Extrair tarefas claras e acionáveis
- Cada tarefa deve ter um título curto e objetivo (máx 80 caracteres)
- Descrição opcional com detalhes extras
- Fase: usar "${currentPhase || "captacao"}" como default se não for claro
- Prioridade: inferir do contexto (urgente/alta/media/baixa), default "media"
- Sub-itens de checklist: passos concretos dentro de cada tarefa
- Máximo 50 tarefas
- Não inventar tarefas que não estejam no texto`;

    console.log("Calling AI gateway to parse tasks from text...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analisa o seguinte texto e extrai tarefas estruturadas:\n\n${text}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_tasks",
              description: "Extrai tarefas estruturadas de texto livre para produção audiovisual.",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Título curto da tarefa (máx 80 chars)" },
                        description: { type: "string", description: "Descrição opcional com detalhes" },
                        phase: { type: "string", enum: ["captacao", "edicao"], description: "Fase do projeto" },
                        priority: { type: "string", enum: ["baixa", "media", "alta", "urgente"] },
                        checklist_items: {
                          type: "array",
                          items: { type: "string" },
                          description: "Sub-itens/passos concretos desta tarefa",
                        },
                      },
                      required: ["title", "phase", "priority"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["tasks"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_tasks" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const body = await response.text();
      console.error(`AI gateway error: ${status}`, body);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de pedidos atingido. Tenta novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA insuficientes. Adiciona créditos nas definições." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    console.log("AI response received");

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "A IA não conseguiu extrair tarefas deste texto." }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    const tasks = parsed.tasks || [];

    console.log(`Extracted ${tasks.length} tasks from text`);

    return new Response(JSON.stringify({ tasks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-parse-tasks error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
