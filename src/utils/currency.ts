/**
 * Utilidades para formateo de moneda en soles peruanos
 */

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const formatCurrencyCompact = (value: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: 'compact'
  }).format(value);
};

export const parseCurrency = (value: string): number => {
  // Remover símbolos de moneda y espacios, convertir comas a puntos
  const cleanValue = value.replace(/[S/.\s]/g, '').replace(',', '.');
  return parseFloat(cleanValue) || 0;
};

export const CURRENCY_SYMBOL = 'S/';
export const CURRENCY_CODE = 'PEN';
export const LOCALE = 'es-PE';