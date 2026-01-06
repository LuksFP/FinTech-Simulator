import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="border-b border-border/50 bg-background/80 backdrop-blur-lg sticky top-0 z-50"
    >
      <div className="container mx-auto px-4 py-4">
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
      </div>
    </motion.header>
  );
}
