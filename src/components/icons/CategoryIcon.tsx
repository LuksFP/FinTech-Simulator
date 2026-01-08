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
  ShoppingCart,
  Plane,
  Gift,
  Coffee,
  Smartphone,
  Music,
  Tag,
  CreditCard,
  Banknote,
  PiggyBank,
} from 'lucide-react';

export const iconOptions = [
  { value: 'Wallet', label: 'Carteira' },
  { value: 'Briefcase', label: 'Trabalho' },
  { value: 'TrendingUp', label: 'Investimento' },
  { value: 'UtensilsCrossed', label: 'Alimentação' },
  { value: 'Car', label: 'Transporte' },
  { value: 'Home', label: 'Casa' },
  { value: 'Heart', label: 'Saúde' },
  { value: 'Gamepad2', label: 'Lazer' },
  { value: 'GraduationCap', label: 'Educação' },
  { value: 'Package', label: 'Outros' },
  { value: 'ShoppingCart', label: 'Compras' },
  { value: 'Plane', label: 'Viagem' },
  { value: 'Gift', label: 'Presente' },
  { value: 'Coffee', label: 'Café' },
  { value: 'Smartphone', label: 'Tecnologia' },
  { value: 'Music', label: 'Música' },
  { value: 'Tag', label: 'Tag' },
  { value: 'CreditCard', label: 'Cartão' },
  { value: 'Banknote', label: 'Dinheiro' },
  { value: 'PiggyBank', label: 'Poupança' },
];

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
  ShoppingCart,
  Plane,
  Gift,
  Coffee,
  Smartphone,
  Music,
  Tag,
  CreditCard,
  Banknote,
  PiggyBank,
  tag: Tag,
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
