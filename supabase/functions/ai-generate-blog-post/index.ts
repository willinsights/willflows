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

// Helper function to extract intelligent search terms for hero image
function extractImageSearchTerms(title: string, summary: string, imageHint?: string): string {
  const content = `${title} ${summary} ${imageHint || ''}`.toLowerCase();
  const terms: string[] = [];
  
  // SOFTWARE/APPS de edição - mapeamentos mais específicos
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
  
  // Brands and products to detect
  const brandMappings: Record<string, string[]> = {
    'apple': ['apple logo macbook', 'apple creative professional'],
    'adobe': ['adobe creative cloud', 'adobe lightroom photoshop'],
    'sony': ['sony camera alpha', 'sony mirrorless camera'],
    'canon': ['canon eos camera', 'canon professional photography'],
    'nikon': ['nikon camera dslr', 'nikon z mirrorless'],
    'dji': ['dji drone mavic', 'dji aerial photography'],
    'blackmagic': ['blackmagic camera cinema', 'davinci resolve editing'],
    'fujifilm': ['fujifilm x camera', 'fuji mirrorless professional'],
    'leica': ['leica camera photography', 'leica m rangefinder'],
    'panasonic': ['panasonic lumix camera', 'panasonic video'],
    'red': ['red cinema camera', 'red digital cinema'],
    'arri': ['arri camera cinema', 'arri alexa professional'],
  };
  
  // Check for brand mentions and add relevant terms
  for (const [brand, searchTerms] of Object.entries(brandMappings)) {
    if (content.includes(brand)) {
      terms.push(...searchTerms);
    }
  }
  
  // If Apple vs Adobe specifically
  if (content.includes('apple') && content.includes('adobe')) {
    return 'apple macbook adobe creative cloud software professional editing';
  }
  
  // Topic-based terms - mais específicos
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
  
  // Return combined terms or use title as fallback
  if (terms.length > 0) {
    return terms.slice(0, 3).join(' ');
  }
  
  // Fallback: usar o título do artigo de forma mais inteligente
  const cleanTitle = title
    .replace(/[?!:.,]/g, '')
    .replace(/como|para|que|com|uma|um|os|as|do|da|de|e|o|a/gi, '')
    .trim()
    .substring(0, 60);
  
  return `${cleanTitle} photography professional`;
}

// Helper function to select category based on content - IMPROVED VERSION
function selectCategoryFromContent(title: string, summary: string): string {
  const content = `${title} ${summary}`.toLowerCase();
  
  // Tutorial: guias passo-a-passo, como fazer, configurar
  if (content.match(/como fazer|passo.?a.?passo|guia completo|guia prático|tutorial|aprende a|configurar|setup|começar a|primeiros passos|instalar|criar o teu|monta o teu|definir|explicamos como/)) {
    return 'tutorial';
  }
  
  // Comparação: vs, melhor, diferenças, alternativas
  if (content.match(/\bvs\.?\b|versus|compar|melhor entre|diferença entre|alternativa|escolher entre|comparamos|frente a frente|\bou\b.*\?|x\s+vs|qual o melhor|qual escolher/)) {
    return 'comparacao';
  }
  
  // Dicas: estratégias, truques, erros, segredos, listas numeradas
  if (content.match(/\d+\s*(dicas?|truques?|erros?|segredos?|estratégia|maneiras?|formas?|razões|motivos)|conselho|melhora|optimiz|evita|não faças|como evitar|deixa de|para de|boas práticas/)) {
    return 'dicas';
  }
  
  // Novidades: lançamentos apenas quando há menção explícita
  if (content.match(/lança|anuncia|novidade|nova versão|update|atualiza|chega ao mercado|disponível|acabou de sair|release/)) {
    return 'novidades';
  }
  
  // Default: se não encaixa em nada específico, usar dicas (mais útil que novidades)
  return 'dicas';
}

// Helper function to select relevant screenshots and generate instructions
interface ScreenshotSelection {
  screenshots: string[];
  context: string;
  instruction: string;
}

