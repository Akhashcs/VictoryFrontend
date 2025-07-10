// Simple futures symbol helper

// Index configurations
export const INDEX_CONFIGS = {
  NIFTY: { name: 'NIFTY', lotSize: 75, defaultTarget: 40, defaultStopLoss: 10 },
  BANKNIFTY: { name: 'BANKNIFTY', lotSize: 35, defaultTarget: 60, defaultStopLoss: 15 },
  SENSEX: { name: 'SENSEX', lotSize: 20, defaultTarget: 80, defaultStopLoss: 20 }
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