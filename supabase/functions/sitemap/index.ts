import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all published blog posts with cover images
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('slug, title, excerpt, cover_image, updated_at, published_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error fetching blog posts:', error);
      throw error;
    }

    const baseUrl = 'https://willflow.app';
    const today = new Date().toISOString().split('T')[0];

    // Static pages
    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'weekly' },
      { loc: '/funcionalidades', priority: '0.9', changefreq: 'monthly' },
      { loc: '/funcionalidades/chat', priority: '0.85', changefreq: 'monthly' },
      { loc: '/funcionalidades/kanban', priority: '0.85', changefreq: 'monthly' },
      { loc: '/funcionalidades/crm', priority: '0.85', changefreq: 'monthly' },
      { loc: '/funcionalidades/calendario', priority: '0.85', changefreq: 'monthly' },
      { loc: '/funcionalidades/pagamentos', priority: '0.85', changefreq: 'monthly' },
      { loc: '/funcionalidades/relatorios', priority: '0.85', changefreq: 'monthly' },
      { loc: '/funcionalidades/media-hub', priority: '0.85', changefreq: 'monthly' },
      { loc: '/planos', priority: '0.9', changefreq: 'monthly' },
      { loc: '/para-fotografos', priority: '0.9', changefreq: 'monthly' },
      { loc: '/para-videomakers', priority: '0.9', changefreq: 'monthly' },
      { loc: '/ajuda', priority: '0.7', changefreq: 'monthly' },
      { loc: '/sobre', priority: '0.6', changefreq: 'monthly' },
      { loc: '/seguranca', priority: '0.6', changefreq: 'monthly' },
      { loc: '/integracoes', priority: '0.7', changefreq: 'monthly' },
      { loc: '/blog', priority: '0.8', changefreq: 'daily' },
      { loc: '/blog/categoria/novidades', priority: '0.7', changefreq: 'weekly' },
      { loc: '/blog/categoria/tutorial', priority: '0.7', changefreq: 'weekly' },
      { loc: '/blog/categoria/comparacao', priority: '0.7', changefreq: 'weekly' },
      { loc: '/blog/categoria/dicas', priority: '0.7', changefreq: 'weekly' },
      { loc: '/auth', priority: '0.5', changefreq: 'monthly' },
      { loc: '/privacidade', priority: '0.5', changefreq: 'yearly' },
      { loc: '/termos', priority: '0.5', changefreq: 'yearly' },
      { loc: '/cookies', priority: '0.5', changefreq: 'yearly' },
    ];

    // Generate XML with image sitemap extension
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd
        http://www.google.com/schemas/sitemap-image/1.1
        http://www.google.com/schemas/sitemap-image/1.1/sitemap-image.xsd">
`;

    // Add static pages
    for (const page of staticPages) {
      xml += `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Add blog posts with images
    if (posts && posts.length > 0) {
      console.log(`Adding ${posts.length} blog posts to sitemap`);
      
      for (const post of posts) {
        const lastmod = post.updated_at 
          ? new Date(post.updated_at).toISOString().split('T')[0]
          : post.published_at 
            ? new Date(post.published_at).toISOString().split('T')[0]
            : today;

        xml += `  <url>
    <loc>${baseUrl}/blog/${escapeXml(post.slug)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>`;

        // Add image tag if cover image exists
        if (post.cover_image) {
          const imageTitle = escapeXml(post.title);
          const imageCaption = post.excerpt ? escapeXml(post.excerpt.substring(0, 200)) : imageTitle;
          
          xml += `
    <image:image>
      <image:loc>${escapeXml(post.cover_image)}</image:loc>
      <image:title>${imageTitle}</image:title>
      <image:caption>${imageCaption}</image:caption>
    </image:image>`;
        }

        xml += `
  </url>
`;
      }
    }

    xml += `</urlset>`;

    console.log('Sitemap generated successfully with images');

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate sitemap' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
