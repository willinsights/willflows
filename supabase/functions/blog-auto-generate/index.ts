import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[BLOG-AUTO] Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if manual trigger or scheduled
    let isManual = false;
    try {
      const body = await req.json();
      isManual = body?.manual === true;
    } catch {
      // No body = scheduled run
    }

    console.log(`[BLOG-AUTO] Run type: ${isManual ? "manual" : "scheduled"}`);

    // Check auth for manual triggers
    if (isManual) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: authError } = await supabase.auth.getUser(token);

      if (authError || !userData.user) {
        return new Response(JSON.stringify({ error: "Token inválido" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if super admin
      const { data: adminData } = await supabase
        .from("system_admins")
        .select("id")
        .eq("user_id", userData.user.id)
        .single();

      if (!adminData) {
        return new Response(JSON.stringify({ error: "Acesso negado" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get auto settings
    const { data: settings, error: settingsError } = await supabase
      .from("blog_auto_settings")
      .select("*")
      .single();

    if (settingsError) {
      console.error("[BLOG-AUTO] Settings error:", settingsError);
      return new Response(JSON.stringify({ error: "Configurações não encontradas" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For scheduled runs, check if enabled
    if (!isManual && !settings.is_enabled) {
      console.log("[BLOG-AUTO] Auto generation disabled, skipping");
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate article by calling the main generate function
    console.log("[BLOG-AUTO] Triggering article generation...");

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Step 1: Discover trending topics from current news using Perplexity
    console.log("[BLOG-AUTO] Discovering trending topics from current news...");
    
    let selectedTopic = "";
    let newsContext = "";
    let topicUrgency = "medium";
    
    // Get recent article titles to avoid repetition
    const { data: recentPosts } = await supabase
      .from("blog_posts")
      .select("title")
      .order("created_at", { ascending: false })
      .limit(15);
    
    const recentTitles = recentPosts?.map(p => p.title.toLowerCase()) || [];
    console.log(`[BLOG-AUTO] Found ${recentTitles.length} recent articles to avoid repetition`);

    if (perplexityApiKey) {
      try {
        // Trending topics discovery query
        const trendingQuery = `Quais são as 5 notícias/tendências mais faladas HOJE no mundo da:
- Fotografia e vídeo profissional
- Tecnologia para criativos (câmaras, lentes, drones, gimbals)
- Produção audiovisual e cinema
- Software para fotógrafos e filmmakers
- Redes sociais e marketing visual
- Equipamentos novos (Sony, Canon, Nikon, DJI, Blackmagic)

FOCA EM:
1. Lançamentos de produtos nas últimas 24-48 horas
2. Notícias virais ou controversas do setor
3. Eventos importantes (festivais, premiações, exposições)
4. Tendências emergentes em IA para criativos
5. Mudanças no mercado (preços, aquisições, encerramentos)

NÃO INCLUIR estes temas que já foram abordados recentemente:
${recentTitles.slice(0, 5).join("\n")}

Retorna APENAS JSON válido:
{
  "trends": [
    {
      "topic": "Tema/notícia principal",
      "headline": "O que aconteceu (2-3 frases)",
      "angle": "Ângulo interessante para um artigo (como relacionar com o dia-a-dia de fotógrafos)",
      "urgency": "high|medium|low",
      "keywords": ["palavra1", "palavra2"]
    }
  ]
}`;
        
        const trendingResponse = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${perplexityApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            messages: [
              {
                role: "system",
                content: "És um analista de tendências especializado em fotografia e produção de vídeo profissional. Respondes sempre em português europeu (pt-PT) e em JSON válido.",
              },
              { role: "user", content: trendingQuery },
            ],
            search_recency_filter: "day", // Only last 24 hours
          }),
        });

        if (trendingResponse.ok) {
          const trendingData = await trendingResponse.json();
          const trendingContent = trendingData.choices?.[0]?.message?.content || "";
          console.log("[BLOG-AUTO] Trending topics response received");
          
          // Parse trending topics
          try {
            const jsonMatch = trendingContent.match(/\{[\s\S]*"trends"[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              const trends = parsed.trends || [];
              
              // Filter out topics similar to recent articles
              const freshTrends = trends.filter((trend: any) => 
                !recentTitles.some(title => 
                  trend.keywords?.some((kw: string) => title.includes(kw.toLowerCase())) ||
                  title.includes(trend.topic.toLowerCase().slice(0, 15))
                )
              );
              
              // Select the most urgent fresh topic, or fallback to any fresh topic
              const highUrgency = freshTrends.find((t: any) => t.urgency === "high");
              const mediumUrgency = freshTrends.find((t: any) => t.urgency === "medium");
              const selected = highUrgency || mediumUrgency || freshTrends[0] || trends[0];
              
              if (selected) {
                selectedTopic = selected.topic;
                topicUrgency = selected.urgency || "medium";
                newsContext = `NOTÍCIA/TENDÊNCIA ATUAL:\n**${selected.topic}**\n${selected.headline}\n\nÂngulo sugerido: ${selected.angle}`;
                console.log(`[BLOG-AUTO] Selected trending topic: "${selectedTopic}" (urgency: ${topicUrgency})`);
              }
            }
          } catch (parseError) {
            console.log("[BLOG-AUTO] Could not parse trending topics JSON, using raw content");
            newsContext = trendingContent;
          }
        }
      } catch (e) {
        console.log("[BLOG-AUTO] Trending topics discovery failed:", e);
      }
    }
    
    // Fallback to random topic if no trending topic found
    if (!selectedTopic) {
      const fallbackTopics = settings.preferred_topics || ["fotografia", "video", "produção audiovisual", "gestão de projetos criativos"];
      selectedTopic = fallbackTopics[Math.floor(Math.random() * fallbackTopics.length)];
      console.log(`[BLOG-AUTO] Using fallback topic: ${selectedTopic}`);
    }

    // Step 2: Generate article with Lovable AI based on trending topic
    const articlePrompt = `Escreve um artigo de blog profissional BASEADO NESTA NOTÍCIA/TENDÊNCIA ATUAL:

**TEMA PRINCIPAL:** ${selectedTopic}

${newsContext ? `${newsContext}\n\n` : ""}

REQUISITOS OBRIGATÓRIOS:

1. TÍTULO: Atrativo e SEO-friendly (max 70 caracteres) - DEVE refletir a notícia atual

2. EXCERPT: Resumo cativante que capture a essência (max 160 caracteres)

3. CONTEÚDO (1000-1500 palavras):
   - HTML semântico bem estruturado
   - CONECTAR a notícia/tendência com a realidade dos fotógrafos portugueses e brasileiros
   - Mostrar como o WillFlow pode ajudar neste contexto
   
   ESTRUTURA OBRIGATÓRIA:
   - Introdução envolvente que explica a notícia/tendência
   - Análise do impacto para profissionais de fotografia/vídeo
   - 3-5 secções principais com <h2> claros e descritivos
   - Subsecções com <h3> quando apropriado
   - Cada secção: 2-4 parágrafos bem desenvolvidos
   - Mínimo 2 listas (<ul> ou <ol>) com 4-6 items práticos
   - Pelo menos 1 <blockquote> com insight ou citação relevante
   - Conclusão com call-to-action sutil para WillFlow
   
   FORMATAÇÃO HTML:
   <h2 class="text-2xl font-bold mt-10 mb-4 text-foreground">Título da Secção</h2>
   <h3 class="text-xl font-semibold mt-8 mb-3 text-foreground">Subtítulo</h3>
   <p class="mb-4 leading-relaxed text-muted-foreground">Parágrafo...</p>
   <ul class="list-disc pl-6 mb-6 space-y-2">
     <li class="text-muted-foreground">Item da lista</li>
   </ul>
   <ol class="list-decimal pl-6 mb-6 space-y-2">
     <li class="text-muted-foreground">Item numerado</li>
   </ol>
   <blockquote class="border-l-4 border-primary pl-6 py-2 my-8 bg-muted/30 rounded-r-lg">
     <p class="italic text-foreground">"Citação impactante..."</p>
   </blockquote>
   <strong class="font-semibold text-foreground">Texto destacado</strong>
   <em class="italic">Texto em itálico</em>

   TOM:
   - Atual e relevante (falar sobre o que está a acontecer AGORA)
   - Profissional mas conversacional
   - Prático e orientado a ação
   - Empático com os desafios do sector

4. CATEGORIA: Uma de [novidades, tutorial, comparacao, dicas] - escolhe a mais apropriada para o tema

Responde APENAS com JSON válido neste formato:
{
  "title": "Título do Artigo",
  "excerpt": "Resumo cativante do artigo",
  "content": "<html completo do artigo>",
  "category": "categoria"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "És um copywriter especializado em conteúdo para profissionais de fotografia e vídeo. Escreves artigos envolventes, práticos e bem estruturados visualmente.",
          },
          { role: "user", content: articlePrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[BLOG-AUTO] AI error:", errorText);
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";

    // Parse article JSON
    let article: { title: string; excerpt: string; content: string; category: string };
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      article = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("[BLOG-AUTO] Parse error:", e);
      throw new Error("Failed to parse article");
    }

    console.log(`[BLOG-AUTO] Article generated: ${article.title}`);

    // Step 3: Generate cover image
    console.log("[BLOG-AUTO] Generating cover image...");

    const imagePrompt = `Create a professional, modern blog header image.

Theme: ${article.title}
Context: Photography and video production industry

Style requirements:
- Clean, minimalist design
- Gradient background with purple/violet (#7C3AED) and dark tones
- Abstract geometric shapes or subtle patterns
- Professional and sophisticated look
- NO text, NO letters, NO words
- 16:9 landscape aspect ratio
- Modern, tech-forward aesthetic
- Suitable for a professional SaaS blog`;

    let coverImageUrl: string | null = null;

    try {
      const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        const imageBase64 = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (imageBase64 && imageBase64.startsWith("data:image")) {
          // Extract base64 data
          const base64Data = imageBase64.split(",")[1];
          const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

          // Upload to storage with retry logic
          const timestamp = Date.now();
          const slug = article.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .slice(0, 50);
          const filename = `${slug}-${timestamp}.png`;

          let uploadSuccess = false;
          for (let attempt = 0; attempt < 3 && !uploadSuccess; attempt++) {
            if (attempt > 0) {
              console.log(`[BLOG-AUTO] Retry upload attempt ${attempt + 1}...`);
              await new Promise((r) => setTimeout(r, 1000 * attempt));
            }

            const { error: uploadError } = await supabase.storage
              .from("blog-images")
              .upload(filename, imageBytes, {
                contentType: "image/png",
                upsert: true,
              });

            if (!uploadError) {
              const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(filename);
              coverImageUrl = urlData.publicUrl;
              console.log("[BLOG-AUTO] Image uploaded:", coverImageUrl);
              uploadSuccess = true;
            } else {
              console.error(`[BLOG-AUTO] Upload error (attempt ${attempt + 1}):`, uploadError.message);
            }
          }
        }
      } else {
        console.log("[BLOG-AUTO] Image generation failed:", await imageResponse.text());
      }
    } catch (e) {
      console.error("[BLOG-AUTO] Image error:", e);
      // Continue without image
    }

    // Step 4: Save to database
    const slug = article.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100);

    const uniqueSlug = `${slug}-${Date.now().toString(36)}`;

    const { data: post, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        title: article.title,
        slug: uniqueSlug,
        excerpt: article.excerpt,
        content: article.content,
        category: article.category,
        cover_image: coverImageUrl,
        author_name: "WillFlow AI",
        is_published: settings.auto_publish,
        published_at: settings.auto_publish ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[BLOG-AUTO] Insert error:", insertError);
      throw new Error("Failed to save article");
    }

    // Update last run time
    await supabase
      .from("blog_auto_settings")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", settings.id);

    console.log(`[BLOG-AUTO] Article saved: ${post.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        postId: post.id,
        title: article.title,
        hasImage: !!coverImageUrl,
        isPublished: settings.auto_publish,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[BLOG-AUTO] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
