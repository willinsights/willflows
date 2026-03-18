/**
 * AdminContent - Blog articles, AI generation, SEO management
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  FileText, 
  Sparkles, 
  Eye, 
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Settings,
  Search
} from 'lucide-react';
import { useBlogAdmin, BlogPost } from '@/hooks/useBlogAdmin';
import { GenerateArticleModal } from '@/components/blog/GenerateArticleModal';
import { BlogPostCard } from '@/components/blog/BlogPostCard';
import { EditArticleModal } from '@/components/blog/EditArticleModal';
import { PreviewArticleModal } from '@/components/blog/PreviewArticleModal';
import { BlogAutoSettings } from '@/components/blog/BlogAutoSettings';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminContent() {
  const queryClient = useQueryClient();
  const { 
    posts, 
    loading, 
    error, 
    isGenerating,
    isRegeneratingImage,
    generatingImageId,
    regenerateImage,
    generatePost,
    publishPost,
    unpublishPost,
    deletePost,
    updatePost,
  } = useBlogAdmin();

  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null);

  const publishedPosts = posts.filter(p => p.is_published);
  const draftPosts = posts.filter(p => !p.is_published);

  const handleDeleteClick = (id: string) => {
    setPostToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (postToDelete) {
      deletePost(postToDelete);
      setPostToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleEditClick = (post: BlogPost) => {
    setEditingPost(post);
  };

  const handlePreviewClick = (post: BlogPost) => {
    setPreviewPost(post);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['blog-admin-posts'] });
  };

  return (
    <div className="space-y-6">
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conteúdo</h1>
          <p className="text-muted-foreground">Gere e publica artigos do blog com AI</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" asChild>
            <Link to="/blog" target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver Blog
            </Link>
          </Button>
          <Button onClick={() => setGenerateModalOpen(true)} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Gerar Artigo
          </Button>
        </div>
      </div>

      <Tabs defaultValue="articles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="articles" className="gap-2">
            <FileText className="h-4 w-4" />
            Artigos
          </TabsTrigger>
          <TabsTrigger value="auto" className="gap-2">
            <Settings className="h-4 w-4" />
            Auto-Publish
          </TabsTrigger>
          <TabsTrigger value="seo" className="gap-2">
            <Search className="h-4 w-4" />
            SEO
          </TabsTrigger>
        </TabsList>

        {/* ARTICLES TAB */}
        <TabsContent value="articles" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                  <FileText className="h-4 w-4" />
                  Total
                </div>
                <p className="text-3xl font-bold">{posts.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                  <Eye className="h-4 w-4" />
                  Publicados
                </div>
                <p className="text-3xl font-bold text-green-600">{publishedPosts.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 pb-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
                  <FileText className="h-4 w-4" />
                  Rascunhos
                </div>
                <p className="text-3xl font-bold text-muted-foreground">{draftPosts.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Error State */}
          {error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p>{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Posts List */}
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">Todos ({posts.length})</TabsTrigger>
              <TabsTrigger value="published">Publicados ({publishedPosts.length})</TabsTrigger>
              <TabsTrigger value="drafts">Rascunhos ({draftPosts.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <PostsGrid 
                posts={posts} 
                loading={loading}
                onPublish={publishPost}
                onUnpublish={unpublishPost}
                onDelete={handleDeleteClick}
                onEdit={handleEditClick}
                onPreview={handlePreviewClick}
                onGenerateImage={regenerateImage}
                isGeneratingImage={isRegeneratingImage}
                generatingImageId={generatingImageId}
              />
            </TabsContent>

            <TabsContent value="published" className="mt-6">
              <PostsGrid 
                posts={publishedPosts} 
                loading={loading}
                onPublish={publishPost}
                onUnpublish={unpublishPost}
                onDelete={handleDeleteClick}
                onEdit={handleEditClick}
                onPreview={handlePreviewClick}
                onGenerateImage={regenerateImage}
                isGeneratingImage={isRegeneratingImage}
                generatingImageId={generatingImageId}
              />
            </TabsContent>

            <TabsContent value="drafts" className="mt-6">
              <PostsGrid 
                posts={draftPosts} 
                loading={loading}
                onPublish={publishPost}
                onUnpublish={unpublishPost}
                onDelete={handleDeleteClick}
                onEdit={handleEditClick}
                onPreview={handlePreviewClick}
                onGenerateImage={regenerateImage}
                isGeneratingImage={isRegeneratingImage}
                generatingImageId={generatingImageId}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* AUTO-PUBLISH TAB */}
        <TabsContent value="auto" className="space-y-6">
          <BlogAutoSettings />
        </TabsContent>

        {/* SEO TAB */}
        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold mb-2">Ferramentas de SEO</h3>
                <p className="text-sm">Em breve: sitemap status, indexação, meta tags</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      <PreviewArticleModal
        open={!!previewPost}
        onOpenChange={(open) => !open && setPreviewPost(null)}
        post={previewPost}
        onEdit={() => {
          if (previewPost) {
            setEditingPost(previewPost);
            setPreviewPost(null);
          }
        }}
        onPublish={() => {
          if (previewPost) {
            publishPost(previewPost.id);
            setPreviewPost(null);
          }
        }}
      />

      {/* Generate Modal */}
      <GenerateArticleModal
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
        onGenerate={async (options) => {
          await generatePost(options);
        }}
        isGenerating={isGenerating}
      />

      {/* Edit Modal */}
      {editingPost && (
        <EditArticleModal
          open={!!editingPost}
          onOpenChange={(open) => !open && setEditingPost(null)}
          post={editingPost}
          onSave={async (updates) => {
            await updatePost(editingPost.id, updates);
            setEditingPost(null);
          }}
          onRegenerateImage={async () => {
            await regenerateImage(editingPost.id, editingPost.title);
          }}
          isRegeneratingImage={isRegeneratingImage}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar artigo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser revertida. O artigo será permanentemente eliminado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface PostsGridProps {
  posts: BlogPost[];
  loading: boolean;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (post: BlogPost) => void;
  onPreview: (post: BlogPost) => void;
  onGenerateImage: (postId: string, title: string) => Promise<{ success: boolean; imageUrl?: string; error?: string }>;
  isGeneratingImage: boolean;
  generatingImageId: string | null;
}

function PostsGrid({ 
  posts, 
  loading, 
  onPublish, 
  onUnpublish, 
  onDelete, 
  onEdit, 
  onPreview,
  onGenerateImage,
  isGeneratingImage,
  generatingImageId
}: PostsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-[280px]">
            <Skeleton className="h-32 w-full" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="py-12">
        <CardContent className="text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Sem artigos</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Ainda não existem artigos nesta categoria.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <BlogPostCard
          key={post.id}
          post={post}
          onPublish={onPublish}
          onUnpublish={onUnpublish}
          onDelete={onDelete}
          onEdit={() => onEdit(post)}
          onPreview={() => onPreview(post)}
          onGenerateImage={onGenerateImage}
          isGeneratingImage={isGeneratingImage}
          generatingImageId={generatingImageId || undefined}
        />
      ))}
    </div>
  );
}
