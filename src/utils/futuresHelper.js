// Simple futures symbol helper

// Index configurations
export const INDEX_CONFIGS = {
  NIFTY: { name: 'NIFTY', lotSize: 75, defaultTarget: 40, defaultStopLoss: 10 },
  BANKNIFTY: { name: 'BANKNIFTY', lotSize: 35, defaultTarget: 60, defaultStopLoss: 15 },
  SENSEX: { name: 'SENSEX', lotSize: 20, defaultTarget: 80, defaultStopLoss: 20 }
};

// Underlying configurations for all asset types
export const UNDERLYING_CONFIGS = {
  // Indices
  NIFTY: { name: 'NIFTY', type: 'index', lotSize: 75, defaultTarget: 40, defaultStopLoss: 10, exchange: 'NSE' },
  BANKNIFTY: { name: 'BANKNIFTY', type: 'index', lotSize: 35, defaultTarget: 60, defaultStopLoss: 15, exchange: 'NSE' },
  SENSEX: { name: 'SENSEX', type: 'index', lotSize: 20, defaultTarget: 80, defaultStopLoss: 20, exchange: 'BSE' },
  
  // Stocks (all 20 stocks from backend)
  TATASTEEL: { name: 'TATASTEEL', type: 'stock', lotSize: 100, defaultTarget: 25, defaultStopLoss: 6, exchange: 'NSE' },
  HINDALCO: { name: 'HINDALCO', type: 'stock', lotSize: 100, defaultTarget: 25, defaultStopLoss: 6, exchange: 'NSE' },
  SBIN: { name: 'SBIN', type: 'stock', lotSize: 100, defaultTarget: 30, defaultStopLoss: 8, exchange: 'NSE' },
  ADANIPORTS: { name: 'ADANIPORTS', type: 'stock', lotSize: 100, defaultTarget: 30, defaultStopLoss: 8, exchange: 'NSE' },
  WIPRO: { name: 'WIPRO', type: 'stock', lotSize: 100, defaultTarget: 25, defaultStopLoss: 6, exchange: 'NSE' },
  GRASIM: { name: 'GRASIM', type: 'stock', lotSize: 100, defaultTarget: 25, defaultStopLoss: 6, exchange: 'NSE' },
  HCLTECH: { name: 'HCLTECH', type: 'stock', lotSize: 100, defaultTarget: 25, defaultStopLoss: 6, exchange: 'NSE' },
  BPCL: { name: 'BPCL', type: 'stock', lotSize: 100, defaultTarget: 30, defaultStopLoss: 8, exchange: 'NSE' },
  M_M: { name: 'M_M', type: 'stock', lotSize: 100, defaultTarget: 25, defaultStopLoss: 6, exchange: 'NSE' },
  COALINDIA: { name: 'COALINDIA', type: 'stock', lotSize: 100, defaultTarget: 30, defaultStopLoss: 8, exchange: 'NSE' },
  SBILIFE: { name: 'SBILIFE', type: 'stock', lotSize: 100, defaultTarget: 25, defaultStopLoss: 6, exchange: 'NSE' },
  BAJFINANCE: { name: 'BAJFINANCE', type: 'stock', lotSize: 100, defaultTarget: 30, defaultStopLoss: 8, exchange: 'NSE' },
  BHARTIARTL: { name: 'BHARTIARTL', type: 'stock', lotSize: 100, defaultTarget: 25, defaultStopLoss: 6, exchange: 'NSE' },
  DRREDDY: { name: 'DRREDDY', type: 'stock', lotSize: 100, defaultTarget: 25, defaultStopLoss: 6, exchange: 'NSE' },
  HDFCBANK: { name: 'HDFCBANK', type: 'stock', lotSize: 100, defaultTarget: 30, defaultStopLoss: 8, exchange: 'NSE' },
  HEROMOTOCO: { name: 'HEROMOTOCO', type: 'stock', lotSize: 100, defaultTarget: 25, defaultStopLoss: 6, exchange: 'NSE' },
  ONGC: { name: 'ONGC', type: 'stock', lotSize: 100, defaultTarget: 30, defaultStopLoss: 8, exchange: 'NSE' },
  SUNPHARMA: { name: 'SUNPHARMA', type: 'stock', lotSize: 100, defaultTarget: 25, defaultStopLoss: 6, exchange: 'NSE' },
  APOLLOHOSP: { name: 'APOLLOHOSP', type: 'stock', lotSize: 100, defaultTarget: 25, defaultStopLoss: 6, exchange: 'NSE' },
  ICICIBANK: { name: 'ICICIBANK', type: 'stock', lotSize: 100, defaultTarget: 30, defaultStopLoss: 8, exchange: 'NSE' },
  
  // Commodities (example commodities - can be expanded)
  GOLD: { name: 'GOLD', type: 'commodity', lotSize: 100, defaultTarget: 50, defaultStopLoss: 15, exchange: 'MCX' },
  SILVER: { name: 'SILVER', type: 'commodity', lotSize: 1500, defaultTarget: 100, defaultStopLoss: 25, exchange: 'MCX' },
  CRUDEOIL: { name: 'CRUDEOIL', type: 'commodity', lotSize: 100, defaultTarget: 40, defaultStopLoss: 12, exchange: 'MCX' },
  COPPER: { name: 'COPPER', type: 'commodity', lotSize: 2500, defaultTarget: 60, defaultStopLoss: 18, exchange: 'MCX' },
  NICKEL: { name: 'NICKEL', type: 'commodity', lotSize: 1500, defaultTarget: 80, defaultStopLoss: 20, exchange: 'MCX' }
};

