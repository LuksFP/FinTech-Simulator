import { z } from 'zod';

export const strongPasswordSchema = z
  .string()
  .min(8, 'Mínimo de 8 caracteres')
  .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiúscula')
  .regex(/[a-z]/, 'Deve conter pelo menos uma letra minúscula')
  .regex(/[0-9]/, 'Deve conter pelo menos um número')
  .regex(/[^A-Za-z0-9]/, 'Deve conter pelo menos um caractere especial (!@#$...)');

export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
}

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels: PasswordStrength[] = [
    { score: 0, label: 'Muito fraca', color: 'bg-destructive' },
    { score: 1, label: 'Fraca', color: 'bg-orange-500' },
    { score: 2, label: 'Razoável', color: 'bg-yellow-500' },
    { score: 3, label: 'Forte', color: 'bg-emerald-400' },
    { score: 4, label: 'Muito forte', color: 'bg-emerald-600' },
  ];

  return levels[score];
}