function selectRelevantScreenshots(title: string, summary: string): ScreenshotSelection {
  const content = `${title} ${summary}`.toLowerCase();
  
  // FINANÇAS: custos, preços, lucro, margem, orçamento, subscricões
  if (content.match(/custo|preço|lucro|margem|orçamento|subscri|pagamento|fatura|dinheiro|money|revenue|budget|adobe.*custo|software.*preço/)) {
    return {
      screenshots: ['[SCREENSHOT_PAYMENTS]', '[SCREENSHOT_RELATORIOS]'],
      context: 'TEMA FINANCEIRO detectado',
      instruction: `
SCREENSHOTS OBRIGATÓRIOS para este artigo sobre FINANÇAS:
1. [SCREENSHOT_PAYMENTS] - Mostra esta imagem quando falares de controlo de custos, subscricões ou pagamentos
   → Legenda sugerida: "Painel de pagamentos do WillFlow: controla todas as tuas despesas e receitas"
   
2. [SCREENSHOT_RELATORIOS] - Mostra esta imagem quando falares de lucro, margem ou análise financeira
   → Legenda sugerida: "Relatórios financeiros: vê a margem real de cada projeto"

FUNCIONALIDADES WILLFLOW A DESTACAR:
- Registo de custos por projeto (incluindo subscricões de software)
- Cálculo automático de margem de lucro
- Dashboard com receitas vs custos mensais
- Alertas de pagamentos pendentes

EXEMPLO DE INTEGRAÇÃO NO TEXTO:
"Com ferramentas como o WillFlow, podes registar cada custo, incluindo subscricões de software como Adobe ou Final Cut, diretamente em cada projeto. O painel de relatórios mostra-te instantaneamente se a margem compensa o investimento."
`
    };
  }
  
  // ORGANIZAÇÃO: projetos, workflow, entregas, prazos, gestão
  if (content.match(/organiz|workflow|prazo|entrega|gestão|kanban|produtividade|tempo|deadline|project management/)) {
    return {
      screenshots: ['[SCREENSHOT_KANBAN]', '[SCREENSHOT_PROJETO_MODAL]'],
      context: 'TEMA ORGANIZAÇÃO detectado',
      instruction: `
SCREENSHOTS OBRIGATÓRIOS para este artigo sobre ORGANIZAÇÃO:
1. [SCREENSHOT_KANBAN] - Mostra esta imagem quando falares de visão geral de projetos ou workflow
   → Legenda sugerida: "Quadro Kanban do WillFlow: todos os projetos num só lugar"
   
2. [SCREENSHOT_PROJETO_MODAL] - Mostra esta imagem quando falares de detalhes de projeto
   → Legenda sugerida: "Detalhes de projeto: toda a informação organizada"

FUNCIONALIDADES WILLFLOW A DESTACAR:
- Quadro Kanban com colunas personalizáveis (Captação, Edição, Revisão, Entrega)
- Drag-and-drop para mover projetos entre fases
- Checklists para não esquecer etapas importantes
- Prazos e alertas automáticos

EXEMPLO DE INTEGRAÇÃO NO TEXTO:
"No WillFlow, cada projeto passa visualmente por colunas, desde a captação até à entrega. Num instante, vês o que está parado e porquê, eliminando aqueles emails de acompanhamento."
`
    };
  }
  
  // CALENDÁRIO: agenda, sessões, marcações
  if (content.match(/calendário|agenda|sessão|marcação|booking|schedule|appointment|horário/)) {
    return {
      screenshots: ['[SCREENSHOT_CALENDAR]', '[SCREENSHOT_KANBAN]'],
      context: 'TEMA AGENDA/CALENDÁRIO detectado',
      instruction: `
SCREENSHOTS OBRIGATÓRIOS para este artigo sobre AGENDA:
1. [SCREENSHOT_CALENDAR] - Mostra esta imagem quando falares de agendamento ou calendário
   → Legenda sugerida: "Calendário integrado: sessões, entregas e reuniões num só lugar"
   
2. [SCREENSHOT_KANBAN] - Mostra como complemento visual
   → Legenda sugerida: "Visão geral de todos os projetos ativos"

FUNCIONALIDADES WILLFLOW A DESTACAR:
- Calendário integrado com sessões fotográficas e entregas
- Sincronização com Google Calendar
- Cores por tipo de evento (sessão, entrega, reunião)
- Vista mensal e semanal

EXEMPLO DE INTEGRAÇÃO NO TEXTO:
"O WillFlow centraliza todas as tuas datas importantes: sessões marcadas, prazos de entrega e reuniões com clientes. Acabam-se os conflitos de agenda."
`
    };
  }
  
  // EQUIPA: colaboradores, freelancers, permissões
  if (content.match(/equipa|colaborador|freelancer|team|contrat|staff|permiss|hire/)) {
    return {
      screenshots: ['[SCREENSHOT_PERMISSOES]', '[SCREENSHOT_DASHBOARD_ESTUDIO]'],
      context: 'TEMA EQUIPA detectado',
      instruction: `
SCREENSHOTS OBRIGATÓRIOS para este artigo sobre EQUIPA:
1. [SCREENSHOT_PERMISSOES] - Mostra esta imagem quando falares de gestão de equipa ou permissões
   → Legenda sugerida: "Gestão de permissões: controla quem vê o quê"
   
2. [SCREENSHOT_DASHBOARD_ESTUDIO] - Mostra visão geral do estúdio
   → Legenda sugerida: "Dashboard de estúdio: métricas da equipa toda"

FUNCIONALIDADES WILLFLOW A DESTACAR:
- Diferentes níveis de permissão (admin, editor, visualizador)
- Atribuição de projetos a membros específicos
- Controlo de acesso a informação financeira
- Gestão de freelancers externos

EXEMPLO DE INTEGRAÇÃO NO TEXTO:
"Com o WillFlow, defines quem da equipa pode ver valores financeiros, quem edita projetos e quem apenas visualiza. Perfeito para estúdios com freelancers."
`
    };
  }
  
  // CAPTAÇÃO: sessões fotográficas, filmagens, produção
  if (content.match(/captação|sessão fotográfica|filmagem|set|produção|shoot|behind.?scene/)) {
    return {
      screenshots: ['[SCREENSHOT_CAPTACAO_ESTUDIO]', '[SCREENSHOT_CALENDAR]'],
      context: 'TEMA CAPTAÇÃO/PRODUÇÃO detectado',
      instruction: `
SCREENSHOTS OBRIGATÓRIOS para este artigo sobre CAPTAÇÃO:
1. [SCREENSHOT_CAPTACAO_ESTUDIO] - Mostra esta imagem quando falares de sessões ou produção
   → Legenda sugerida: "Gestão de captação: organiza cada sessão ao detalhe"
   
2. [SCREENSHOT_CALENDAR] - Mostra o calendário com sessões
   → Legenda sugerida: "Calendário de sessões: nunca mais duplas marcações"

FUNCIONALIDADES WILLFLOW A DESTACAR:
- Registo de data, hora e local da sessão
- Notas técnicas (equipamento, equipa necessária)
- Checklist pré-produção
- Histórico de cada captação

EXEMPLO DE INTEGRAÇÃO NO TEXTO:
"O WillFlow ajuda-te a planear cada detalhe da sessão: desde o equipamento necessário até às notas para o cliente, tudo fica registado."
`
    };
  }
  
  // MÉTRICAS: dashboard, KPIs, analytics
  if (content.match(/métrica|kpi|dashboard|analytics|performance|resultado|growth/)) {
    return {
      screenshots: ['[SCREENSHOT_DASHBOARD]', '[SCREENSHOT_RELATORIOS]'],
      context: 'TEMA MÉTRICAS/ANALYTICS detectado',
      instruction: `
SCREENSHOTS OBRIGATÓRIOS para este artigo sobre MÉTRICAS:
1. [SCREENSHOT_DASHBOARD] - Mostra esta imagem quando falares de visão geral ou KPIs
   → Legenda sugerida: "Dashboard WillFlow: todas as métricas importantes à vista"
   
2. [SCREENSHOT_RELATORIOS] - Mostra os relatórios detalhados
   → Legenda sugerida: "Relatórios: analisa tendências e crescimento"

FUNCIONALIDADES WILLFLOW A DESTACAR:
- Dashboard com KPIs em tempo real
- Gráficos de evolução mensal
- Comparativo com períodos anteriores
- Projetos por estado e valor

EXEMPLO DE INTEGRAÇÃO NO TEXTO:
"O dashboard do WillFlow mostra-te num instante: quantos projetos tens ativos, valor total em carteira, e a evolução comparada ao mês anterior."
`
    };
  }
  
  // DEFAULT: genérico
  return {
    screenshots: ['[SCREENSHOT_DASHBOARD]', '[SCREENSHOT_KANBAN]'],
    context: 'TEMA GERAL detectado',
    instruction: `
SCREENSHOTS SUGERIDOS para este artigo:
1. [SCREENSHOT_DASHBOARD] - Usa para mostrar visão geral do WillFlow
   → Legenda sugerida: "Dashboard WillFlow: gestão simplificada para criativos"
   
2. [SCREENSHOT_KANBAN] - Usa para mostrar organização de projetos
   → Legenda sugerida: "Quadro Kanban: visualiza todos os projetos"

FUNCIONALIDADES WILLFLOW A DESTACAR:
- Gestão visual de projetos
- Controlo financeiro integrado
- Calendário e prazos
- Interface intuitiva para criativos

EXEMPLO DE INTEGRAÇÃO NO TEXTO:
"O WillFlow foi criado especificamente para fotógrafos e filmmakers que querem menos tempo em gestão e mais tempo a criar."
`
  };
}

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

