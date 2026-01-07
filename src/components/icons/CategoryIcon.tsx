import {
  Wallet,
  Briefcase,
  TrendingUp,
  Plus,
  UtensilsCrossed,
  Car,
  Home,
  Heart,
  Gamepad2,
  GraduationCap,
  Package,
  HelpCircle,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Wallet,
  Briefcase,
  TrendingUp,
  Plus,
  UtensilsCrossed,
  Car,
  Home,
  Heart,
  Gamepad2,
  GraduationCap,
  Package,
};

interface CategoryIconProps {
  icon: string;
  className?: string;
  style?: React.CSSProperties;
}

export function CategoryIcon({ icon, className, style }: CategoryIconProps) {
  const IconComponent = iconMap[icon] || HelpCircle;
  return <IconComponent className={className} style={style} />;
}
