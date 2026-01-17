import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateImageRequest {
  postId: string;
  title: string;
  forceRegenerate?: boolean;
  context?: string;
}

interface ImageSearchResult {
  imageUrl: string;
  credit: string;
  sourceUrl: string;
  sourceName: string;
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

    console.log(`[AI Blog Image] Buscando imagem para artigo ${postId}`);

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

    // Get API keys
    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!perplexityApiKey) {
      console.error("[AI Blog Image] PERPLEXITY_API_KEY não configurada");
      return new Response(JSON.stringify({ error: "Perplexity API não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Use Perplexity to find relevant image from free stock sites
    console.log("[AI Blog Image] Buscando imagem na web com Perplexity...");

    const searchQuery = `Find a high-quality FREE stock photo that matches this blog article title: "${title}"
${context ? `Additional context: ${context}` : ""}

SEARCH REQUIREMENTS:
1. The photo must be from a FREE source: Pexels, Unsplash, or Pixabay
2. Must be relevant to photography, video production, filmmaking, or creative work
3. Must be a DIRECT link to the image file (ending in .jpg, .jpeg, .png, or .webp)
4. Must include proper photographer credit

IMPORTANT: Return ONLY a valid JSON object with these exact fields:
{
  "imageUrl": "direct URL to the image file",
  "credit": "photographer name",
  "sourceUrl": "URL to the photographer's profile page",
  "sourceName": "Pexels, Unsplash, or Pixabay"
}

If you cannot find a suitable free image, return:
{
  "imageUrl": "",
  "credit": "",
  "sourceUrl": "",
  "sourceName": ""
}`;

    let imageResult: ImageSearchResult | null = null;

    try {
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
              content: "You are an image search assistant. You find relevant free stock photos and return structured JSON data. Always respond with valid JSON only.",
            },
            {
              role: "user",
              content: searchQuery,
            },
          ],
        }),
      });

      if (perplexityResponse.ok) {
        const perplexityData = await perplexityResponse.json();
        const content = perplexityData.choices?.[0]?.message?.content || "";
        
        console.log("[AI Blog Image] Perplexity response:", content.substring(0, 300));

        // Try to parse JSON from response
        try {
          const jsonMatch = content.match(/\{[\s\S]*"imageUrl"[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.imageUrl && parsed.imageUrl.match(/\.(jpg|jpeg|png|webp)$/i)) {
              imageResult = {
                imageUrl: parsed.imageUrl,
                credit: parsed.credit || "Autor desconhecido",
                sourceUrl: parsed.sourceUrl || "",
                sourceName: parsed.sourceName || "Web",
              };
              console.log("[AI Blog Image] Imagem encontrada:", imageResult.imageUrl);
            }
          }
        } catch (parseError) {
          console.log("[AI Blog Image] Não foi possível extrair imagem do resultado");
        }
      } else {
        console.log("[AI Blog Image] Perplexity error:", perplexityResponse.status);
      }
    } catch (perplexityError) {
      console.error("[AI Blog Image] Erro Perplexity:", perplexityError);
    }

    // Step 2: If found image, download and upload to storage
    let finalImageUrl: string | null = null;
    let imageCredit: string | null = null;
    let imageSource: string | null = null;

    if (imageResult && imageResult.imageUrl) {
      console.log("[AI Blog Image] Descarregando imagem...");
      
      try {
        const imageResponse = await fetch(imageResult.imageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; WillFlow/1.0; +https://willflows.lovable.app)",
          },
        });

        if (imageResponse.ok) {
          const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
          const imageBytes = new Uint8Array(await imageResponse.arrayBuffer());
          
          // Determine file extension
          let extension = "jpg";
          if (contentType.includes("png")) extension = "png";
          else if (contentType.includes("webp")) extension = "webp";

          const filename = `${post.slug || postId}-${Date.now()}.${extension}`;
          const filePath = `covers/${filename}`;

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from("blog-images")
            .upload(filePath, imageBytes, {
              contentType,
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrl } = supabase.storage
              .from("blog-images")
              .getPublicUrl(filePath);

            finalImageUrl = publicUrl.publicUrl;
            imageCredit = `Foto de ${imageResult.credit}`;
            imageSource = imageResult.sourceUrl || null;
            
            console.log("[AI Blog Image] Imagem guardada:", finalImageUrl);
          } else {
            console.error("[AI Blog Image] Erro upload:", uploadError);
          }
        } else {
          console.log("[AI Blog Image] Falha ao descarregar imagem:", imageResponse.status);
        }
      } catch (downloadError) {
        console.error("[AI Blog Image] Erro ao descarregar:", downloadError);
      }
    }

    // Step 3: Fallback to AI-generated image if no web image found
    if (!finalImageUrl && lovableApiKey) {
      console.log("[AI Blog Image] Fallback: Gerando imagem com AI...");

      try {
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

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          const generatedImageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

          if (generatedImageUrl && generatedImageUrl.startsWith("data:image")) {
            // Extract base64 data and decode
            const base64Match = generatedImageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
            if (base64Match) {
              const imageFormat = base64Match[1];
              const base64Data = base64Match[2];
              
              // Decode base64 using Deno's standard library approach
              const binaryString = atob(base64Data);
              const imageBytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                imageBytes[i] = binaryString.charCodeAt(i);
              }

              const filename = `${post.slug || postId}-${Date.now()}.${imageFormat}`;
              const filePath = `covers/${filename}`;

              const { error: uploadError } = await supabase.storage
                .from("blog-images")
                .upload(filePath, imageBytes, {
                  contentType: `image/${imageFormat}`,
                  upsert: true,
                });

              if (!uploadError) {
                const { data: publicUrl } = supabase.storage
                  .from("blog-images")
                  .getPublicUrl(filePath);

                finalImageUrl = publicUrl.publicUrl;
                imageCredit = "Gerada por WillFlow AI";
                imageSource = null;
                
                console.log("[AI Blog Image] Imagem AI guardada:", finalImageUrl);
              }
            }
          }
        } else {
          const errorStatus = imageResponse.status;
          console.log("[AI Blog Image] Erro Lovable AI:", errorStatus);
          
          if (errorStatus === 429) {
            return new Response(JSON.stringify({ error: "Limite de pedidos AI excedido" }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (errorStatus === 402) {
            return new Response(JSON.stringify({ error: "Créditos Lovable AI esgotados" }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } catch (aiError) {
        console.error("[AI Blog Image] Erro AI:", aiError);
      }
    }

    // Step 4: Update blog post with image and credits
    if (finalImageUrl) {
      const { error: updateError } = await supabase
        .from("blog_posts")
        .update({ 
          cover_image: finalImageUrl,
          cover_image_credit: imageCredit,
          cover_image_source: imageSource,
        })
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
        imageUrl: finalImageUrl,
        credit: imageCredit,
        source: imageSource,
        postId,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // No image could be generated
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Não foi possível encontrar ou gerar uma imagem" 
    }), {
      status: 500,
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
