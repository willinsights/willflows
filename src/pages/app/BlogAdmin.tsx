import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Sparkles, 
  FileText, 
  Eye, 
  BookOpen,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { useBlogAdmin } from '@/hooks/useBlogAdmin';
import { GenerateArticleModal } from '@/components/blog/GenerateArticleModal';
import { BlogPostCard } from '@/components/blog/BlogPostCard';
import { Link } from 'react-router-dom';

export default function BlogAdmin() {
  const { 
    posts, 
    loading, 
    error, 
    isGenerating,
    generatePost,
    publishPost,
    unpublishPost,
    deletePost
  } = useBlogAdmin();

  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestão do Blog</h1>
          <p className="text-muted-foreground">
            Gera e gere artigos do blog com AI
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/blog" target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver Blog
            </Link>
          </Button>
          <Button onClick={() => setGenerateModalOpen(true)} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Gerar Artigo com AI
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Total de Artigos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{posts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Publicados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {publishedPosts.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Rascunhos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">
              {draftPosts.length}
            </p>
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
          <TabsTrigger value="all">
            Todos ({posts.length})
          </TabsTrigger>
          <TabsTrigger value="published">
            Publicados ({publishedPosts.length})
          </TabsTrigger>
          <TabsTrigger value="drafts">
            Rascunhos ({draftPosts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <PostsGrid 
            posts={posts} 
            loading={loading}
            onPublish={publishPost}
            onUnpublish={unpublishPost}
            onDelete={handleDeleteClick}
          />
        </TabsContent>

        <TabsContent value="published" className="mt-4">
          <PostsGrid 
            posts={publishedPosts} 
            loading={loading}
            onPublish={publishPost}
            onUnpublish={unpublishPost}
            onDelete={handleDeleteClick}
          />
        </TabsContent>

        <TabsContent value="drafts" className="mt-4">
          <PostsGrid 
            posts={draftPosts} 
            loading={loading}
            onPublish={publishPost}
            onUnpublish={unpublishPost}
            onDelete={handleDeleteClick}
          />
        </TabsContent>
      </Tabs>

      {/* Generate Modal */}
      <GenerateArticleModal
        open={generateModalOpen}
        onOpenChange={setGenerateModalOpen}
        onGenerate={async (options) => {
          await generatePost(options);
        }}
        isGenerating={isGenerating}
      />

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
  posts: any[];
  loading: boolean;
  onPublish: (id: string) => void;
  onUnpublish: (id: string) => void;
  onDelete: (id: string) => void;
}

function PostsGrid({ posts, loading, onPublish, onUnpublish, onDelete }: PostsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-[200px]">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-20 mb-2" />
              <Skeleton className="h-5 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {posts.map((post) => (
        <BlogPostCard
          key={post.id}
          post={post}
          onPublish={onPublish}
          onUnpublish={onUnpublish}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
