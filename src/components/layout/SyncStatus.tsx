import { memo } from 'react';
import { CloudOff, RefreshCw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncStatusProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
}

/**
 * Indicador de conexão/fila offline. Só aparece quando há algo a comunicar:
 * offline, sincronizando, ou lançamentos pendentes de envio.
 */
export const SyncStatus = memo(function SyncStatus({ isOnline, isSyncing, pendingCount }: SyncStatusProps) {
  if (isOnline && !isSyncing && pendingCount === 0) return null;

  let icon = <Clock className="w-3.5 h-3.5" />;
  let label: string;
  let tone: string;

  if (!isOnline) {
    icon = <CloudOff className="w-3.5 h-3.5" />;
    label = pendingCount > 0 ? `Offline · ${pendingCount} pendente${pendingCount > 1 ? 's' : ''}` : 'Offline';
    tone = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  } else if (isSyncing) {
    icon = <RefreshCw className="w-3.5 h-3.5 animate-spin" />;
    label = 'Sincronizando…';
    tone = 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  } else {
    label = `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`;
    tone = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        tone,
      )}
      title={
        !isOnline
          ? 'Sem conexão. Novos lançamentos são salvos no aparelho e enviados quando a internet voltar.'
          : 'Enviando lançamentos feitos offline.'
      }
      role="status"
      aria-live="polite"
    >
      {icon}
      {label}
    </span>
  );
});
