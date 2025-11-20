/**
 * Static database of common European and US stocks
 * Format: { ticker, name, aliases, exchange }
 */

export interface TickerEntry {
  ticker: string;
  name: string;
  aliases: string[]; // Alternative names/abbreviations
  exchange: string;
}

/**
 * Database of well-known stocks (focus: European markets)
 * Priorité : Actions françaises et allemandes
 */
export const TICKER_DATABASE: TickerEntry[] = [
  // French Stocks (Euronext Paris)
  {
    ticker: 'MC.PA',
    name: 'LVMH Moët Hennessy Louis Vuitton SE',
    aliases: ['LVMH', 'Moët Hennessy', 'Louis Vuitton'],
    exchange: 'Paris',
  },
  {
    ticker: 'AIR.PA',
    name: 'Airbus SE',
    aliases: ['Airbus', 'Air'],
    exchange: 'Paris',
  },
  {
    ticker: 'CAP.PA',
    name: 'Capgemini SE',
    aliases: ['Capgemini', 'Cap'],
    exchange: 'Paris',
  },
  {
    ticker: 'TTE.PA',
    name: 'TotalEnergies SE',
    aliases: ['Total', 'TotalEnergies'],
    exchange: 'Paris',
  },
  {
    ticker: 'BNP.PA',
    name: 'BNP Paribas',
    aliases: ['BNP', 'BNP Paribas'],
    exchange: 'Paris',
  },
  {
    ticker: 'OR.PA',
    name: "L'Oréal",
    aliases: ['Loreal', 'L\'Oréal', 'Oreal'],
    exchange: 'Paris',
  },
  {
    ticker: 'SAN.PA',
    name: 'Sanofi',
    aliases: ['Sanofi'],
    exchange: 'Paris',
  },
  {
    ticker: 'DG.PA',
    name: 'Vinci SA',
    aliases: ['Vinci'],
    exchange: 'Paris',
  },
  {
    ticker: 'SU.PA',
    name: 'Schneider Electric SE',
    aliases: ['Schneider', 'Schneider Electric'],
    exchange: 'Paris',
  },
  {
    ticker: 'CS.PA',
    name: 'AXA SA',
    aliases: ['AXA'],
    exchange: 'Paris',
  },

  // German Stocks (XETRA)
  {
    ticker: 'BMW.DE',
    name: 'Bayerische Motoren Werke AG',
    aliases: ['BMW'],
    exchange: 'XETRA',
  },
  {
    ticker: 'SIE.DE',
    name: 'Siemens AG',
    aliases: ['Siemens'],
    exchange: 'XETRA',
  },
  {
    ticker: 'VOW.DE',
    name: 'Volkswagen AG',
    aliases: ['Volkswagen', 'VW'],
    exchange: 'XETRA',
  },
  {
    ticker: 'SAP.DE',
    name: 'SAP SE',
    aliases: ['SAP'],
    exchange: 'XETRA',
  },
  {
    ticker: 'MBG.DE',
    name: 'Mercedes-Benz Group AG',
    aliases: ['Mercedes', 'Mercedes-Benz', 'Daimler'],
    exchange: 'XETRA',
  },
  {
    ticker: 'ADS.DE',
    name: 'Adidas AG',
    aliases: ['Adidas'],
    exchange: 'XETRA',
  },
  {
    ticker: 'BAS.DE',
    name: 'BASF SE',
    aliases: ['BASF'],
    exchange: 'XETRA',
  },

  // US Stocks (NASDAQ/NYSE)
  {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    aliases: ['Apple'],
    exchange: 'NASDAQ',
  },
  {
    ticker: 'MSFT',
    name: 'Microsoft Corporation',
    aliases: ['Microsoft'],
    exchange: 'NASDAQ',
  },
  {
    ticker: 'GOOGL',
    name: 'Alphabet Inc.',
    aliases: ['Google', 'Alphabet'],
    exchange: 'NASDAQ',
  },
  {
    ticker: 'AMZN',
    name: 'Amazon.com Inc.',
    aliases: ['Amazon'],
    exchange: 'NASDAQ',
  },
  {
    ticker: 'TSLA',
    name: 'Tesla Inc.',
    aliases: ['Tesla'],
    exchange: 'NASDAQ',
  },
  {
    ticker: 'META',
    name: 'Meta Platforms Inc.',
    aliases: ['Meta', 'Facebook'],
    exchange: 'NASDAQ',
  },
  {
    ticker: 'NVDA',
    name: 'NVIDIA Corporation',
    aliases: ['NVIDIA', 'Nvidia'],
    exchange: 'NASDAQ',
  },
  {
    ticker: 'JPM',
    name: 'JPMorgan Chase & Co.',
    aliases: ['JPMorgan', 'JP Morgan'],
    exchange: 'NYSE',
  },
  {
    ticker: 'V',
    name: 'Visa Inc.',
    aliases: ['Visa'],
    exchange: 'NYSE',
  },
  {
    ticker: 'JNJ',
    name: 'Johnson & Johnson',
    aliases: ['Johnson & Johnson', 'J&J'],
    exchange: 'NYSE',
  },
];
