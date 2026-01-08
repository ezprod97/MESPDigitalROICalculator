const Utils = {
  currencySymbols: {
    USD: '$', EUR: '€', AED: 'AED', SAR: 'SAR', CNY: '¥'
  },

  // PDF-safe symbols (only use standard fonts)
  pdfCurrencySymbols: {
    USD: '$', EUR: 'EUR', AED: 'AED', SAR: 'SAR', CNY: 'CNY'
  },

  exchangeRates: {
    USD: 1,
    EUR: 0.92,
    AED: 3.67,
    SAR: 3.75,
    CNY: 7.24
  },

  lastRateUpdate: null,

  async fetchExchangeRates() {
    const cached = this.loadFromLocalStorage('mesp_exchange_rates');
    const now = Date.now();

    if (cached && cached.timestamp && (now - cached.timestamp) < 24 * 60 * 60 * 1000) {
      this.exchangeRates = cached.rates;
      this.lastRateUpdate = new Date(cached.timestamp);
      return;
    }

    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();

      if (data && data.rates) {
        this.exchangeRates = {
          USD: 1,
          EUR: data.rates.EUR || 0.92,
          AED: data.rates.AED || 3.67,
          SAR: data.rates.SAR || 3.75,
          CNY: data.rates.CNY || 7.24
        };
        this.lastRateUpdate = new Date();
        this.saveToLocalStorage('mesp_exchange_rates', {
          rates: this.exchangeRates,
          timestamp: now
        });
      }
    } catch (e) {
      console.warn('Using fallback exchange rates:', e);
      const cached = this.loadFromLocalStorage('mesp_exchange_rates');
      if (cached) {
        this.exchangeRates = cached.rates;
        this.lastRateUpdate = new Date(cached.timestamp);
      }
    }
  },

  convertCurrency(valueInUSD, toCurrency) {
    const rate = this.exchangeRates[toCurrency] || 1;
    return valueInUSD * rate;
  },

  formatCurrency(value, currency = 'USD') {
    const symbol = this.currencySymbols[currency] || '$';
    const converted = this.convertCurrency(value, currency);
    return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  },

  formatNumber(value, decimals = 2) {
    return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  },

  formatPercent(value) {
    return `${(value * 100).toFixed(1)}%`;
  },

  getInputValue(id) {
    const el = document.getElementById(id);
    return el ? parseFloat(el.value) || 0 : 0;
  },

  setInputValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  },

  validateInput(id, min, max) {
    const el = document.getElementById(id);
    if (!el) return false;
    const value = parseFloat(el.value);
    const isValid = !isNaN(value) && value >= min && value <= max;
    el.classList.toggle('error', !isValid);
    return isValid;
  },

  saveToLocalStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('localStorage not available');
    }
  },

  loadFromLocalStorage(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  generateShareUrl(params) {
    const url = new URL(window.location.href.split('?')[0]);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  },

  parseShareUrl() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    params.forEach((value, key) => {
      result[key] = isNaN(value) ? value : parseFloat(value);
    });
    return result;
  },

  copyToClipboard(text) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  },

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  getLastUpdateText() {
    if (!this.lastRateUpdate) return 'Using default rates';
    return `Updated: ${this.lastRateUpdate.toLocaleDateString()}`;
  }
};
