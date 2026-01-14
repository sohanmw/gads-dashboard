// Exchange rate utility for currency conversion
// Uses exchangerate-api.com for historical rates with fallback to hardcoded rates

interface ExchangeRateCache {
    [key: string]: number; // Format: "CURRENCY-YYYY-MM" -> rate
}

// Hardcoded fallback rates (approximate averages for 2024)
const FALLBACK_RATES: Record<string, number> = {
    'USD': 1.0,
    'EUR': 1.08,
    'GBP': 1.27,
    'CAD': 0.74,
    'AUD': 0.66,
    'SGD': 0.75,
    'INR': 0.012,
    'JPY': 0.0067,
    'CNY': 0.14,
    'HKD': 0.13,
    'MYR': 0.22,
    'THB': 0.028,
    'IDR': 0.000063,
    'PHP': 0.018,
    'VND': 0.000040,
    'AED': 0.27,
    'SAR': 0.27,
    'ZAR': 0.055,
    'BRL': 0.20,
    'MXN': 0.058,
};

// In-memory cache for exchange rates
const exchangeRateCache: ExchangeRateCache = {};

/**
 * Get exchange rate for a currency on a specific date
 * @param currency - Currency code (e.g., 'EUR', 'GBP')
 * @param dateStr - Date string in format 'DD/MM/YYYY' or 'MM/DD/YYYY'
 * @returns Exchange rate to USD (1 CURRENCY = X USD)
 */
export async function getExchangeRate(currency: string, dateStr: string): Promise<number> {
    // USD is always 1.0
    if (!currency || currency === 'USD') return 1.0;

    // Parse date to get year and month
    const parts = dateStr.split('/');
    let year: string, month: string;

    if (parts.length === 3) {
        // Try to determine format
        const first = parseInt(parts[0]);
        const second = parseInt(parts[1]);

        if (first > 12) {
            // DD/MM/YYYY
            month = parts[1].padStart(2, '0');
            year = parts[2];
        } else if (second > 12) {
            // MM/DD/YYYY
            month = parts[0].padStart(2, '0');
            year = parts[2];
        } else {
            // Ambiguous, assume MM/DD/YYYY
            month = parts[0].padStart(2, '0');
            year = parts[2];
        }
    } else {
        // Fallback to current date
        const now = new Date();
        year = now.getFullYear().toString();
        month = (now.getMonth() + 1).toString().padStart(2, '0');
    }

    const cacheKey = `${currency}-${year}-${month}`;

    // Check cache first
    if (exchangeRateCache[cacheKey]) {
        return exchangeRateCache[cacheKey];
    }

    // Try to fetch from API
    try {
        const apiDate = `${year}-${month}-01`;
        const response = await fetch(
            `https://api.exchangerate-api.com/v4/history/${currency}/${apiDate}`
        );

        if (response.ok) {
            const data = await response.json();
            const rate = data.rates?.USD || FALLBACK_RATES[currency] || 1.0;
            exchangeRateCache[cacheKey] = rate;
            return rate;
        }
    } catch (error) {
        console.warn(`Failed to fetch exchange rate for ${currency} on ${year}-${month}, using fallback`);
    }

    // Use fallback rate
    const fallbackRate = FALLBACK_RATES[currency] || 1.0;
    exchangeRateCache[cacheKey] = fallbackRate;
    return fallbackRate;
}

/**
 * Convert amount from source currency to USD
 * @param amount - Amount in source currency
 * @param currency - Source currency code
 * @param dateStr - Date for exchange rate lookup
 * @returns Amount in USD
 */
export async function convertToUSD(
    amount: number,
    currency: string,
    dateStr: string
): Promise<number> {
    if (isNaN(amount) || amount === 0) return 0;

    const rate = await getExchangeRate(currency, dateStr);
    return amount * rate;
}

/**
 * Synchronous version using only fallback rates (for immediate use)
 */
export function convertToUSDSync(amount: number, currency: string): number {
    if (isNaN(amount) || amount === 0) return 0;
    if (!currency || currency === 'USD') return amount;

    const rate = FALLBACK_RATES[currency] || 1.0;
    return amount * rate;
}
