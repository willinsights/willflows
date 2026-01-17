import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Promotional banners configuration - mapped by theme
interface BannerConfig {
  url: string;
  alt: string;
  theme: string[];
}

const promotionalBanners: BannerConfig[] = [
  {
    url: 'https://willflows.lovable.app/banners/banner-proximo-projeto.png',
    alt: 'Seu próximo projeto começa aqui - Experimente WillFlow',
    theme: ['organizacao', 'projetos', 'workflow', 'gestao']
  },
  {
    url: 'https://willflows.lovable.app/banners/banner-perder-dinheiro.png',
    alt: 'Pare de perder dinheiro nos teus jobs - WillFlow',
    theme: ['financeiro', 'custos', 'preco', 'lucro', 'margem']
  },
  {
    url: 'https://willflows.lovable.app/banners/banner-excel.png',
    alt: 'WillFlow porque Excel é para quem não quer ganhar dinheiro',
    theme: ['software', 'ferramentas', 'produtividade', 'alternativa']
  },
  {
    url: 'https://willflows.lovable.app/banners/banner-escravo-negocio.png',
    alt: 'Pare de ser escravo do seu próprio negócio - WillFlow',
    theme: ['tempo', 'liberdade', 'gestao', 'burnout', 'stress']
  },
  {
    url: 'https://willflows.lovable.app/banners/banner-moedas-financeiro.png',
    alt: 'Controle financeiro para criativos - WillFlow',
    theme: ['financeiro', 'dinheiro', 'custos', 'receita']
  },
  {
    url: 'https://willflows.lovable.app/banners/banner-criativo-admin.png',
    alt: 'Você é criativo demais para perder tempo com admin',
    theme: ['criativo', 'fotografo', 'filmmaker', 'admin', 'burocracia']
  },
  {
    url: 'https://willflows.lovable.app/banners/banner-dinheiro-claro.png',
    alt: 'Dinheiro claro muda tudo - WillFlow',
    theme: ['financeiro', 'transparencia', 'controlo', 'relatorios']
  },
  {
    url: 'https://willflows.lovable.app/banners/banner-testemunho.png',
    alt: 'Testemunho de utilizador WillFlow',
    theme: ['prova', 'testemunho', 'review', 'qualidade']
  },
  {
    url: 'https://willflows.lovable.app/banners/banner-chaos-apps.png',
    alt: 'Dinheiro que some, projetos que vazam - Organize com WillFlow',
    theme: ['caos', 'desorganizacao', 'perda', 'confusao', 'problemas']
  }
];

// Select relevant banners based on article content
function selectRelevantBanners(title: string, summary: string): BannerConfig[] {
  const content = `${title} ${summary}`.toLowerCase();
  const selectedBanners: BannerConfig[] = [];
  
  // Score each banner based on theme matches
  const bannerScores = promotionalBanners.map(banner => {
    const score = banner.theme.reduce((acc, theme) => {
      return acc + (content.includes(theme) ? 1 : 0);
    }, 0);
    return { banner, score };
  });
  
  // Sort by score descending
  bannerScores.sort((a, b) => b.score - a.score);
  
  // Select top 2 banners with score > 0, or random if no matches
  const topBanners = bannerScores.filter(b => b.score > 0).slice(0, 2);
  
  if (topBanners.length >= 2) {
    selectedBanners.push(topBanners[0].banner, topBanners[1].banner);
  } else if (topBanners.length === 1) {
    selectedBanners.push(topBanners[0].banner);
    // Add a random different banner
    const remaining = promotionalBanners.filter(b => b !== topBanners[0].banner);
    selectedBanners.push(remaining[Math.floor(Math.random() * remaining.length)]);
  } else {
    // No matches, pick 2 random banners
    const shuffled = [...promotionalBanners].sort(() => Math.random() - 0.5);
    selectedBanners.push(shuffled[0], shuffled[1]);
  }
  
  return selectedBanners;
}

// Generate banner HTML
function generateBannerHtml(banner: BannerConfig): string {
  return `
<div class="willflow-banner my-12 -mx-4 md:-mx-8">
  <a href="https://willflow.app/auth?trial=true" target="_blank" rel="noopener noreferrer" class="block">
    <img 
      src="${banner.url}" 
      alt="${banner.alt}"
      class="w-full rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-[1.02]"
      loading="lazy"
    />
  </a>
</div>`;
}

