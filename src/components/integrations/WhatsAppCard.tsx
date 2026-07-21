import { memo } from 'react';
import { Lock } from 'lucide-react';

const WHATSAPP_GREEN = '#25D366';

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.001 3.2C8.94 3.2 3.2 8.94 3.2 16c0 2.26.6 4.46 1.73 6.4L3.09 28.9l6.66-1.75a12.73 12.73 0 0 0 6.25 1.6h.005c7.06 0 12.8-5.74 12.8-12.8 0-3.42-1.33-6.63-3.75-9.05a12.7 12.7 0 0 0-9.05-3.7Zm0 23.36h-.004a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-4.02 1.05 1.07-3.92-.25-.4a10.56 10.56 0 0 1-1.62-5.65c0-5.86 4.77-10.63 10.64-10.63 2.84 0 5.5 1.11 7.5 3.12a10.55 10.55 0 0 1 3.11 7.52c0 5.86-4.77 10.62-10.63 10.62Zm5.83-7.96c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.72.16-.21.32-.82 1.03-1 1.24-.19.21-.37.24-.68.08-.32-.16-1.35-.5-2.57-1.58-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.99-2.37-.26-.62-.52-.54-.72-.55l-.61-.01c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.66 0 1.57 1.14 3.08 1.3 3.29.16.21 2.25 3.44 5.45 4.82.76.33 1.36.53 1.82.68.77.24 1.46.21 2.01.13.61-.09 1.89-.77 2.16-1.52.27-.75.27-1.38.19-1.52-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  );
}

/**
 * Teaser da integração com WhatsApp (registrar gastos por mensagem).
 * Ainda travada — "Disponível em breve" com cadeado. Puramente visual,
 * sem backend. Layout vertical p/ caber numa coluna do grid bento.
 * Regra: toda feature nova aparece na tela.
 */
export const WhatsAppCard = memo(function WhatsAppCard() {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-muted/40 p-5">
      {/* leve brilho verde no canto — identidade sem sair do tema */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl opacity-20"
        style={{ background: WHATSAPP_GREEN }}
      />

      {/* Header */}
      <div className="relative flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
          style={{ background: WHATSAPP_GREEN }}
        >
          <WhatsAppGlyph className="h-5 w-5" />
        </span>
        <h3 className="text-base font-semibold">Registrar por WhatsApp</h3>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          <Lock className="h-3 w-3" /> Em breve
        </span>
      </div>

      <p className="relative mt-3 text-sm leading-snug text-muted-foreground">
        Anote um gasto mandando uma mensagem — sem abrir o app. A gente entende
        o valor, a categoria e lança sozinho.
      </p>

      {/* Mock de conversa — mostra o valor de forma tangível */}
      <div className="relative mt-4 rounded-xl border border-border/60 bg-background/50 p-3">
        <div className="space-y-2">
          <div className="flex justify-end">
            <span
              className="max-w-[80%] rounded-2xl rounded-br-sm px-3 py-1.5 text-xs text-white"
              style={{ background: WHATSAPP_GREEN }}
            >
              gastei 45 no ifood
            </span>
          </div>
          <div className="flex justify-start">
            <span className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-1.5 text-xs text-foreground/80">
              🔴 Anotado: <b>Ifood</b> · R$ 45,00
              <br />
              <span className="text-muted-foreground">categoria: Alimentação</span>
            </span>
          </div>
        </div>
      </div>

      {/* Botão travado (honesto — desabilitado, sem alert falso) */}
      <button
        type="button"
        disabled
        aria-disabled="true"
        title="Disponível em breve"
        className="relative mt-4 inline-flex cursor-not-allowed items-center gap-2 self-start rounded-lg border border-border bg-background/40 px-3.5 py-2 text-sm font-medium text-muted-foreground"
      >
        <Lock className="h-3.5 w-3.5" />
        Conectar WhatsApp
        <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
          em breve
        </span>
      </button>
    </div>
  );
});
