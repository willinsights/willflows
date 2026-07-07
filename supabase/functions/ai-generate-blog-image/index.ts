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

// Function to clean and fix image URLs
function cleanImageUrl(url: string): string {
  // Remove .jpg/.png/.webp if it appears after query params (common AI mistake)
  let cleaned = url.replace(/(\?[^"]*)\.(jpg|jpeg|png|webp)$/i, '$1');
  
  // Fix double extensions like .png.jpg
  cleaned = cleaned.replace(/\.(jpg|jpeg|png|webp)\.(jpg|jpeg|png|webp)/gi, '.$2');
  
  // For Unsplash, ensure we have a valid format
  if (cleaned.includes('images.unsplash.com')) {
    // Make sure format is specified in query params
    if (!cleaned.includes('fm=')) {
      cleaned += (cleaned.includes('?') ? '&' : '?') + 'fm=jpg&q=80';
    }
  }
  
  return cleaned;
}

// Function to search for images with Perplexity
async function searchImageWithPerplexity(
  perplexityApiKey: string,
  searchQuery: string
): Promise<ImageSearchResult | null> {
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
            content: "You are an image search assistant. You find relevant free stock photos and return structured JSON data. Always respond with valid JSON only, no markdown formatting.",
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
      
      console.log("[AI Blog Image] Perplexity response:", content.substring(0, 500));

      // Try to parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*"imageUrl"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.imageUrl && parsed.imageUrl.startsWith("http")) {
          // Clean the URL to fix common issues
          const cleanedUrl = cleanImageUrl(parsed.imageUrl);
          console.log("[AI Blog Image] Cleaned URL:", cleanedUrl);
          
          return {
            imageUrl: cleanedUrl,
            credit: parsed.credit || "Autor desconhecido",
            sourceUrl: parsed.sourceUrl || "",
            sourceName: parsed.sourceName || "Web",
          };
        }
      }
    } else {
      console.log("[AI Blog Image] Perplexity error:", perplexityResponse.status);
    }
  } catch (error) {
    console.error("[AI Blog Image] Erro Perplexity:", error);
  }
  return null;
}