// Insert banners into content at strategic positions
function insertBannersIntoContent(content: string, banners: BannerConfig[]): string {
  // Split content by </h2> to find section breaks
  const sections = content.split(/<\/h2>/gi);
  
  if (sections.length < 3 || banners.length === 0) {
    // Not enough sections, append banner at the end
    return content + (banners[0] ? generateBannerHtml(banners[0]) : '');
  }
  
  // Calculate insertion points (40% and 75% of content)
  const firstInsertPoint = Math.floor(sections.length * 0.4);
  const secondInsertPoint = Math.floor(sections.length * 0.75);
  
  // Rebuild content with banners
  let result = '';
  for (let i = 0; i < sections.length; i++) {
    result += sections[i];
    if (i < sections.length - 1) {
      result += '</h2>';
    }
    
    // Insert first banner after ~40% of content
    if (i === firstInsertPoint && banners[0]) {
      result += generateBannerHtml(banners[0]);
    }
    
    // Insert second banner after ~75% of content
    if (i === secondInsertPoint && banners[1]) {
      result += generateBannerHtml(banners[1]);
    }
  }
  
  return result;
}

// Helper function to extract intelligent search terms for hero image
function extractImageSearchTerms(title: string, summary: string): string {
  const content = `${title} ${summary}`.toLowerCase();
  
  // SOFTWARE/APPS de edição
  const softwareMappings: Record<string, string> = {
    'evoto': 'ai photo editing software retouching portrait',
    'luminar': 'luminar ai photo editing software',
    'capture one': 'capture one pro software editing',
    'darktable': 'darktable open source photo editing',
    'affinity': 'affinity photo editing software',
    'pixelmator': 'pixelmator pro photo editing mac',
    'on1': 'on1 photo raw editing software',
  };
  
  for (const [software, searchTerms] of Object.entries(softwareMappings)) {
    if (content.includes(software)) {
      return searchTerms;
    }
  }
  
  // Brands and products
  const brandMappings: Record<string, string[]> = {
    'apple': ['apple macbook creative professional'],
    'adobe': ['adobe creative cloud lightroom photoshop'],
    'sony': ['sony camera alpha mirrorless'],
    'canon': ['canon eos camera professional'],
    'nikon': ['nikon camera dslr mirrorless'],
    'dji': ['dji drone mavic aerial photography'],
    'blackmagic': ['blackmagic camera cinema davinci'],
    'fujifilm': ['fujifilm x camera mirrorless'],
    'leica': ['leica camera photography rangefinder'],
    'panasonic': ['panasonic lumix camera video'],
    'red': ['red cinema camera digital'],
    'arri': ['arri camera cinema alexa professional'],
  };
  
  const terms: string[] = [];
  for (const [brand, searchTerms] of Object.entries(brandMappings)) {
    if (content.includes(brand)) {
      terms.push(...searchTerms);
    }
  }
  
  // Topic-based terms
  if (content.match(/oscar|academy|cinema|hollywood/)) {
    return 'cinema camera film production hollywood';
  }
  if (content.match(/casamento|wedding|noiva|bride/)) {
    return 'wedding photography photographer bride ceremony';
  }
  if (content.match(/drone|aerial|aéreo|mavic/)) {
    return 'drone aerial photography landscape cinematic';
  }
  if (content.match(/portrait|retrato|headshot/)) {
    return 'portrait photography studio professional lighting';
  }
  if (content.match(/custo|preço|budget|money|lucro|margem|financ/)) {
    return 'business finance calculator laptop professional';
  }
  if (content.match(/equipa|team|colaborador|freelancer/)) {
    return 'creative team meeting photography studio collaboration';
  }
  if (content.match(/inteligência artificial|ai|machine learning|automação/)) {
    return 'artificial intelligence technology creative professional';
  }
  if (content.match(/vídeo|video|filmmaker|cinemato/)) {
    return 'video production filmmaker camera cinematic';
  }
  if (content.match(/iphone|smartphone|mobile/)) {
    return 'smartphone mobile photography professional';
  }
  if (content.match(/instagram|social media|redes sociais|tiktok/)) {
    return 'social media content creator professional';
  }
  
  if (terms.length > 0) {
    return terms.slice(0, 3).join(' ');
  }
  
  // Fallback: use title keywords
  const cleanTitle = title
    .replace(/[?!:.,]/g, '')
    .replace(/como|para|que|com|uma|um|os|as|do|da|de|e|o|a/gi, '')
    .trim()
    .substring(0, 60);
  
  return `${cleanTitle} photography professional`;
}

