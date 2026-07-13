import { Suspense, lazy } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { useSupabaseHealth } from "@/hooks/useSupabaseHealth";
import { MaintenanceScreen } from "@/components/layout/MaintenanceScreen";

// Routes are code-split so the initial bundle only ships the shell.
// Each page (and its heavy deps like charts) loads on demand.
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

// Gate de disponibilidade: se o backend estiver fora (projeto pausado),
// mostra a tela de manutenção em vez de deixar o app quebrar com "Failed to
// fetch". Quando online e saudável, renderiza as rotas normalmente.
const AppContent = () => {
  const { status, isChecking, retry } = useSupabaseHealth();

  if (status === 'down') {
    return <MaintenanceScreen onRetry={retry} isChecking={isChecking} />;
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
