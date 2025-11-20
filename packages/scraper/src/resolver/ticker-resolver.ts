/**
 * Ticker Resolver (Résolution nom → ticker)
 *
 * Exemples :
 * - "LVMH" → "MC.PA"
 * - "Airbus" → "AIR.PA"
 * - "Total" → "TTE.PA"
 * - "Apple" → "AAPL"
 *
 * Stratégie :
 * 1. Base locale (JSON statique pour tickers fréquents)
 * 2. Fuzzy matching pour typos
 * 3. Direct ticker input support
 */

import type { TickerResolution } from '../index';
import { TICKER_DATABASE, type TickerEntry } from './ticker-database';

interface MatchResult {
  entry: TickerEntry;
  confidence: number;
  matchType: 'exact' | 'alias' | 'fuzzy' | 'partial' | 'direct';
}

export async function resolveTickerFromName(query: string): Promise<TickerResolution> {
  // Validate input
  if (!query || query.trim() === '') {
    throw new Error('Query cannot be empty');
  }

  const normalizedQuery = query.trim();

  // Strategy 1: Direct ticker input (e.g., "CAP.PA", "AAPL")
  const directMatch = findDirectTickerMatch(normalizedQuery);
  if (directMatch) {
    return {
      query: normalizedQuery,
      ticker: directMatch.ticker,
      name: directMatch.name,
      exchange: directMatch.exchange,
      confidence: 1.0,
    };
  }

  // Strategy 2: Find best match in database
  const bestMatch = findBestMatch(normalizedQuery);

  if (!bestMatch || bestMatch.confidence < 0.5) {
    throw new Error(`Could not resolve ticker for: "${query}". No good match found.`);
  }

  return {
    query: normalizedQuery,
    ticker: bestMatch.entry.ticker,
    name: bestMatch.entry.name,
    exchange: bestMatch.entry.exchange,
    confidence: bestMatch.confidence,
  };
}

/**
 * Check if query is a direct ticker (e.g., "CAP.PA", "AAPL")
 */
function findDirectTickerMatch(query: string): TickerEntry | null {
  const upperQuery = query.toUpperCase();

  // Find exact ticker match
  const match = TICKER_DATABASE.find((entry) => entry.ticker.toUpperCase() === upperQuery);

  return match || null;
}

/**
 * Find best match using multiple strategies
 */
function findBestMatch(query: string): MatchResult | null {
  const normalizedQuery = query.toLowerCase();
  let bestMatch: MatchResult | null = null;
  let bestConfidence = 0;

  for (const entry of TICKER_DATABASE) {
    // Strategy 1: Exact name match
    if (entry.name.toLowerCase() === normalizedQuery) {
      return {
        entry,
        confidence: 1.0,
        matchType: 'exact',
      };
    }

    // Strategy 2: Exact alias match
    for (const alias of entry.aliases) {
      if (alias.toLowerCase() === normalizedQuery) {
        const match: MatchResult = {
          entry,
          confidence: 0.95,
          matchType: 'alias',
        };
        if (match.confidence > bestConfidence) {
          bestMatch = match;
          bestConfidence = match.confidence;
        }
      }
    }

    // Strategy 3: Partial match (starts with)
    for (const alias of entry.aliases) {
      const aliasLower = alias.toLowerCase();
      if (aliasLower.startsWith(normalizedQuery) || normalizedQuery.startsWith(aliasLower)) {
        const confidence = Math.min(normalizedQuery.length / aliasLower.length, 0.8);
        if (confidence > bestConfidence && confidence > 0.5) {
          bestMatch = {
            entry,
            confidence,
            matchType: 'partial',
          };
          bestConfidence = confidence;
        }
      }
    }

    // Strategy 4: Fuzzy match (Levenshtein distance)
    for (const alias of entry.aliases) {
      const distance = levenshteinDistance(normalizedQuery, alias.toLowerCase());
      const maxLength = Math.max(normalizedQuery.length, alias.length);
      const similarity = 1 - distance / maxLength;

      // Only consider if similarity is reasonable
      if (similarity > 0.7 && similarity > bestConfidence) {
        bestMatch = {
          entry,
          confidence: similarity,
          matchType: 'fuzzy',
        };
        bestConfidence = similarity;
      }
    }
  }

  return bestMatch;
}

/**
 * Calculate Levenshtein distance between two strings
 * (Edit distance - number of insertions/deletions/substitutions to transform a into b)
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
