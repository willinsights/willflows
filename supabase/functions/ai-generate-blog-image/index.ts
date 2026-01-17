import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateImageRequest {
  postId: string;
  title: string;
  forceRegenerate?: boolean;
  context?: string; // Additional context for inline images
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
    const body: GenerateImageRequest = await req.json();
    const { postId, title, forceRegenerate = false, context } = body;

    if (!postId || !title) {
      return new Response(JSON.stringify({ error: "postId e title são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[AI Blog Image] Gerando imagem para artigo ${postId}`);

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from("blog_posts")
      .select("id, slug, cover_image")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return new Response(JSON.stringify({ error: "Artigo não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already has image and not forcing regeneration
    if (post.cover_image && !forceRegenerate) {
      return new Response(JSON.stringify({ 
        success: true, 
        imageUrl: post.cover_image,
        message: "Imagem já existe" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Lovable API key
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "Lovable AI não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate image with Lovable AI - REALISTIC PHOTOGRAPHY STYLE
    console.log("[AI Blog Image] Chamando Lovable AI para gerar imagem realista...");
    
    const imagePrompt = `Create a professional PHOTOGRAPH for a blog article about the photography and video production industry.

ARTICLE TITLE: "${title}"
${context ? `CONTEXT: ${context}` : ""}

CRITICAL STYLE REQUIREMENTS - MUST FOLLOW:
- Professional PHOTOGRAPHY style, NOT illustration, NOT abstract art
- Real-world scenes that a professional photographer would capture
- REALISTIC subjects: cameras, lenses, studio equipment, editing workstations, creative professionals at work, studio environments, film sets
- Natural lighting with professional quality - think Getty Images or Unsplash editorial
- High-quality DSLR aesthetic with depth of field and bokeh effects
- Clean, modern composition with rule of thirds
- Authentic, documentary-style feel

TECHNICAL SPECIFICATIONS:
- 16:9 landscape aspect ratio
- Editorial quality photography
- Subtle purple/violet color grading matching brand (#7C3AED tones in highlights or accents)
- Professional color correction
- Sharp focus on main subject

ABSOLUTELY NO:
- Text, logos, watermarks, or words
- Cartoon or illustration style
- Abstract shapes or patterns
- AI-looking generated faces
- Overly stylized or unrealistic colors

Think: A professional stock photo that would appear in Adobe Creative Cloud marketing or a photography magazine cover.`;

    const imageResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: imagePrompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("[AI Blog Image] Erro Lovable AI:", imageResponse.status, errorText);
      
      if (imageResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de pedidos AI excedido" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (imageResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos Lovable AI esgotados" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Erro na geração da imagem" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageData = await imageResponse.json();
    const generatedImageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl || !generatedImageUrl.startsWith("data:image")) {
      console.error("[AI Blog Image] Imagem não gerada corretamente");
      return new Response(JSON.stringify({ error: "Falha na geração da imagem" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[AI Blog Image] Imagem gerada, fazendo upload...");

    // Extract base64 data and decode
    const base64Match = generatedImageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return new Response(JSON.stringify({ error: "Formato de imagem inválido" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageFormat = base64Match[1];
    const base64Data = base64Match[2];
    const imageBytes = decode(base64Data);

    // Generate filename
    const filename = `${post.slug || postId}-${Date.now()}.${imageFormat}`;
    const filePath = `covers/${filename}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("blog-images")
      .upload(filePath, imageBytes, {
        contentType: `image/${imageFormat}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("[AI Blog Image] Erro ao fazer upload:", uploadError);
      return new Response(JSON.stringify({ error: "Erro ao guardar imagem" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from("blog-images")
      .getPublicUrl(filePath);

    const imageUrl = publicUrl.publicUrl;
    console.log("[AI Blog Image] Imagem guardada:", imageUrl);

    // Update blog post with image URL
    const { error: updateError } = await supabase
      .from("blog_posts")
      .update({ cover_image: imageUrl })
      .eq("id", postId);

    if (updateError) {
      console.error("[AI Blog Image] Erro ao atualizar artigo:", updateError);
      return new Response(JSON.stringify({ error: "Erro ao atualizar artigo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[AI Blog Image] Sucesso! Imagem adicionada ao artigo ${postId}`);

    return new Response(JSON.stringify({
      success: true,
      imageUrl,
      postId,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[AI Blog Image] Erro não tratado:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
