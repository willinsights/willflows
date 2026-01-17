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
  imageHint?: string;
}

// Helper function to select relevant screenshots based on article topic
function selectRelevantScreenshots(title: string, summary: string): string[] {
  const content = `${title} ${summary}`.toLowerCase();
  const selected: string[] = [];
  
  // Finanças, dinheiro, receitas, custos, lucro
  if (content.match(/finan|dinheiro|receita|custo|lucro|margem|fatur|pagamento|orçamento|preço|budget|money|revenue/)) {
    selected.push('[SCREENSHOT_PAYMENTS]', '[SCREENSHOT_RELATORIOS]', '[SCREENSHOT_PAGAMENTOS_ESTUDIO]');
  }
  
  // Organização, projetos, gestão, kanban
  if (content.match(/organiz|projeto|gestão|kanban|tarefa|prazo|entrega|cliente|workflow|deadline|project/)) {
    selected.push('[SCREENSHOT_KANBAN]', '[SCREENSHOT_KANBAN_FULL]', '[SCREENSHOT_PROJETO_MODAL]');
  }
  
  // Agenda, calendário, sessão, marcação
  if (content.match(/calendário|agenda|sessão|marcação|data|horário|tempo|schedule|booking|appointment/)) {
    selected.push('[SCREENSHOT_CALENDAR]');
  }
  
  // Equipa, colaboradores, permissões
  if (content.match(/equipa|colaborador|permiss|staff|freelancer|team|hire|contrat/)) {
    selected.push('[SCREENSHOT_PERMISSOES]');
  }
  
  // Dashboard, métricas, KPIs, visão geral
  if (content.match(/dashboard|métrica|kpi|visão|overview|resumo|performance|analytics/)) {
    selected.push('[SCREENSHOT_DASHBOARD]', '[SCREENSHOT_DASHBOARD_ESTUDIO]');
  }
  
  // Captação, sessões fotográficas
  if (content.match(/captação|sessão|fotografia|filmagem|set|produção|shoot|production/)) {
    selected.push('[SCREENSHOT_CAPTACAO_ESTUDIO]');
  }
  
  // Se não encontrou nada específico, usar os mais genéricos
  if (selected.length === 0) {
    selected.push('[SCREENSHOT_DASHBOARD]', '[SCREENSHOT_KANBAN]');
  }
  
  // Remover duplicados e limitar a 3 screenshots
  return [...new Set(selected)].slice(0, 3);
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
    console.log(`[AI Blog] Tópicos fornecidos: ${topics.join(", ") || "auto-discover"}`);

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

    // Step 0: Get recent article titles to avoid repetition
    const { data: recentPosts } = await supabase
      .from("blog_posts")
      .select("title")
      .order("created_at", { ascending: false })
      .limit(15);
    
    const recentTitles = recentPosts?.map(p => p.title.toLowerCase()) || [];
    console.log(`[AI Blog] Found ${recentTitles.length} recent articles to avoid repetition`);

    // Step 1: Discover TRENDING topics from current news with Perplexity
    console.log("[AI Blog] Discovering trending topics from current news...");
    
    const trendingDiscoveryQuery = `Pesquisa as NOTÍCIAS MAIS FALADAS DAS ÚLTIMAS 24-48 HORAS no mundo da fotografia e produção de vídeo profissional.

FONTES A VERIFICAR:
- Petapixel, DPReview, Fstoppers (notícias fotografia)
- No Film School, Filmmaker Magazine (cinema/video)
- Tecnologia em geral que afete criativos
- Lançamentos de produtos (Sony, Canon, Nikon, DJI, Blackmagic, Apple)
- Eventos ou acontecimentos relevantes (festivais, premiações, exposições)
- Redes sociais: trends virais relacionados com fotografia/video

TIPOS DE NOTÍCIAS A PRIORIZAR:
1. 🔥 LANÇAMENTOS - Novas câmaras, lentes, drones, software
2. 📰 POLÉMICAS - Controvérsias, escândalos, debates no setor
3. 🏆 EVENTOS - Óscares, festivais de cinema, exposições de fotografia
4. 💡 TENDÊNCIAS - IA em fotografia, novas técnicas, mudanças no mercado
5. 💰 NEGÓCIOS - Aquisições, encerramentos, novos serviços

NÃO SUGERIR temas semelhantes a estes artigos recentes:
${recentTitles.slice(0, 5).map(t => `- ${t}`).join("\n")}

Retorna APENAS JSON válido com as 5 tendências mais quentes:
{
  "trends": [
    {
      "topic": "Nome curto do tema/notícia",
      "headline": "O que aconteceu (2-3 frases com factos concretos)",
      "why_hot": "Porque é trending agora (o que gerou buzz)",
      "angle": "Ângulo interessante para artigo (como conectar com fotógrafos/filmmakers PT/BR)",
      "urgency": "high|medium|low",
      "keywords": ["palavra1", "palavra2", "palavra3"],
      "image_hint": "Sugestão de imagem para o artigo (ex: foto do produto, still do filme, etc.)"
    }
  ]
}`;

    let selectedNews: PerplexityResult & { imageHint?: string };
    let citations: string[] = [];

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
            content: "És um analista de tendências especializado em fotografia e produção de vídeo profissional. Identificas as notícias mais quentes do momento e sabes como as conectar com o dia-a-dia de fotógrafos e filmmakers. Respondes sempre em português europeu (pt-PT) e em JSON válido.",
          },
          {
            role: "user",
            content: topics.length > 0 
              ? `Pesquisa notícias trending sobre estes tópicos específicos: ${topics.join(", ")}\n\n${trendingDiscoveryQuery}`
              : trendingDiscoveryQuery,
          },
        ],
        search_recency_filter: "day", // Only last 24 hours for maximum freshness
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
    citations = perplexityData.citations || [];
    
    console.log("[AI Blog] Trending topics response received");

    // Parse trending topics and select the best one
    try {
      const jsonMatch = newsContent.match(/\{[\s\S]*"trends"[\s\S]*\}/);
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
        
        console.log(`[AI Blog] Found ${trends.length} trends, ${freshTrends.length} are fresh (not recently covered)`);
        
        // Select the most urgent fresh topic
        const highUrgency = freshTrends.find((t: any) => t.urgency === "high");
        const mediumUrgency = freshTrends.find((t: any) => t.urgency === "medium");
        const selected = highUrgency || mediumUrgency || freshTrends[0] || trends[0];
        
        if (selected) {
          selectedNews = {
            title: selected.topic,
            summary: `${selected.headline}\n\n${selected.why_hot}`,
            relevance: selected.angle,
            imageHint: selected.image_hint,
          };
          console.log(`[AI Blog] Selected trending topic: "${selected.topic}" (urgency: ${selected.urgency})`);
        } else {
          throw new Error("No valid trends found");
        }
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (e) {
      console.warn("[AI Blog] Error parsing trending topics, using raw content as fallback");
      selectedNews = { 
        title: "Novidades no Mundo da Fotografia e Vídeo", 
        summary: newsContent.substring(0, 600),
        relevance: "Tendências atuais relevantes para profissionais criativos"
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
            content: `És um MESTRE em content marketing que transforma QUALQUER notícia viral em conteúdo irresistível para fotógrafos e filmmakers portugueses.

REGRA DE OURO: Não importa o tema trending (futebol, celebridades, tecnologia, filmes, política), tu SEMPRE encontras um ângulo criativo para conectar com:
1. Os desafios diários de fotógrafos/filmmakers
2. Como o WillFlow resolve esses desafios

EXEMPLOS DE CONEXÕES CRIATIVAS:
- Notícia: "Vini Jr ganha Bola de Ouro" → Artigo: "O Que a Vitória de Vini Jr Ensina Sobre Gestão de Imagem para Fotógrafos" (fala sobre branding, consistência, ter um sistema)
- Notícia: "Virginia atinge 50M seguidores" → Artigo: "Como Virginia Construiu um Império Visual (E O Que Podes Aprender)" (produção consistente, gestão de equipa)
- Notícia: "iPhone 16 com novas câmaras" → Artigo: "iPhone 16: Ameaça ou Oportunidade para Fotógrafos?" (diferencial é o serviço, não a câmara)
- Notícia: "Filme X ganha Oscar de Fotografia" → Artigo: "5 Lições de Cinematografia do Oscar que Podes Aplicar Hoje"

O objetivo é ATRAIR leitores com temas que já estão a pesquisar, depois CONVERTER mostrando como o WillFlow ajuda.

WillFlow é um software de gestão de projetos para fotógrafos e filmmakers que oferece:
- Gestão de projetos com Kanban visual
- Controlo financeiro (receitas, custos, margens)
- Gestão de clientes e CRM
- Calendário integrado
- Dashboard com KPIs
- Gestão de equipa e colaboradores

REGRAS DE CONTEÚDO:
1. Começa SEMPRE conectando a notícia viral com uma FRUSTRAÇÃO real do setor
2. Desenvolve mostrando paralelos entre o tema trending e o dia-a-dia de fotógrafos
3. Apresenta soluções naturais, com WillFlow como exemplo concreto
4. Menciona WillFlow 2-3x de forma NATURAL (nunca forçada ou promocional)
5. Termina com CTA para experimentar o WillFlow

IMPORTANTE: O artigo NUNCA deve parecer uma venda forçada. O WillFlow aparece naturalmente como exemplo/solução.

REGRAS DE ESCRITA OBRIGATÓRIAS:
- NUNCA uses travessões longos (— ou –), usa vírgulas ou pontos
- NUNCA uses aspas especiais (" "), usa aspas normais (" ")
- Escreve frases diretas e concisas`,
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
   - [SCREENSHOT_DASHBOARD_ESTUDIO] - Dashboard completo de estúdio
   
   GESTÃO DE PROJETOS:
   - [SCREENSHOT_KANBAN] - Quadro Kanban visual para gestão de projetos
   - [SCREENSHOT_KANBAN_FULL] - Vista completa do Kanban com todos os projetos
   - [SCREENSHOT_PROJETO_MODAL] - Modal de detalhes de um projeto
   
   CALENDÁRIO E AGENDA:
   - [SCREENSHOT_CALENDAR] - Calendário completo com sessões e entregas
   
   FINANÇAS E PAGAMENTOS:
   - [SCREENSHOT_PAYMENTS] - Controlo de pagamentos e faturação
   - [SCREENSHOT_PAGAMENTOS_ESTUDIO] - Vista completa de pagamentos de estúdio
   - [SCREENSHOT_RELATORIOS] - Relatórios financeiros e análises
   
   CAPTAÇÃO:
   - [SCREENSHOT_CAPTACAO_ESTUDIO] - Gestão de captação e sessões fotográficas
   
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
    
    // Real WillFlow screenshot URLs from the published app - expanded library (15 total)
    const screenshotUrls: Record<string, string> = {
      // Dashboards
      '[SCREENSHOT_DASHBOARD]': 'https://willflows.lovable.app/screenshots/screenshot-dashboard-dark-full.png',
      '[SCREENSHOT_DASHBOARD_LIGHT]': 'https://willflows.lovable.app/screenshots/screenshot-dashboard-light-full.png',
      '[SCREENSHOT_DASHBOARD_ESTUDIO]': 'https://willflows.lovable.app/screenshots/screenshot-dashboard-estudio.png',
      
      // Gestão de Projetos
      '[SCREENSHOT_KANBAN]': 'https://willflows.lovable.app/assets/screenshot-dark-kanban.png',
      '[SCREENSHOT_KANBAN_FULL]': 'https://willflows.lovable.app/screenshots/screenshot-kanban-full.png',
      '[SCREENSHOT_PROJETO_MODAL]': 'https://willflows.lovable.app/screenshots/screenshot-projeto-modal.png',
      
      // Calendário
      '[SCREENSHOT_CALENDAR]': 'https://willflows.lovable.app/screenshots/screenshot-calendario-full.png',
      
      // Finanças
      '[SCREENSHOT_PAYMENTS]': 'https://willflows.lovable.app/screenshots/screenshot-pagamentos.png',
      '[SCREENSHOT_PAGAMENTOS_ESTUDIO]': 'https://willflows.lovable.app/screenshots/screenshot-pagamentos-estudio.png',
      '[SCREENSHOT_RELATORIOS]': 'https://willflows.lovable.app/screenshots/screenshot-relatorios-6m.png',
      
      // Captação
      '[SCREENSHOT_CAPTACAO_ESTUDIO]': 'https://willflows.lovable.app/screenshots/screenshot-captacao-estudio.png',
      
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

    // Step 4: Search for REAL cover image with Perplexity
    console.log("[AI Blog] Buscando imagem REAL da web via Perplexity...");

    let coverImageUrl: string | null = null;
    let coverImageCredit: string | null = null;
    let coverImageSource: string | null = null;

    try {
      // Use Perplexity to find a real image related to the article
      const imageSearchQuery = `Find a high-quality FREE stock photo for this blog article:

ARTICLE TITLE: "${article.title}"
${selectedNews.imageHint ? `CONTEXT/HINT: ${selectedNews.imageHint}` : ""}

SEARCH PRIORITY:
1. If the article mentions a FILM or MOVIE → find a promotional still or behind-the-scenes photo from that film
2. If the article mentions a PRODUCT (camera, lens, drone) → find an official product image
3. If the article mentions a PERSON/CELEBRITY → find a professional photo of that person
4. If the article mentions an EVENT (Oscar, festival) → find a photo from that event
5. Otherwise → find a professional photography/video production scene

REQUIREMENTS:
- Must be from Pexels, Unsplash, or Pixabay (FREE to use)
- Must be a DIRECT image URL ending in .jpg, .png, or .webp
- Must be high resolution (at least 1200px wide)
- Include photographer credit if available
- Prefer landscape orientation (16:9)

Return ONLY valid JSON:
{
  "imageUrl": "https://direct-url-to-image.jpg",
  "credit": "Photographer Name",
  "sourceUrl": "https://original-page-url",
  "sourceName": "Pexels|Unsplash|Pixabay"
}`;

      const perplexityImageResponse = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${perplexityApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            { role: "system", content: "You are an image search assistant. Find real, free-to-use stock photos. Return only valid JSON with direct image URLs." },
            { role: "user", content: imageSearchQuery }
          ],
        }),
      });

      if (perplexityImageResponse.ok) {
        const imageSearchData = await perplexityImageResponse.json();
        const imageSearchContent = imageSearchData.choices?.[0]?.message?.content || "";
        
        console.log("[AI Blog] Perplexity image search response received");
        
        // Parse JSON response
        const jsonMatch = imageSearchContent.match(/\{[\s\S]*"imageUrl"[\s\S]*\}/);
        if (jsonMatch) {
          const imageInfo = JSON.parse(jsonMatch[0]);
          
          if (imageInfo.imageUrl && imageInfo.imageUrl.startsWith("http")) {
            console.log(`[AI Blog] Found real image: ${imageInfo.imageUrl}`);
            
            // Download the image
            const imageDownloadResponse = await fetch(imageInfo.imageUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (compatible; WillFlow Blog/1.0)",
              },
            });
            
            if (imageDownloadResponse.ok) {
              const imageBuffer = await imageDownloadResponse.arrayBuffer();
              const imageBytes = new Uint8Array(imageBuffer);
              
              // Determine content type
              const contentType = imageDownloadResponse.headers.get("content-type") || "image/jpeg";
              const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
              
              // Upload to Supabase Storage
              const imageTimestamp = Date.now();
              const imageFilename = `covers/${baseSlug}-${imageTimestamp}.${extension}`;
              
              let uploadSuccess = false;
              for (let attempt = 0; attempt < 3 && !uploadSuccess; attempt++) {
                if (attempt > 0) {
                  console.log(`[AI Blog] Retry upload attempt ${attempt + 1}...`);
                  await new Promise((r) => setTimeout(r, 1000 * attempt));
                }
                
                const { error: uploadError } = await supabase.storage
                  .from("blog-images")
                  .upload(imageFilename, imageBytes, {
                    contentType,
                    upsert: true,
                  });
                
                if (!uploadError) {
                  const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(imageFilename);
                  coverImageUrl = urlData.publicUrl;
                  coverImageCredit = imageInfo.credit || null;
                  coverImageSource = imageInfo.sourceName || null;
                  console.log("[AI Blog] Real image uploaded:", coverImageUrl);
                  uploadSuccess = true;
                } else {
                  console.error(`[AI Blog] Upload error (attempt ${attempt + 1}):`, uploadError.message);
                }
              }
            } else {
              console.log("[AI Blog] Failed to download image:", imageDownloadResponse.status);
            }
          }
        }
      } else {
        console.log("[AI Blog] Perplexity image search failed:", perplexityImageResponse.status);
      }
    } catch (imgError) {
      console.error("[AI Blog] Error searching for real image:", imgError);
    }

    // Fallback: Generate image with AI if no real image found
    if (!coverImageUrl) {
      console.log("[AI Blog] No real image found, generating with AI as fallback...");
      
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

        const aiImageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

        if (aiImageResponse.ok) {
          const imageData = await aiImageResponse.json();
          const imageBase64 = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

          if (imageBase64 && imageBase64.startsWith("data:image")) {
            const base64Data = imageBase64.split(",")[1];
            const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

            const imageTimestamp = Date.now();
            const imageFilename = `covers/${baseSlug}-${imageTimestamp}.png`;

            const { error: uploadError } = await supabase.storage
              .from("blog-images")
              .upload(imageFilename, imageBytes, {
                contentType: "image/png",
                upsert: true,
              });

            if (!uploadError) {
              const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(imageFilename);
              coverImageUrl = urlData.publicUrl;
              console.log("[AI Blog] AI fallback image uploaded:", coverImageUrl);
            }
          }
        }
      } catch (fallbackError) {
        console.error("[AI Blog] AI fallback image error:", fallbackError);
      }
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
        cover_image_credit: coverImageCredit,
        cover_image_source: coverImageSource,
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
