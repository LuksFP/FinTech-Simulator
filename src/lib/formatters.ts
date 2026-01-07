/**
 * Utility functions for formatting values across the application
 * Centralized to ensure consistency and avoid code duplication
 */

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const currencyCompactFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const formatCurrency = (value: number): string => {
  return currencyFormatter.format(value);
};

export const formatCurrencyCompact = (value: number): string => {
  return currencyCompactFormatter.format(value);
};

export const formatPercent = (value: number): string => {
  return percentFormatter.format(value / 100);
};

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

export const getMonthName = (month: number): string => {
  return MONTH_NAMES[month] || '';
};
