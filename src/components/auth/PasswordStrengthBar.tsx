import { memo } from 'react';
import { getPasswordStrength } from '@/lib/passwordStrength';
import { cn } from '@/lib/utils';

interface PasswordStrengthBarProps {
  password: string;
}

export const PasswordStrengthBar = memo(function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  if (!password) return null;

  const strength = getPasswordStrength(password);

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors duration-300',
              i <= strength.score - 1 ? strength.color : 'bg-muted'
            )}
          />
        ))}
      </div>
      <p className={cn('text-xs', strength.score <= 1 ? 'text-destructive' : 'text-muted-foreground')}>
        Força: {strength.label}
      </p>
    </div>
  );
});
