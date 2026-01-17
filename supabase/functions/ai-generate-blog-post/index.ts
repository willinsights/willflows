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

// Helper function to generate inline image
async function generateInlineImage(
  supabase: any,
  lovableApiKey: string,
  imageDescription: string,
  baseSlug: string
): Promise<string | null> {
  try {
    const imagePrompt = `Create a professional PHOTOGRAPH for a blog article.

IMAGE DESCRIPTION: "${imageDescription}"

STYLE REQUIREMENTS:
- Professional photography style, REALISTIC
- Real-world scenes from photography/video production industry
- Natural lighting, high-quality DSLR aesthetic
- Clean composition, editorial quality
- Subtle purple/violet color grading (#7C3AED accents)
- 16:9 landscape aspect ratio
- NO text, NO logos, NO watermarks
- Think: Getty Images, Unsplash professional stock photography`;

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

    if (!imageResponse.ok) {
      console.log("[AI Blog] Inline image generation failed:", imageResponse.status);
      return null;
    }

    const imageData = await imageResponse.json();
    const imageBase64 = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageBase64 || !imageBase64.startsWith("data:image")) {
      return null;
    }

    // Extract and upload
    const base64Data = imageBase64.split(",")[1];
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const imageFilename = `inline/${baseSlug}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.png`;

    const { error: uploadError } = await supabase.storage
      .from("blog-images")
      .upload(imageFilename, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("[AI Blog] Inline image upload error:", uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(imageFilename);
    return urlData.publicUrl;
  } catch (error) {
    console.error("[AI Blog] Inline image error:", error);
    return null;
  }
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

    // Step 2: Generate article with Lovable AI - WILLFLOW FOCUSED
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
O teu objetivo é criar artigos que IDENTIFICAM PROBLEMAS REAIS do setor e apresentam soluções, posicionando o WillFlow como a ferramenta que resolve esses problemas.

WillFlow é um software de gestão de projetos para fotógrafos e filmmakers que oferece:
- Gestão de projetos com Kanban visual
- Controlo financeiro (receitas, custos, margens)
- Gestão de clientes e CRM
- Calendário integrado
- Dashboard com KPIs
- Gestão de equipa e colaboradores

REGRAS DE CONTEÚDO:
1. Começa sempre com uma FRUSTRAÇÃO/PROBLEMA real do setor
2. Desenvolve o problema mostrando o impacto negativo
3. Apresenta soluções naturais, com WillFlow como exemplo concreto
4. Menciona WillFlow pelo menos 2-3x de forma NATURAL (não promocional)
5. Termina sempre com um CTA para experimentar o WillFlow

REGRAS DE ESCRITA OBRIGATÓRIAS:
- NUNCA uses travessões longos (— ou –), usa vírgulas ou pontos
- NUNCA uses aspas especiais (" "), usa aspas normais (" ")
- Escreve frases diretas e concisas
- Evita construções com travessões como "gestão — algo complexo —"`,
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

3. **Conteúdo (1200-1800 palavras):**
   
   ESTRUTURA OBRIGATÓRIA:
   
   A) **GANCHO INICIAL (problema):**
   - Começa com uma pergunta ou situação frustrante que os fotógrafos/filmmakers conhecem bem
   - Ex: "Já te aconteceu perder horas à procura de faturas antigas?" ou "Quantas vezes perdeste um cliente por não responder a tempo?"
   
   B) **DESENVOLVIMENTO DO PROBLEMA:**
   - 2-3 parágrafos explorando o impacto negativo do problema
   - Dados ou exemplos concretos quando possível
   
   C) **SCREENSHOTS DO WILLFLOW (OBRIGATÓRIO - incluir 2-3):**
   Inclui screenshots REAIS do WillFlow para mostrar a interface. Usa estas imagens:
   
   <figure class="my-8 rounded-xl overflow-hidden shadow-lg border">
     <img src="[SCREENSHOT_PLACEHOLDER]" alt="Descrição da imagem" class="w-full" />
     <figcaption class="text-sm text-muted-foreground text-center py-3 px-4 bg-muted/30">
       Legenda descritiva
     </figcaption>
   </figure>
   
   **PLACEHOLDERS DISPONÍVEIS (escolhe 2-3 mais relevantes para o tema):**
   
   DASHBOARDS E VISÃO GERAL:
   - [SCREENSHOT_DASHBOARD] - Dashboard dark mode com KPIs e métricas
   - [SCREENSHOT_DASHBOARD_LIGHT] - Dashboard modo claro
   
   GESTÃO DE PROJETOS:
   - [SCREENSHOT_KANBAN] - Quadro Kanban visual para gestão de projetos
   
   CALENDÁRIO E AGENDA:
   - [SCREENSHOT_CALENDAR] - Calendário completo com sessões e entregas
   
   FINANÇAS E PAGAMENTOS:
   - [SCREENSHOT_PAYMENTS] - Controlo de pagamentos e faturação
   - [SCREENSHOT_RELATORIOS] - Relatórios financeiros e análises
   
   EQUIPA E CONFIGURAÇÕES:
   - [SCREENSHOT_PERMISSOES] - Gestão de permissões da equipa
   - [SCREENSHOT_CONTA] - Página de planos e subscrição
   
   ONBOARDING:
   - [SCREENSHOT_ONBOARDING] - Processo de setup inicial
   
   **REGRAS PARA SCREENSHOTS:**
   - Escolhe 2-3 screenshots mais relevantes para o PROBLEMA discutido no artigo
   - Se o artigo fala de organização, usa Kanban ou Dashboard
   - Se fala de dinheiro/finanças, usa Payments ou Relatórios
   - Se fala de equipa, usa Permissões
   - Distribui os screenshots ao longo do artigo, não todos juntos
   
   D) **IMAGENS INLINE GERADAS (opcional 1-2):**
   Podes incluir placeholders para imagens geradas por AI:
   
   <figure class="my-8 rounded-xl overflow-hidden shadow-lg border">
     <img src="[INLINE_IMAGE_1]" alt="Descrição detalhada da imagem" class="w-full" />
     <figcaption class="text-sm text-muted-foreground text-center py-3 px-4 bg-muted/30">
       Legenda descritiva
     </figcaption>
   </figure>
   
   E) **SOLUÇÕES E WILLFLOW:**
   - Apresenta soluções práticas para o problema
   - Menciona o WillFlow como exemplo concreto de solução
   - Mostra benefícios específicos (ex: "Com o WillFlow, encontras qualquer projeto em segundos")
   
   F) **CTA FINAL (OBRIGATÓRIO):**
   
   <div class="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6 my-8">
     <div class="flex items-start gap-4">
       <div class="p-3 rounded-lg bg-primary/20">
         <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
         </svg>
       </div>
       <div class="flex-1">
         <h3 class="text-xl font-semibold mb-2">🚀 Experimenta o WillFlow Gratuitamente</h3>
         <p class="text-muted-foreground mb-4">
           Descobre como o WillFlow pode transformar a gestão do teu estúdio. Organiza projetos, controla finanças e foca-te no que realmente importa: criar.
         </p>
         <a href="/auth?trial=true" class="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity shadow-lg">
           Começar Teste Grátis
           <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
           </svg>
         </a>
       </div>
     </div>
   </div>
   
   FORMATAÇÃO HTML OBRIGATÓRIA:
   <h2 class="text-2xl font-bold mt-10 mb-4 text-foreground">Título da Secção</h2>
   <h3 class="text-xl font-semibold mt-8 mb-3 text-foreground">Subtítulo</h3>
   <p class="mb-4 leading-relaxed text-muted-foreground">Parágrafo...</p>
   <ul class="list-disc pl-6 mb-6 space-y-2">
     <li class="text-muted-foreground">Item da lista</li>
   </ul>
   <blockquote class="border-l-4 border-primary pl-6 py-2 my-8 bg-muted/30 rounded-r-lg">
     <p class="italic text-foreground">"Citação impactante..."</p>
   </blockquote>
   <strong class="font-semibold text-foreground">Texto destacado</strong>

4. **Categoria:** Uma de: novidades, tutorial, comparacao, dicas (preferência: ${categoryHint})

Responde APENAS em JSON válido:
{
  "title": "Título do artigo (max 70 chars)",
  "excerpt": "Excerpt para preview (max 160 chars)",
  "content": "<article>HTML do conteúdo completo</article>",
  "category": "novidades|tutorial|comparacao|dicas",
  "inlineImages": [
    {"placeholder": "[INLINE_IMAGE_1]", "description": "Descrição do que a imagem deve mostrar"},
    {"placeholder": "[INLINE_IMAGE_2]", "description": "Descrição do que a imagem deve mostrar"}
  ]
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
    let article: { 
      title: string; 
      excerpt: string; 
      content: string; 
      category: string;
      inlineImages?: Array<{ placeholder: string; description: string }>;
    };
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

    // Step 3: Replace screenshot placeholders with real WillFlow screenshots
    console.log("[AI Blog] Replacing screenshot placeholders...");
    
    let processedContent = article.content;
    
    // Real WillFlow screenshot URLs from the published app - expanded library
    const screenshotUrls: Record<string, string> = {
      // Dashboards
      '[SCREENSHOT_DASHBOARD]': 'https://willflows.lovable.app/screenshots/screenshot-dashboard-dark-full.png',
      '[SCREENSHOT_DASHBOARD_LIGHT]': 'https://willflows.lovable.app/screenshots/screenshot-dashboard-light-full.png',
      
      // Gestão de Projetos
      '[SCREENSHOT_KANBAN]': 'https://willflows.lovable.app/assets/screenshot-dark-kanban.png',
      
      // Calendário
      '[SCREENSHOT_CALENDAR]': 'https://willflows.lovable.app/screenshots/screenshot-calendario-full.png',
      
      // Finanças
      '[SCREENSHOT_PAYMENTS]': 'https://willflows.lovable.app/screenshots/screenshot-pagamentos.png',
      '[SCREENSHOT_RELATORIOS]': 'https://willflows.lovable.app/screenshots/screenshot-relatorios-6m.png',
      
      // Equipa e Configurações  
      '[SCREENSHOT_PERMISSOES]': 'https://willflows.lovable.app/screenshots/screenshot-permissoes.png',
      '[SCREENSHOT_CONTA]': 'https://willflows.lovable.app/screenshots/screenshot-conta-planos.png',
      
      // Onboarding
      '[SCREENSHOT_ONBOARDING]': 'https://willflows.lovable.app/screenshots/screenshot-onboarding-regiao.png',
    };
    
    // Replace all screenshot placeholders with real URLs
    for (const [placeholder, url] of Object.entries(screenshotUrls)) {
      const escapedPlaceholder = placeholder.replace(/[[\]]/g, '\\$&');
      processedContent = processedContent.replace(new RegExp(escapedPlaceholder, 'g'), url);
    }
    
    // Clean up any remaining dashes from AI generation
    processedContent = processedContent
      .replace(/—/g, ',')
      .replace(/–/g, '-')
      .replace(/"/g, '"')
      .replace(/"/g, '"')
      .replace(/'/g, "'")
      .replace(/'/g, "'");
    
    // Step 4: Generate inline images and replace placeholders
    console.log("[AI Blog] Gerando imagens inline...");
    
    // Extract image placeholders from content
    const imagePlaceholders = processedContent.match(/\[INLINE_IMAGE_\d+\]/g) || [];
    
    for (const placeholder of imagePlaceholders) {
      // Try to get description from the article's inlineImages array or from alt text
      let imageDescription = "";
      
      // First check if we have it in the inlineImages array
      const inlineImageInfo = article.inlineImages?.find(img => img.placeholder === placeholder);
      if (inlineImageInfo) {
        imageDescription = inlineImageInfo.description;
      } else {
        // Try to extract from alt text in the content
        const altMatch = processedContent.match(new RegExp(`<img[^>]*src="${placeholder.replace(/[[\]]/g, '\\$&')}"[^>]*alt="([^"]+)"`));
        imageDescription = altMatch?.[1] || article.title;
      }
      
      console.log(`[AI Blog] Generating inline image: ${placeholder} - ${imageDescription.substring(0, 50)}...`);
      
      const inlineImageUrl = await generateInlineImage(supabase, lovableApiKey, imageDescription, baseSlug);
      
      if (inlineImageUrl) {
        processedContent = processedContent.replace(placeholder, inlineImageUrl);
        console.log(`[AI Blog] Inline image generated: ${placeholder}`);
      } else {
        // Remove the figure element if image generation failed
        const figureRegex = new RegExp(`<figure[^>]*>[\\s\\S]*?${placeholder.replace(/[[\]]/g, '\\$&')}[\\s\\S]*?</figure>`, 'g');
        processedContent = processedContent.replace(figureRegex, '');
        console.log(`[AI Blog] Inline image failed, removed placeholder: ${placeholder}`);
      }
    }

    // Step 4: Generate cover image
    console.log("[AI Blog] Gerando imagem de capa...");

    let coverImageUrl: string | null = null;

    try {
      const imagePrompt = `Create a professional PHOTOGRAPH for a blog article header.

ARTICLE TITLE: ${article.title}

CRITICAL STYLE REQUIREMENTS:
- Professional PHOTOGRAPHY style, NOT illustration
- Real-world scenes: cameras, studios, editing rooms, creative professionals at work
- Natural lighting, high-quality DSLR aesthetic with depth of field
- Clean, modern composition
- Subtle purple/violet color grading (#7C3AED tones)
- 16:9 landscape aspect ratio
- Editorial quality like Getty Images or Unsplash
- NO text, NO logos, NO watermarks`;

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
          const imageTimestamp = Date.now();
          const imageFilename = `covers/${baseSlug}-${imageTimestamp}.png`;

          let uploadSuccess = false;
          for (let attempt = 0; attempt < 3 && !uploadSuccess; attempt++) {
            if (attempt > 0) {
              console.log(`[AI Blog] Retry upload attempt ${attempt + 1}...`);
              await new Promise((r) => setTimeout(r, 1000 * attempt));
            }

            const { error: uploadError } = await supabase.storage
              .from("blog-images")
              .upload(imageFilename, imageBytes, {
                contentType: "image/png",
                upsert: true,
              });

            if (!uploadError) {
              const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(imageFilename);
              coverImageUrl = urlData.publicUrl;
              console.log("[AI Blog] Imagem uploaded:", coverImageUrl);
              uploadSuccess = true;
            } else {
              console.error(`[AI Blog] Erro upload (attempt ${attempt + 1}):`, uploadError.message);
            }
          }
        }
      } else {
        console.log("[AI Blog] Imagem não gerada:", await imageResponse.text());
      }
    } catch (imgError) {
      console.error("[AI Blog] Erro ao gerar imagem:", imgError);
      // Continue without image
    }

    // Save to database
    console.log("[AI Blog] Guardando artigo na base de dados...");
    
    const { data: post, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        title: article.title.substring(0, 200),
        slug,
        excerpt: article.excerpt?.substring(0, 300) || null,
        content: processedContent,
        cover_image: coverImageUrl,
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
      hasImage: !!coverImageUrl,
      hasInlineImages: imagePlaceholders.length > 0,
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
