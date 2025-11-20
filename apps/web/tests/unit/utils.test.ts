import { describe, it, expect } from 'vitest';
import { formatNumber, formatPrice, formatDate } from '@/lib/utils';

/**
 * Tests unitaires - Utilitaires
 */

describe('formatNumber', () => {
  it('devrait formater un nombre avec 2 décimales par défaut', () => {
    expect(formatNumber(1234.56)).toBe('1 234,56');
  });

  it('devrait respecter le nombre de décimales spécifié', () => {
    expect(formatNumber(1234.5678, 3)).toBe('1 234,568');
  });

  it('devrait gérer les grands nombres', () => {
    expect(formatNumber(1000000)).toBe('1 000 000,00');
  });
});

describe('formatPrice', () => {
  it('devrait formater un prix en EUR par défaut', () => {
    expect(formatPrice(1234.56)).toBe('1 234,56 €');
  });

  it('devrait formater un prix en USD', () => {
    expect(formatPrice(1234.56, 'USD')).toBe('1 234,56 $US');
  });
});

describe('formatDate', () => {
  it('devrait formater une date', () => {
    const date = new Date('2025-01-15T14:30:00');
    const formatted = formatDate(date);

    // Vérifier que la date contient au moins l'année
    expect(formatted).toContain('2025');
  });
});