// Delay helper
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Get number of articles to generate
    const articlesToGenerate = settings.articles_per_day || 1;
    console.log(`[BLOG-AUTO] Will generate ${articlesToGenerate} articles`);

    // Track results
    const results: { success: boolean; title?: string; error?: string; postId?: string }[] = [];

    // Get recent article titles to avoid repetition (get more for multiple articles)
    const { data: recentPosts } = await supabase
      .from("blog_posts")
      .select("title")
      .order("created_at", { ascending: false })
      .limit(20 + articlesToGenerate);

    const recentTitles = recentPosts?.map(p => p.title.toLowerCase()) || [];
    console.log(`[BLOG-AUTO] Found ${recentTitles.length} recent articles to avoid repetition`);

    // Generate articles in a loop
    for (let articleIndex = 0; articleIndex < articlesToGenerate; articleIndex++) {
      console.log(`\n[BLOG-AUTO] ========== GENERATING ARTICLE ${articleIndex + 1}/${articlesToGenerate} ==========`);

      try {
        // Step 1: Discover trending topics from current news using Perplexity
        let selectedTopic = "";
        let newsContext = "";
        let topicUrgency = "medium";

        if (perplexityApiKey) {
          try {
            console.log("[BLOG-AUTO] Discovering trending topics from current news...");
            
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
${recentTitles.slice(0, 10).join("\n")}

Para o artigo ${articleIndex + 1}, foca num tema DIFERENTE dos anteriores.

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
                  
                  // Filter out topics similar to recent articles AND previous articles in this run
                  const generatedTitles = results.map(r => r.title?.toLowerCase() || '');
                  const allRecentTitles = [...recentTitles, ...generatedTitles];
                  
                  const freshTrends = trends.filter((trend: any) => 
                    !allRecentTitles.some(title => 
                      trend.keywords?.some((kw: string) => title.includes(kw.toLowerCase())) ||
                      title.includes(trend.topic.toLowerCase().slice(0, 15))
                    )
                  );
                  
                  // Select based on article index to get variety
                  const trendIndex = articleIndex % Math.max(freshTrends.length, 1);
                  const selected = freshTrends[trendIndex] || freshTrends[0] || trends[trendIndex] || trends[0];
                  
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
          // Use different topic for each article
          selectedTopic = fallbackTopics[(articleIndex) % fallbackTopics.length];
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

        console.log("[BLOG-AUTO] Generating article with AI...");
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

        // Step 3: Select and insert promotional banners
        console.log("[BLOG-AUTO] Selecting promotional banners...");
        const selectedBanners = selectRelevantBanners(article.title, article.excerpt);
        console.log(`[BLOG-AUTO] Selected ${selectedBanners.length} banners: ${selectedBanners.map(b => b.alt.slice(0, 30)).join(', ')}`);
        
        // Insert banners into content
        article.content = insertBannersIntoContent(article.content, selectedBanners);

        // Step 4: Generate cover image with improved prompt
        console.log("[BLOG-AUTO] Generating cover image...");

        // Extract search terms for more relevant image
        const imageSearchTerms = extractImageSearchTerms(article.title, article.excerpt);
        console.log(`[BLOG-AUTO] Image search terms: ${imageSearchTerms}`);

        // Improved image prompt - more specific and realistic
        const imagePrompt = `Create a professional PHOTOGRAPH for a blog article.

ARTICLE TITLE: "${article.title}"
CONTEXT: ${imageSearchTerms}

STYLE REQUIREMENTS:
- Editorial photography style, realistic, high-quality DSLR aesthetic
- Natural lighting, professional composition
- Relevant to the article topic (${selectedTopic})
- Clean and modern look suitable for a professional blog
- 16:9 landscape aspect ratio
- NO text, NO letters, NO words, NO logos
- Focus on the subject matter, not abstract shapes
- If about photography: show cameras, photographers at work, behind the scenes
- If about video: show film equipment, cinematographers, production sets
- If about software: show creative workspace, laptop/monitor with editing software
- If about business: show professional meeting, planning, creative workspace

AVOID:
- Generic abstract shapes
- Purple gradients or generic tech backgrounds
- Stock photo clichés
- Artificial or overly digital looking images`;

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
                  await delay(1000 * attempt);
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

        // Step 5: Save to database
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

        console.log(`[BLOG-AUTO] Article ${articleIndex + 1} saved: ${post.id}`);
        
        // Add to results
        results.push({
          success: true,
          title: article.title,
          postId: post.id,
        });

        // Add title to recent titles to avoid duplication in next iteration
        recentTitles.push(article.title.toLowerCase());

        // Delay between articles (10 seconds) to avoid rate limiting
        if (articleIndex < articlesToGenerate - 1) {
          console.log("[BLOG-AUTO] Waiting 10 seconds before next article...");
          await delay(10000);
        }

      } catch (articleError) {
        console.error(`[BLOG-AUTO] Error generating article ${articleIndex + 1}:`, articleError);
        results.push({
          success: false,
          error: articleError instanceof Error ? articleError.message : "Unknown error",
        });
        
        // Continue to next article even if one fails
        if (articleIndex < articlesToGenerate - 1) {
          console.log("[BLOG-AUTO] Continuing to next article after error...");
          await delay(5000);
        }
      }
    }

    // Update last run time
    await supabase
      .from("blog_auto_settings")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", settings.id);

    // Summary
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    console.log(`\n[BLOG-AUTO] ========== COMPLETE ==========`);
    console.log(`[BLOG-AUTO] Generated ${successCount}/${articlesToGenerate} articles successfully`);
    if (failCount > 0) {
      console.log(`[BLOG-AUTO] ${failCount} articles failed`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          requested: articlesToGenerate,
          generated: successCount,
          failed: failCount,
        },
        articles: results,
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
