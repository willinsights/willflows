import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/rss+xml; charset=utf-8',
};

const escapeXml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '').trim();
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: posts, error } = await supabaseClient
      .from('blog_posts')
      .select('id, title, slug, excerpt, content, author_name, category, published_at, cover_image')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching blog posts:', error);
      throw error;
    }

    const baseUrl = 'https://willflow.app';
    const now = new Date().toUTCString();

    const rssItems = (posts || []).map(post => {
      const pubDate = post.published_at ? new Date(post.published_at).toUTCString() : now;
      const description = post.excerpt || stripHtml(post.content).substring(0, 300) + '...';
      
      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <description>${escapeXml(description)}</description>
      <author>${escapeXml(post.author_name)}</author>
      <category>${escapeXml(post.category || 'geral')}</category>
      <pubDate>${pubDate}</pubDate>
      ${post.cover_image ? `<enclosure url="${escapeXml(post.cover_image)}" type="image/jpeg" />` : ''}
    </item>`;
    }).join('');

    const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>WillFlow Blog - Gestão de Projetos para Criativos</title>
    <link>${baseUrl}/blog</link>
    <description>Dicas, tutoriais e novidades sobre gestão de projetos para fotógrafos, videomakers e criativos. Aprenda a organizar o seu fluxo de trabalho e aumentar a produtividade.</description>
    <language>pt-PT</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${baseUrl}/blog/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/logo-willflow-purple.png</url>
      <title>WillFlow Blog</title>
      <link>${baseUrl}/blog</link>
    </image>
    <copyright>© ${new Date().getFullYear()} WillFlow. Todos os direitos reservados.</copyright>
    <managingEditor>blog@willflow.app (WillFlow)</managingEditor>
    <webMaster>tech@willflow.app (WillFlow)</webMaster>
    <category>Technology</category>
    <category>Business</category>
    <category>Photography</category>
    <category>Productivity</category>
    ${rssItems}
  </channel>
</rss>`;

    return new Response(rssFeed, {
      headers: corsHeaders,
      status: 200,
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>WillFlow Blog</title>
    <description>Error generating feed</description>
  </channel>
</rss>`,
      { headers: corsHeaders, status: 500 }
    );
  }
});