class FuturesHelper {
  // Get spot symbol for an index
  static getSpotSymbol(indexName) {
    const symbolMap = {
      'NIFTY': 'NSE:NIFTY50-INDEX',
      'BANKNIFTY': 'NSE:NIFTYBANK-INDEX',
      'SENSEX': 'BSE:SENSEX-INDEX'
    };
    
    return symbolMap[indexName.toUpperCase()] || `NSE:${indexName.toUpperCase()}-INDEX`;
  }

  // Helper to get last weekday of the month (0=Sunday, 1=Monday, ...)
  static getLastWeekdayOfMonth(year, month, weekday) {
    // month: 1-based (1=Jan, 12=Dec)
    const lastDay = new Date(year, month, 0); // last day of month
    let day = lastDay.getDate();
    while (lastDay.getDay() !== weekday) {
      lastDay.setDate(--day);
    }
    return new Date(lastDay);
  }

  // Helper to get correct expiry date for futures
  static getFuturesExpiry(indexName) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // JS: 0=Jan, Pine: 1=Jan
    let expiry;
    if (indexName.toUpperCase() === 'SENSEX') {
      // SENSEX: last Tuesday of the month
      expiry = this.getLastWeekdayOfMonth(year, month, 2); // 2=Tuesday
    } else {
      // NIFTY/BANKNIFTY: last Thursday of the month
      expiry = this.getLastWeekdayOfMonth(year, month, 4); // 4=Thursday
    }
    // If expiry is in the past, roll to next month
    if (now > expiry) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      if (indexName.toUpperCase() === 'SENSEX') {
        expiry = this.getLastWeekdayOfMonth(nextYear, nextMonth, 2);
      } else {
        expiry = this.getLastWeekdayOfMonth(nextYear, nextMonth, 4);
      }
    }
    return expiry;
  }

  // Helper to format expiry as YYMMM (e.g., 25JUL)
  static formatExpiryCode(expiry) {
    const yy = String(expiry.getFullYear()).slice(-2);
    const mmm = expiry.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    return yy + mmm;
  }

  // Generate correct futures symbol for the current expiry
  static getFuturesSymbol(indexName) {
    let prefix, code;
    if (indexName.toUpperCase() === 'SENSEX') {
      prefix = 'BSE:SENSEX';
    } else if (indexName.toUpperCase() === 'BANKNIFTY') {
      prefix = 'NSE:BANKNIFTY';
    } else {
      prefix = 'NSE:NIFTY';
    }
    const expiry = this.getFuturesExpiry(indexName);
    code = this.formatExpiryCode(expiry);
    return `${prefix}${code}FUT`;
  }

  // Calculate premium difference between futures and spot
  static calculatePremium(futuresPrice, spotPrice) {
    if (!futuresPrice || !spotPrice) return 0;
    return futuresPrice - spotPrice;
  }

  // Format premium for display
  static formatPremium(premium) {
    if (Math.abs(premium) >= 1000) {
      return `${premium >= 0 ? '+' : ''}${(premium / 1000).toFixed(1)}K`;
    }
    return `${premium >= 0 ? '+' : ''}${Math.round(premium)}`;
  }
}

export default FuturesHelper; 