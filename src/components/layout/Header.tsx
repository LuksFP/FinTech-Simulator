import { memo } from 'react';
import { motion } from 'framer-motion';
import { Wallet, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  userEmail?: string;
  onSignOut?: () => void;
}

export const Header = memo(function Header({ userEmail, onSignOut }: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="border-b border-border/50 bg-background/80 backdrop-blur-lg sticky top-0 z-50"
    >
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-primary shrink-0">
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gradient-primary truncate">
                Fintech Simulator
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden xs:block">
                Controle Financeiro Inteligente
              </p>
            </div>
          </div>
          
          {userEmail && (
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-[150px] lg:max-w-[200px]">{userEmail}</span>
              </div>
              {onSignOut && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSignOut}
                  className="text-muted-foreground hover:text-foreground gap-1 sm:gap-2 px-2 sm:px-3"
                  aria-label="Sair da conta"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
});
