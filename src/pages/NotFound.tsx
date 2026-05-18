import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

import { logger } from '@/lib/logger';
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        <title>Página não encontrada | WillFlow</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="A página que procura não foi encontrada. Volte à página inicial do WillFlow." />
      </Helmet>
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center px-4">
          <h1 className="mb-4 text-7xl font-bold text-primary">404</h1>
          <h2 className="mb-2 text-2xl font-semibold">Página não encontrada</h2>
          <p className="mb-6 text-muted-foreground max-w-md">
            A página que procura não existe ou foi movida. Verifique o endereço ou volte à página inicial.
          </p>
          <Button asChild size="lg" className="gap-2">
            <a href="/">
              <Home className="h-4 w-4" />
              Voltar à Página Inicial
            </a>
          </Button>
        </div>
      </div>
    </>
  );
};

export default NotFound;