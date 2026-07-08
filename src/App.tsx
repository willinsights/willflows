import { Suspense, lazy } from "react";
import { MotionConfig } from "framer-motion";
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
import { PWAUpdateListener } from "@/components/pwa/PWAUpdateListener";
import { DebugLifecycle } from "@/components/debug/DebugLifecycle";

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
const BlogCategory = lazy(() => import("./pages/BlogCategory"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Cookies = lazy(() => import("./pages/Cookies"));
const About = lazy(() => import("./pages/About"));
const Tutorial = lazy(() => import("./pages/Tutorial"));
const ParaFotografos = lazy(() => import("./pages/ParaFotografos"));
const ParaVideomakers = lazy(() => import("./pages/ParaVideomakers"));
const ParaAgencias = lazy(() => import("./pages/ParaAgencias"));
const ParaProdutoras = lazy(() => import("./pages/ParaProdutoras"));
const Contact = lazy(() => import("./pages/Contact"));

// Feature pages
const ChatFeature = lazy(() => import("./pages/features/Chat"));
const KanbanFeature = lazy(() => import("./pages/features/Kanban"));
const CRMFeature = lazy(() => import("./pages/features/CRM"));
const CalendarioFeature = lazy(() => import("./pages/features/Calendario"));
const PagamentosFeature = lazy(() => import("./pages/features/Pagamentos"));

// Financeiro hub pages
const FinanceiroLayout = lazy(() => import("./pages/app/financeiro/FinanceiroLayout"));
const FinanceiroVisaoGeral = lazy(() => import("./pages/app/financeiro/VisaoGeral"));
const FinanceiroReceitas = lazy(() => import("./pages/app/financeiro/Receitas"));
const FinanceiroCustos = lazy(() => import("./pages/app/financeiro/Custos"));
const FinanceiroCustosExtras = lazy(() => import("./pages/app/financeiro/CustosExtras"));
const FinanceiroLucro = lazy(() => import("./pages/app/financeiro/Lucro"));
const RelatoriosFeature = lazy(() => import("./pages/features/Relatorios"));
const MediaHubFeature = lazy(() => import("./pages/features/MediaHub"));
const VideoApprovalFeature = lazy(() => import("./pages/features/VideoApproval"));
const TimelineFeature = lazy(() => import("./pages/features/Timeline"));

// Comparison pages
const ComparisonsHub = lazy(() => import("./pages/comparisons/ComparisonsHub"));
const VsAsana = lazy(() => import("./pages/comparisons/VsAsana"));
const VsClickUp = lazy(() => import("./pages/comparisons/VsClickUp"));
const VsTrello = lazy(() => import("./pages/comparisons/VsTrello"));

// Plan comparison page
const PlanosComparar = lazy(() => import("./pages/public/PlanosComparar"));

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
const Chat = lazy(() => import("./pages/app/Chat"));
const Leads = lazy(() => import("./pages/app/Leads"));
const Contratos = lazy(() => import("./pages/app/Contratos"));
const ContractSign = lazy(() => import("./pages/public/ContractSign"));
const VideoApproval = lazy(() => import("./pages/public/VideoApproval"));

// Admin pages (new /admin route)
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling"));
const AdminGrowth = lazy(() => import("./pages/admin/AdminGrowth"));
const AdminSystem = lazy(() => import("./pages/admin/AdminSystem"));
const AdminWebhooks = lazy(() => import("./pages/admin/AdminWebhooks"));

// API health check confirmed — backend is operational
const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <TooltipProvider>
              <DebugLifecycle />
              <PWAUpdateListener />
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
                    <Route path="/planos/comparar" element={<PlanosComparar />} />
                    <Route path="/funcionalidades" element={<Features />} />
                    <Route path="/funcionalidades/chat" element={<ChatFeature />} />
                    <Route path="/funcionalidades/kanban" element={<KanbanFeature />} />
                    <Route path="/funcionalidades/crm" element={<CRMFeature />} />
                    <Route path="/funcionalidades/calendario" element={<CalendarioFeature />} />
                    <Route path="/funcionalidades/pagamentos" element={<PagamentosFeature />} />
                    <Route path="/funcionalidades/relatorios" element={<RelatoriosFeature />} />
                    <Route path="/funcionalidades/media-hub" element={<MediaHubFeature />} />
                    <Route path="/funcionalidades/video-approval" element={<VideoApprovalFeature />} />
                    <Route path="/funcionalidades/timeline" element={<TimelineFeature />} />
                    <Route path="/integracoes" element={<Integrations />} />
                    <Route path="/seguranca" element={<Security />} />
                    <Route path="/ajuda" element={<Help />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/categoria/:category" element={<BlogCategory />} />
                    <Route path="/blog/:slug" element={<BlogPost />} />
                    <Route path="/convite" element={<AcceptInvite />} />
                    <Route path="/privacidade" element={<Privacy />} />
                    <Route path="/termos" element={<Terms />} />
                    <Route path="/cookies" element={<Cookies />} />
                    <Route path="/sobre" element={<About />} />
                    <Route path="/tutorial" element={<Tutorial />} />
                    <Route path="/para-fotografos" element={<ParaFotografos />} />
                    <Route path="/para-videomakers" element={<ParaVideomakers />} />
                    <Route path="/para-agencias" element={<ParaAgencias />} />
                    <Route path="/para-produtoras" element={<ParaProdutoras />} />
                    <Route path="/contato" element={<Contact />} />
                    <Route path="/contrato/:token" element={<ContractSign />} />
                    <Route path="/video-approval/:token" element={<VideoApproval />} />
                    <Route path="/vs" element={<ComparisonsHub />} />
                    <Route path="/vs/asana" element={<VsAsana />} />
                    <Route path="/vs/clickup" element={<VsClickUp />} />
                    <Route path="/vs/trello" element={<VsTrello />} />
                    
                    {/* Admin Routes - login separate, dashboard with layout */}
                    <Route path="/admin" element={<AdminLogin />} />
                    <Route path="/admin/*" element={<AdminLayout />}>
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="analytics" element={<AdminAnalytics />} />
                      <Route path="content" element={<AdminContent />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="billing" element={<AdminBilling />} />
                      <Route path="growth" element={<AdminGrowth />} />
                      <Route path="system" element={<AdminSystem />} />
                      <Route path="webhooks" element={<AdminWebhooks />} />
                    </Route>
                    
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
                      <Route path="leads" element={<Leads />} />
                      <Route path="contratos" element={<Contratos />} />
                      <Route path="calendario" element={<Calendario />} />
                      <Route path="pagamentos" element={<Pagamentos />} />
                      <Route path="financeiro" element={<FinanceiroLayout />}>
                        <Route index element={<FinanceiroVisaoGeral />} />
                        <Route path="receitas" element={<FinanceiroReceitas />} />
                        <Route path="custos" element={<FinanceiroCustos />} />
                        <Route path="custos-extras" element={<FinanceiroCustosExtras />} />
                        <Route path="lucro" element={<FinanceiroLucro />} />
                      </Route>
                      <Route path="relatorios" element={<Relatorios />} />
                      <Route path="configuracoes" element={<Configuracoes />} />
                      <Route path="equipa" element={<Equipa />} />
                      <Route path="faturacao" element={<Faturacao />} />
                      <Route path="planos" element={<Planos />} />
                      {/* Redirect conta to planos */}
                      <Route path="conta" element={<Planos />} />
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