// Function to generate image with AI as fallback
async function generateAIImage(
  lovableApiKey: string,
  supabase: any,
  title: string,
  slug: string
): Promise<string | null> {
  try {
    console.log("[AI Blog Image] Gerando imagem com AI como fallback...");
    
    const imagePrompt = `Create a professional PHOTOGRAPH for a blog article header.

ARTICLE TITLE: ${title}

CRITICAL STYLE REQUIREMENTS:
- Professional PHOTOGRAPHY style, NOT illustration
- Real-world scenes: cameras, studios, editing rooms, creative professionals at work
- Natural lighting, high-quality DSLR aesthetic with depth of field
- Clean, modern composition
- Subtle purple/violet color grading (#7C3AED tones)
- 16:9 landscape aspect ratio
- Editorial quality like Getty Images or Unsplash
- NO text, NO logos, NO watermarks`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    if (response.ok) {
      const data = await response.json();
      const imageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (imageBase64 && imageBase64.startsWith("data:image")) {
        const base64Data = imageBase64.split(",")[1];
        const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

        const filename = `${slug}-ai-${Date.now()}.png`;
        const filePath = `covers/${filename}`;

        const { error: uploadError } = await supabase.storage
          .from("blog-images")
          .upload(filePath, imageBytes, {
            contentType: "image/png",
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicUrl } = supabase.storage
            .from("blog-images")
            .getPublicUrl(filePath);

          console.log("[AI Blog Image] AI fallback image uploaded:", publicUrl.publicUrl);
          return publicUrl.publicUrl;
        }
      }
    }
  } catch (error) {
    console.error("[AI Blog Image] AI fallback error:", error);
  }
  return null;
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

    // Require system admin — endpoint can overwrite cover images on any blog post
    const { data: adminRow } = await supabase
      .from("system_admins")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!adminRow) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
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

    console.log(`[AI Blog Image] Buscando imagem REAL da web para artigo: "${title}"`);

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

    // Get API key
    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");

    if (!perplexityApiKey) {
      console.error("[AI Blog Image] PERPLEXITY_API_KEY não configurada");
      return new Response(JSON.stringify({ error: "Perplexity API não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build search queries with different strategies
    const primarySearchQuery = `Find a high-quality FREE stock photo for this blog article: "${title}"
${context ? `Additional context: ${context}` : ""}

SEARCH PRIORITY:
1. If the article mentions a specific FILM or MOVIE → find a promotional still or scene from that film
2. If the article mentions a CAMERA, LENS, or EQUIPMENT → find an image of that specific product
3. If the article is about a PHOTOGRAPHY/VIDEO TECHNIQUE → find a visual example of that technique
4. Otherwise → find a professional photography/video production scene

REQUIREMENTS:
- MUST be from FREE sources: Pexels, Unsplash, or Pixabay
- MUST be a DIRECT link to the image file (URL ending in .jpg, .jpeg, .png, or .webp)
- The image should be HORIZONTAL (landscape orientation)
- High resolution, professional quality
- Include photographer credit

Return ONLY a valid JSON object:
{
  "imageUrl": "direct URL to the image file",
  "credit": "photographer name",
  "sourceUrl": "URL to photographer's profile",
  "sourceName": "Pexels, Unsplash, or Pixabay"
}`;

    // Fallback search queries if primary fails
    const fallbackQueries = [
      `Find a FREE stock photo from Pexels or Unsplash showing "professional video production studio" or "filmmaker working with camera". Return JSON with imageUrl, credit, sourceUrl, sourceName.`,
      `Find a FREE stock photo from Pixabay or Pexels of "photography studio equipment" or "creative professional editing video". Return JSON with imageUrl, credit, sourceUrl, sourceName.`,
      `Find a FREE stock photo from Unsplash of "cinema camera filming" or "photographer with DSLR camera". Return JSON with imageUrl, credit, sourceUrl, sourceName.`,
    ];

    let imageResult: ImageSearchResult | null = null;

    // Try primary search
    console.log("[AI Blog Image] Tentativa 1: Busca específica para o título...");
    imageResult = await searchImageWithPerplexity(perplexityApiKey, primarySearchQuery);

    // Try fallback searches if primary fails
    if (!imageResult) {
      for (let i = 0; i < fallbackQueries.length; i++) {
        console.log(`[AI Blog Image] Tentativa ${i + 2}: Busca alternativa...`);
        imageResult = await searchImageWithPerplexity(perplexityApiKey, fallbackQueries[i]);
        if (imageResult) {
          console.log("[AI Blog Image] Imagem encontrada na tentativa", i + 2);
          break;
        }
      }
    }

    // Download and upload image if found
    let finalImageUrl: string | null = null;
    let imageCredit: string | null = null;
    let imageSource: string | null = null;

    if (imageResult && imageResult.imageUrl) {
      console.log("[AI Blog Image] Descarregando imagem:", imageResult.imageUrl);
      
      try {
        const imageResponse = await fetch(imageResult.imageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          },
        });

        if (imageResponse.ok) {
          const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
          const imageBytes = new Uint8Array(await imageResponse.arrayBuffer());
          
          // Validate it's actually an image
          if (imageBytes.length < 1000) {
            console.log("[AI Blog Image] Imagem muito pequena, pode ser inválida");
          } else {
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
              imageCredit = `Foto de ${imageResult.credit} no ${imageResult.sourceName}`;
              imageSource = imageResult.sourceUrl || null;
              
              console.log("[AI Blog Image] Imagem REAL guardada:", finalImageUrl);
            } else {
              console.error("[AI Blog Image] Erro upload:", uploadError);
            }
          }
        } else {
          console.log("[AI Blog Image] Falha ao descarregar imagem:", imageResponse.status);
        }
      } catch (downloadError) {
        console.error("[AI Blog Image] Erro ao descarregar:", downloadError);
      }
    }

    // Update blog post with image and credits
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

      console.log(`[AI Blog Image] Sucesso! Imagem REAL adicionada ao artigo ${postId}`);

      return new Response(JSON.stringify({
        success: true,
        imageUrl: finalImageUrl,
        credit: imageCredit,
        source: imageSource,
        postId,
        isRealImage: true,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no real image found, try AI fallback
    if (!finalImageUrl) {
      console.log("[AI Blog Image] Imagem real não encontrada, tentando AI fallback...");
      
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      if (lovableApiKey) {
        finalImageUrl = await generateAIImage(lovableApiKey, supabase, title, post.slug || postId);
        
        if (finalImageUrl) {
          imageCredit = "Imagem gerada por AI";
          imageSource = null;
          
          // Update post with AI image
          const { error: updateError } = await supabase
            .from("blog_posts")
            .update({ 
              cover_image: finalImageUrl,
              cover_image_credit: imageCredit,
              cover_image_source: imageSource,
            })
            .eq("id", postId);

          if (!updateError) {
            console.log(`[AI Blog Image] Sucesso! Imagem AI adicionada ao artigo ${postId}`);

            return new Response(JSON.stringify({
              success: true,
              imageUrl: finalImageUrl,
              credit: imageCredit,
              postId,
              isRealImage: false,
            }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    }

    // No image could be found
    console.log("[AI Blog Image] Não foi possível encontrar ou gerar imagem");
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Não foi possível encontrar ou gerar uma imagem. Tente novamente." 
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
