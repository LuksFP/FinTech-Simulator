import { motion } from 'framer-motion';
import { Wallet, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  userEmail?: string;
  onSignOut?: () => void;
}

export function Header({ userEmail, onSignOut }: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="border-b border-border/50 bg-background/80 backdrop-blur-lg sticky top-0 z-50"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient-primary">
                Mini Fintech
              </h1>
              <p className="text-xs text-muted-foreground">
                Sistema de Controle Financeiro
              </p>
            </div>
          </div>
          
          {userEmail && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{userEmail}</span>
              </div>
              {onSignOut && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSignOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
