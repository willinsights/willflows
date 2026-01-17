import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  topics?: string[];
  autoPublish?: boolean;
  category?: string;
}

interface PerplexityResult {
  title: string;
  summary: string;
  relevance: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body: GenerateRequest = await req.json().catch(() => ({}));
    const { topics = [], autoPublish = false, category } = body;

    console.log(`[AI Blog] Gerando artigo para utilizador ${user.id}`);
    console.log(`[AI Blog] Tópicos: ${topics.join(", ") || "default"}`);

    // Get API keys
    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!perplexityApiKey) {
      console.error("[AI Blog] PERPLEXITY_API_KEY não configurada");
      return new Response(JSON.stringify({ error: "Perplexity API não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!lovableApiKey) {
      console.error("[AI Blog] LOVABLE_API_KEY não configurada");
      return new Response(JSON.stringify({ error: "Lovable AI não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Search for news with Perplexity
    console.log("[AI Blog] Pesquisando notícias com Perplexity...");
    
    const topicQuery = topics.length > 0 
      ? topics.join(", ")
      : "software gestão fotógrafos, tendências produção vídeo, ferramentas estúdios fotografia, CRM criativos";

    const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${perplexityApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "És um pesquisador especializado em tecnologia para fotógrafos e filmmakers. Responde sempre em português europeu (pt-PT).",
          },
          {
            role: "user",
            content: `Pesquisa notícias recentes (últimos 7 dias) sobre: ${topicQuery}

Foca em:
- Software de gestão para fotógrafos e filmmakers
- Tendências em produção audiovisual e vídeo
- Ferramentas e apps para estúdios de fotografia
- CRM e gestão de projetos para criativos
- Comparações entre ferramentas do mercado

Retorna as 3 notícias mais relevantes em formato JSON:
{
  "news": [
    {
      "title": "Título da notícia",
      "summary": "Resumo em 2-3 frases",
      "relevance": "Porque é relevante para fotógrafos/filmmakers"
    }
  ]
}`,
          },
        ],
        search_recency_filter: "week",
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error("[AI Blog] Erro Perplexity:", perplexityResponse.status, errorText);
      
      if (perplexityResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos Perplexity excedido. Tenta novamente mais tarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Erro na pesquisa de notícias" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const perplexityData = await perplexityResponse.json();
    const newsContent = perplexityData.choices?.[0]?.message?.content || "";
    const citations = perplexityData.citations || [];
    
    console.log("[AI Blog] Notícias encontradas:", newsContent.substring(0, 200));

    // Parse news from Perplexity response
    let selectedNews: PerplexityResult;
    try {
      const jsonMatch = newsContent.match(/\{[\s\S]*"news"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        selectedNews = parsed.news?.[0] || { 
          title: "Tendências de Gestão para Criativos", 
          summary: newsContent.substring(0, 500),
          relevance: "Relevante para fotógrafos e filmmakers"
        };
      } else {
        selectedNews = { 
          title: "Novidades no Mercado Audiovisual", 
          summary: newsContent.substring(0, 500),
          relevance: "Tendências atuais do setor"
        };
      }
    } catch (e) {
      console.warn("[AI Blog] Erro ao parsear notícias, usando fallback");
      selectedNews = { 
        title: "Inovações para Fotógrafos e Filmmakers", 
        summary: newsContent.substring(0, 500),
        relevance: "Conteúdo relevante para profissionais criativos"
      };
    }

    // Step 2: Generate article with Lovable AI
    console.log("[AI Blog] Gerando artigo com Lovable AI...");

    const categoryHint = category || "novidades";
    
    const lovableResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `És um escritor especializado em conteúdo para fotógrafos e filmmakers portugueses. 
Escreves artigos de blog profissionais, informativos e envolventes em português europeu (pt-PT).
O teu objetivo é criar conteúdo que ajude profissionais criativos a melhorar o seu trabalho e negócio.`,
          },
          {
            role: "user",
            content: `Escreve um artigo de blog completo baseado nesta notícia/tema:

**Título da Notícia:** ${selectedNews.title}
**Resumo:** ${selectedNews.summary}
**Relevância:** ${selectedNews.relevance}

${citations.length > 0 ? `**Fontes:** ${citations.slice(0, 3).join(", ")}` : ""}

**Requisitos do Artigo:**

1. **Título:** Cria um título atrativo e SEO-friendly (máximo 70 caracteres)

2. **Excerpt:** Resumo cativante para preview (máximo 160 caracteres)

3. **Conteúdo:** 
   - 800-1200 palavras
   - HTML válido com tags semânticas (h2, h3, p, ul, ol, strong, em)
   - Estrutura clara com introdução, desenvolvimento e conclusão
   - Inclui listas e pontos-chave quando apropriado
   - Tom profissional mas acessível
   - Menciona como ferramentas de gestão (como WillFlow) podem ajudar, de forma natural e não promocional

4. **Categoria:** Sugere uma categoria entre: novidades, tutorial, comparacao, dicas (preferência: ${categoryHint})

Responde em JSON:
{
  "title": "Título do artigo (max 70 chars)",
  "excerpt": "Excerpt para preview (max 160 chars)",
  "content": "<article>HTML do conteúdo completo</article>",
  "category": "novidades|tutorial|comparacao|dicas"
}`,
          },
        ],
      }),
    });

    if (!lovableResponse.ok) {
      const errorText = await lovableResponse.text();
      console.error("[AI Blog] Erro Lovable AI:", lovableResponse.status, errorText);
      
      if (lovableResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos AI excedido. Tenta novamente mais tarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (lovableResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos Lovable AI esgotados. Adiciona créditos em Settings -> Workspace -> Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Erro na geração do artigo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableData = await lovableResponse.json();
    const articleContent = lovableData.choices?.[0]?.message?.content || "";
    
    console.log("[AI Blog] Artigo gerado, processando...");

    // Parse article from Lovable AI response
    let article: { title: string; excerpt: string; content: string; category: string };
    try {
      const jsonMatch = articleContent.match(/\{[\s\S]*"title"[\s\S]*"content"[\s\S]*\}/);
      if (jsonMatch) {
        article = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("JSON não encontrado na resposta");
      }
    } catch (e) {
      console.error("[AI Blog] Erro ao parsear artigo:", e);
      return new Response(JSON.stringify({ error: "Erro ao processar artigo gerado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create unique slug
    const baseSlug = article.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 60);
    
    const timestamp = Date.now().toString(36);
    const slug = `${baseSlug}-${timestamp}`;

    // Save to database
    console.log("[AI Blog] Guardando artigo na base de dados...");
    
    const { data: post, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        title: article.title.substring(0, 200),
        slug,
        excerpt: article.excerpt?.substring(0, 300) || null,
        content: article.content,
        author_name: "WillFlow Team",
        category: article.category || categoryHint,
        is_published: autoPublish,
        published_at: autoPublish ? new Date().toISOString() : null,
      })
      .select("id, title, slug")
      .single();

    if (insertError) {
      console.error("[AI Blog] Erro ao guardar:", insertError);
      return new Response(JSON.stringify({ error: "Erro ao guardar artigo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[AI Blog] Artigo criado com sucesso: ${post.id}`);

    return new Response(JSON.stringify({
      success: true,
      postId: post.id,
      title: post.title,
      slug: post.slug,
      isPublished: autoPublish,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[AI Blog] Erro não tratado:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
