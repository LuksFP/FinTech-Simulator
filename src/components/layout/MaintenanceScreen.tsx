import { memo } from 'react';
import { RefreshCw, ServerCog } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MaintenanceScreenProps {
  onRetry: () => void;
  isChecking: boolean;
}

export const MaintenanceScreen = memo(function MaintenanceScreen({
  onRetry,
  isChecking,
}: MaintenanceScreenProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ServerCog className="w-8 h-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold">Voltamos já já</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O MyFinance está momentaneamente indisponível — o servidor está
            religando e isso costuma levar só alguns instantes. Seus dados estão
            seguros.
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={onRetry} disabled={isChecking} className="gap-2 w-full sm:w-auto">
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Reconectando…' : 'Tentar novamente'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Também tentamos reconectar automaticamente a cada poucos segundos.
          </p>
        </div>
      </div>
    </div>
  );
});
