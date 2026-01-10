import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";

// Pages
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Pricing from "./pages/Pricing";
import Features from "./pages/Features";
import Integrations from "./pages/Integrations";
import Security from "./pages/Security";
import Help from "./pages/Help";
import Dashboard from "./pages/app/Dashboard";
import Captacao from "./pages/app/Captacao";
import Edicao from "./pages/app/Edicao";
import Finalizados from "./pages/app/Finalizados";
import Projetos from "./pages/app/Projetos";
import Media from "./pages/app/Media";
import Clientes from "./pages/app/Clientes";
import Calendario from "./pages/app/Calendario";
import Pagamentos from "./pages/app/Pagamentos";
import Relatorios from "./pages/app/Relatorios";
import Configuracoes from "./pages/app/Configuracoes";
import Equipa from "./pages/app/Equipa";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import NotFound from "./pages/NotFound";
import AcceptInvite from "./pages/AcceptInvite";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/planos" element={<Pricing />} />
                <Route path="/funcionalidades" element={<Features />} />
                <Route path="/integracoes" element={<Integrations />} />
                <Route path="/seguranca" element={<Security />} />
                <Route path="/ajuda" element={<Help />} />
                <Route path="/convite" element={<AcceptInvite />} />
                
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
                  <Route path="projetos" element={<Projetos />} />
                  <Route path="media" element={<Media />} />
                  <Route path="clientes" element={<Clientes />} />
                  <Route path="calendario" element={<Calendario />} />
                  <Route path="pagamentos" element={<Pagamentos />} />
                  <Route path="relatorios" element={<Relatorios />} />
                  <Route path="configuracoes" element={<Configuracoes />} />
                  <Route path="equipa" element={<Equipa />} />
                </Route>

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;