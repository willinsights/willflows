import { Suspense, lazy } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { FullPageLoader } from "@/components/layout/FullPageLoader";
import { PageTrackingProvider } from "@/components/PageTrackingProvider";
import { CookieConsentBanner } from "@/components/cookies/CookieConsentBanner";
import { queryClient } from "@/lib/query-client";

// Lazy loaded public pages
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Features = lazy(() => import("./pages/Features"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Security = lazy(() => import("./pages/Security"));
const Help = lazy(() => import("./pages/Help"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Cookies = lazy(() => import("./pages/Cookies"));

// Lazy loaded protected pages
const Onboarding = lazy(() => import("./pages/Onboarding"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));

// Lazy loaded app pages
const Dashboard = lazy(() => import("./pages/app/Dashboard"));
const Captacao = lazy(() => import("./pages/app/Captacao"));
const Edicao = lazy(() => import("./pages/app/Edicao"));
const Finalizados = lazy(() => import("./pages/app/Finalizados"));
const Media = lazy(() => import("./pages/app/Media"));
const Clientes = lazy(() => import("./pages/app/Clientes"));
const Calendario = lazy(() => import("./pages/app/Calendario"));
const Pagamentos = lazy(() => import("./pages/app/Pagamentos"));
const Relatorios = lazy(() => import("./pages/app/Relatorios"));
const Configuracoes = lazy(() => import("./pages/app/Configuracoes"));
const Equipa = lazy(() => import("./pages/app/Equipa"));
const Faturacao = lazy(() => import("./pages/app/Faturacao"));
const Planos = lazy(() => import("./pages/app/Planos"));
const BetaAdmin = lazy(() => import("./pages/app/BetaAdmin"));
const FeedbackAdmin = lazy(() => import("./pages/app/FeedbackAdmin"));
const BlogAdmin = lazy(() => import("./pages/app/BlogAdmin"));
const SuperAdmin = lazy(() => import("./pages/app/SuperAdmin"));
const Chat = lazy(() => import("./pages/app/Chat"));

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <PageTrackingProvider>
                  <Suspense fallback={<FullPageLoader />}>
                    <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/planos" element={<Pricing />} />
                    <Route path="/funcionalidades" element={<Features />} />
                    <Route path="/integracoes" element={<Integrations />} />
                    <Route path="/seguranca" element={<Security />} />
                    <Route path="/ajuda" element={<Help />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/:slug" element={<BlogPost />} />
                    <Route path="/convite" element={<AcceptInvite />} />
                    <Route path="/privacidade" element={<Privacy />} />
                    <Route path="/termos" element={<Terms />} />
                    <Route path="/cookies" element={<Cookies />} />
                    
                    {/* Protected Routes */}
                    <Route
                      path="/onboarding"
                      element={
                        <ProtectedRoute>
                          <Onboarding />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/checkout-success"
                      element={
                        <ProtectedRoute>
                          <CheckoutSuccess />
                        </ProtectedRoute>
                      }
                    />
                    
                    {/* App Routes with Layout */}
                    <Route
                      path="/app"
                      element={
                        <ProtectedRoute>
                          <AppLayout />
                        </ProtectedRoute>
                      }
                    >
                      <Route index element={<Dashboard />} />
                      <Route path="captacao" element={<Captacao />} />
                      <Route path="edicao" element={<Edicao />} />
                      <Route path="finalizados" element={<Finalizados />} />
                      <Route path="media" element={<Media />} />
                      <Route path="clientes" element={<Clientes />} />
                      <Route path="calendario" element={<Calendario />} />
                      <Route path="pagamentos" element={<Pagamentos />} />
                      <Route path="relatorios" element={<Relatorios />} />
                      <Route path="configuracoes" element={<Configuracoes />} />
                      <Route path="equipa" element={<Equipa />} />
                      <Route path="faturacao" element={<Faturacao />} />
                      <Route path="planos" element={<Planos />} />
                      {/* Redirect conta to planos */}
                      <Route path="conta" element={<Planos />} />
                      <Route path="beta-admin" element={<BetaAdmin />} />
                      <Route path="feedback" element={<FeedbackAdmin />} />
                      <Route path="blog-admin" element={<BlogAdmin />} />
                      <Route path="admin" element={<SuperAdmin />} />
                      <Route path="chat" element={<Chat />} />
                      <Route path="chat/:conversationId" element={<Chat />} />
                    </Route>

                      {/* Catch-all */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                  <CookieConsentBanner />
                </PageTrackingProvider>
              </BrowserRouter>
            </TooltipProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;