// Helper function to generate WillFlow feature briefing based on article theme
function generateWillFlowBriefing(title: string, summary: string): string {
  const content = `${title} ${summary}`.toLowerCase();
  
  if (content.match(/custo|preço|subscri|adobe|apple.*soft|software.*preço|licença|license/)) {
    return `
═══════════════════════════════════════════════════════════════
BRIEFING WILLFLOW - FOCO: CONTROLO DE CUSTOS E SOFTWARE
═══════════════════════════════════════════════════════════════

O artigo toca em CUSTOS DE SOFTWARE. Deves explicar como o WillFlow ajuda a:

1. REGISTAR CUSTOS POR PROJETO:
   - Cada subscricao (Adobe, Final Cut, etc) pode ser alocada aos projetos
   - Vês quanto gastas em software vs quanto recebes
   - Identificas se um projeto foi rentável após todos os custos

2. CALCULAR MARGEM REAL:
   - Dashboard mostra receitas menos custos
   - Relatórios por período (mensal, trimestral)
   - Comparativo: este mês vs mês passado

3. TOMAR DECISÕES INFORMADAS:
   - "Será que vale a pena pagar o Lightroom e o Capture One?"
   - "Quanto do meu lucro vai para subscricões?"
   - O WillFlow responde estas perguntas

FRASES NATURAIS PARA USAR:
- "Com o painel de pagamentos do WillFlow, registas cada custo incluindo subscricões mensais"
- "Os relatórios mostram-te a margem REAL depois de descontar todos os custos"
- "Finalmente, sabes se aquela subscricao cara compensa"
`;
  }
  
  if (content.match(/organiz|tempo|produtividade|workflow|caos|desorganiz/)) {
    return `
═══════════════════════════════════════════════════════════════
BRIEFING WILLFLOW - FOCO: ORGANIZAÇÃO E PRODUTIVIDADE
═══════════════════════════════════════════════════════════════

O artigo toca em ORGANIZAÇÃO. Deves explicar como o WillFlow ajuda a:

1. VISUALIZAR TUDO NUM SÓ LUGAR:
   - Quadro Kanban com todos os projetos
   - Colunas: Captação → Edição → Revisão → Entrega
   - Drag-and-drop para mover projetos

2. NUNCA ESQUECER NADA:
   - Checklists personalizáveis por projeto
   - Alertas de prazos próximos
   - Notas e comentários em cada projeto

3. POUPAR TEMPO:
   - Menos emails de acompanhamento
   - Informação centralizada
   - Templates de projeto reutilizáveis

FRASES NATURAIS PARA USAR:
- "No WillFlow, vês num instante o que está parado e porquê"
- "O quadro Kanban elimina aquela sensação de caos"
- "Com checklists automáticas, nunca mais esqueces uma etapa"
`;
  }
  
  if (content.match(/equipa|freelancer|colabor|contrat|team|escala/)) {
    return `
═══════════════════════════════════════════════════════════════
BRIEFING WILLFLOW - FOCO: GESTÃO DE EQUIPA
═══════════════════════════════════════════════════════════════

O artigo toca em EQUIPA. Deves explicar como o WillFlow ajuda a:

1. CONTROLAR PERMISSÕES:
   - Quem vê valores financeiros
   - Quem pode editar projetos
   - Quem apenas visualiza

2. ATRIBUIR PROJETOS:
   - Cada projeto tem responsável
   - Freelancers vêem só os seus projetos
   - Admin vê tudo

3. MANTER HISTÓRICO:
   - Quem fez o quê e quando
   - Comunicação registada
   - Sem perder contexto

FRASES NATURAIS PARA USAR:
- "Com o WillFlow, cada membro da equipa sabe exatamente o que lhe compete"
- "Define quem vê informação financeira, ideal para freelancers"
- "Histórico completo de cada projeto, mesmo quando a equipa muda"
`;
  }
  
  // Default briefing
  return `
═══════════════════════════════════════════════════════════════
BRIEFING WILLFLOW - GERAL
═══════════════════════════════════════════════════════════════

FUNCIONALIDADES PRINCIPAIS A MENCIONAR:
1. Gestão visual de projetos (Kanban)
2. Controlo financeiro (receitas, custos, margens)
3. Calendário integrado
4. Gestão de clientes

OBJETIVO: Mostrar que o WillFlow foi criado especificamente para fotógrafos 
e filmmakers, entendendo os desafios únicos da profissão.

FRASES NATURAIS PARA USAR:
- "O WillFlow foi pensado para criativos, não para contabilistas"
- "Menos tempo em gestão, mais tempo a criar"
- "Finalmente, um software que fala a tua língua"
`;
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

    // Step 2: Pre-analyze content and prepare contextual information
    console.log("[AI Blog] Analyzing content for contextual screenshots and briefing...");
    
    const screenshotSelection = selectRelevantScreenshots(selectedNews.title, selectedNews.summary);
    const willflowBriefing = generateWillFlowBriefing(selectedNews.title, selectedNews.summary);
    
    console.log(`[AI Blog] Screenshot context: ${screenshotSelection.context}`);
    console.log(`[AI Blog] Selected screenshots: ${screenshotSelection.screenshots.join(', ')}`);

    // Step 3: Generate article with Lovable AI - WILLFLOW FOCUSED
    console.log("[AI Blog] Gerando artigo com Lovable AI...");

    // Selecionar categoria baseada no conteúdo do artigo
    const categoryHint = category || selectCategoryFromContent(selectedNews.title, selectedNews.summary);
    
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
            content: `TU ÉS O GERADOR OFICIAL DE ARTIGOS DO BLOG DO WILLFLOW.

CONTEXTO DO BLOG:
- Produto: WillFlow (SaaS para fotógrafos e filmmakers) para gerir projetos, Kanban, calendário, tarefas, finanças, pagamentos, relatórios, permissões de equipa e planos.
- Objetivo: captar tráfego orgânico com temas atuais + converter leitores para testar o WillFlow (trial).
- Tom: moderno, direto, prático, com exemplos reais. Português neutro (PT-PT e BR-BR). Sem venda forçada.

REGRA #1 — ATUALIDADE (notícias)
Antes de escrever, considera tendências das últimas 24-72h em: fotografia e vídeo profissional, IA para edição/apps criativas, lançamentos (Apple/Adobe/Sony/Canon/DJI/Blackmagic), gestão/finanças/produtividade para criativos.

REGRA #2 — CATEGORIA (NÃO pode ser sempre "novidades")
Define UMA categoria correta entre:
- "novidades" (lançamento, update, anúncio, tendência)
- "comparacao" (X vs Y, alternativas, melhor escolha)
- "tutorial" (passo-a-passo, como fazer/configurar)
- "dicas" (boas práticas, erros comuns, estratégias)
A categoria TEM de ser coerente com o conteúdo.

REGRA #3 — ESTRUTURA DO ARTIGO
A escrita deve:
- Começar com hook forte (dor/curiosidade/atualidade)
- Explicar a notícia/tendência sem enrolar
- Ligar naturalmente aos problemas reais do freelancer (prazo, cliente, custo, lucro, caos)
- Mostrar "o que fazer agora" (passos práticos)
- Mencionar WillFlow de forma natural (ex: "um sistema como o WillFlow ajuda a...")
- Mencionar WillFlow 2-3x de forma NATURAL (nunca forçada ou promocional)

WillFlow oferece:
- Gestão de projetos com Kanban visual (colunas: Captação, Edição, Revisão, Entrega)
- Controlo financeiro (receitas, custos, margens, alertas de pagamentos)
- Gestão de clientes e CRM
- Calendário integrado com Google Calendar
- Dashboard com KPIs em tempo real
- Gestão de equipa e permissões (admin, editor, visualizador)

PROIBIDO:
- Prints aleatórios sem ligação ao texto
- Categoria sempre "novidades"
- CTA invisível/sem contraste
- Venda agressiva (parecer anúncio)

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

═══════════════════════════════════════════════════════════════
${willflowBriefing}
═══════════════════════════════════════════════════════════════

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
   
   C) **SCREENSHOTS DO WILLFLOW (OBRIGATÓRIO):**
   
${screenshotSelection.instruction}
   
   USA ESTE FORMATO PARA OS SCREENSHOTS:
   <figure class="my-8 rounded-xl overflow-hidden shadow-lg border">
     <img src="[SCREENSHOT_PLACEHOLDER]" alt="Descrição da imagem" class="w-full" />
     <figcaption class="text-sm text-muted-foreground text-center py-3 px-4 bg-muted/30">
       Legenda descritiva
     </figcaption>
   </figure>
   
   **PLACEHOLDERS QUE DEVES USAR NESTE ARTIGO:**
   ${screenshotSelection.screenshots.map(s => `- ${s}`).join('\n   ')}
   
   OUTROS PLACEHOLDERS DISPONÍVEIS (usar apenas se fizer sentido):
   - [SCREENSHOT_DASHBOARD] - Dashboard dark mode com KPIs e métricas
   - [SCREENSHOT_KANBAN] - Quadro Kanban visual para gestão de projetos
   - [SCREENSHOT_CALENDAR] - Calendário completo com sessões e entregas
   - [SCREENSHOT_PAYMENTS] - Controlo de pagamentos e faturação
   - [SCREENSHOT_RELATORIOS] - Relatórios financeiros e análises
   - [SCREENSHOT_PERMISSOES] - Gestão de permissões da equipa
   
   **REGRAS PARA SCREENSHOTS:**
   - USA OS SCREENSHOTS PRÉ-SELECIONADOS ACIMA (são os mais relevantes para este tema)
   - Distribui os screenshots ao longo do artigo, não todos juntos
   - Cada screenshot deve ter uma legenda contextualizada
   
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
   - USA AS FRASES E EXEMPLOS DO BRIEFING ACIMA
   
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
          <a href="/auth?trial=true" class="inline-flex items-center gap-2 bg-primary px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity shadow-lg no-underline" style="color: white !important;">
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
    
    // Replace all screenshot placeholders with real URLs (case-insensitive)
    for (const [placeholder, url] of Object.entries(screenshotUrls)) {
      const escapedPlaceholder = placeholder.replace(/[[\]]/g, '\\$&');
      // Substituição case-insensitive para capturar variações
      processedContent = processedContent.replace(new RegExp(escapedPlaceholder, 'gi'), url);
    }
    
    // Limpar placeholders órfãos que não foram substituídos
    processedContent = processedContent.replace(/\[SCREENSHOT_[A-Z_]+\]/gi, '');
    console.log("[AI Blog] Screenshots replaced, orphan placeholders cleaned");
    
    // Clean up any remaining dashes from AI generation
    processedContent = processedContent
      .replace(/—/g, ',')
      .replace(/–/g, '-')
      .replace(/"/g, '"')
      .replace(/"/g, '"')
      .replace(/'/g, "'")
      .replace(/'/g, "'");
    
    // Step 3.5: Insert promotional banners into content
    console.log("[AI Blog] Inserting promotional banners...");
    
    const selectedBanners = selectRelevantBanners(article.title, article.excerpt || selectedNews.summary);
    console.log(`[AI Blog] Selected ${selectedBanners.length} banners for article`);
    
    // Find insertion points - after ~40% and ~75% of content
    const contentParagraphs = processedContent.split('</p>');
    const totalParagraphs = contentParagraphs.length;
    
    if (totalParagraphs > 6 && selectedBanners.length >= 2) {
      // Insert first banner after ~40% of paragraphs
      const firstInsertPoint = Math.floor(totalParagraphs * 0.4);
      // Insert second banner after ~75% of paragraphs (before conclusion)
      const secondInsertPoint = Math.floor(totalParagraphs * 0.75);
      
      // Insert banners from end to start to preserve indices
      if (secondInsertPoint < contentParagraphs.length - 1) {
        contentParagraphs[secondInsertPoint] = contentParagraphs[secondInsertPoint] + '</p>' + generateBannerHtml(selectedBanners[1]);
      }
      
      if (firstInsertPoint < secondInsertPoint) {
        contentParagraphs[firstInsertPoint] = contentParagraphs[firstInsertPoint] + '</p>' + generateBannerHtml(selectedBanners[0]);
      }
      
      // Rejoin content (removing extra </p> we added)
      processedContent = contentParagraphs.join('</p>').replace(/<\/p><\/p>/g, '</p>');
      console.log("[AI Blog] Promotional banners inserted at positions", firstInsertPoint, "and", secondInsertPoint);
    } else if (totalParagraphs > 3 && selectedBanners.length >= 1) {
      // Shorter article - just insert one banner in the middle
      const insertPoint = Math.floor(totalParagraphs * 0.5);
      contentParagraphs[insertPoint] = contentParagraphs[insertPoint] + '</p>' + generateBannerHtml(selectedBanners[0]);
      processedContent = contentParagraphs.join('</p>').replace(/<\/p><\/p>/g, '</p>');
      console.log("[AI Blog] Single promotional banner inserted at position", insertPoint);
    }
    
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

    // Helper function to search for image with Perplexity
    async function searchImageWithPerplexity(searchTerms: string, articleTitle: string, imageHint?: string): Promise<{imageUrl: string; credit: string | null; sourceName: string | null} | null> {
      const imageSearchQuery = `Find a high-quality FREE stock photo for this blog article:

ARTICLE TITLE: "${articleTitle}"
SEARCH KEYWORDS: ${searchTerms}
${imageHint ? `CONTEXT/HINT: ${imageHint}` : ""}

SEARCH PRIORITY (in order):
1. If keywords mention APPLE + ADOBE → find image showing both logos, or creative professional using MacBook with Adobe apps
2. If keywords mention a specific CAMERA/PRODUCT (Sony A7, Canon R5) → find that exact product image
3. If keywords mention a FILM/MOVIE title → find promotional still or behind-the-scenes from that production
4. If keywords mention a PERSON (photographer, filmmaker name) → find professional photo of that person
5. If keywords mention an EVENT (Oscar, Cannes, PhotoPlus) → find photo from that specific event
6. For business/finance topics → find professional workspace, calculator, business meeting
7. For team/collaboration → find creative team working together
8. DEFAULT → find professional photographer or filmmaker at work with camera equipment

CRITICAL REQUIREMENTS:
- MUST be from Pexels, Unsplash, or Pixabay (FREE to use commercially)
- MUST be a DIRECT image URL (not a page URL)
- URL should be the actual image file, not an HTML page
- High resolution (at least 1200px wide)
- Landscape orientation preferred (16:9)
- Include photographer credit if available

Return ONLY valid JSON:
{
  "imageUrl": "https://direct-url-to-image.jpg",
  "credit": "Photographer Name",
  "sourceUrl": "https://original-page-url",
  "sourceName": "Pexels|Unsplash|Pixabay"
}`;

      try {
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

        if (!perplexityImageResponse.ok) {
          console.log(`[AI Blog] Perplexity search failed for "${searchTerms}":`, perplexityImageResponse.status);
          return null;
        }

        const imageSearchData = await perplexityImageResponse.json();
        const imageSearchContent = imageSearchData.choices?.[0]?.message?.content || "";
        
        const jsonMatch = imageSearchContent.match(/\{[\s\S]*"imageUrl"[\s\S]*\}/);
        if (!jsonMatch) return null;
        
        const imageInfo = JSON.parse(jsonMatch[0]);
        if (!imageInfo.imageUrl || !imageInfo.imageUrl.startsWith("http")) return null;
        
        return {
          imageUrl: imageInfo.imageUrl,
          credit: imageInfo.credit || null,
          sourceName: imageInfo.sourceName || null
        };
      } catch (e) {
        console.error(`[AI Blog] Error in image search for "${searchTerms}":`, e);
        return null;
      }
    }

    try {
      // Generate intelligent search terms based on article content
      const smartSearchTerms = extractImageSearchTerms(article.title, article.excerpt || selectedNews.summary, selectedNews.imageHint);
      console.log(`[AI Blog] Smart image search terms: "${smartSearchTerms}"`);

      // REGRA #3 - 3 tentativas com termos alternativos
      const searchAttempts = [
        smartSearchTerms,
        `${article.title} photography professional high quality`,
        `creative professional ${selectedNews.imageHint || 'photographer'} studio camera`
      ];

      let imageInfo: {imageUrl: string; credit: string | null; sourceName: string | null} | null = null;

      for (let attemptNum = 0; attemptNum < searchAttempts.length && !imageInfo; attemptNum++) {
        const currentTerms = searchAttempts[attemptNum];
        console.log(`[AI Blog] Image search attempt ${attemptNum + 1}/3: "${currentTerms}"`);
        
        imageInfo = await searchImageWithPerplexity(currentTerms, article.title, selectedNews.imageHint);
        
        if (imageInfo) {
          console.log(`[AI Blog] Found image on attempt ${attemptNum + 1}`);
        }
      }

      if (imageInfo) {
        console.log(`[AI Blog] Downloading real image: ${imageInfo.imageUrl}`);
        
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
              coverImageCredit = imageInfo.credit;
              coverImageSource = imageInfo.sourceName;
              console.log("[AI Blog] Real image uploaded:", coverImageUrl);
              uploadSuccess = true;
            } else {
              console.error(`[AI Blog] Upload error (attempt ${attempt + 1}):`, uploadError.message);
            }
          }
        } else {
          console.log("[AI Blog] Failed to download image:", imageDownloadResponse.status);
        }
      } else {
        console.log("[AI Blog] No real image found after 3 attempts");
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
