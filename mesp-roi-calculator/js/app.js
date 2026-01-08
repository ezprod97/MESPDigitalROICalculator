const App = {
  calculator: null,
  results: null,
  currency: 'USD',
  fanType: 'variable',

  async init() {
    await Utils.fetchExchangeRates();
    this.updateExchangeRateInfo();
    this.bindEvents();
    this.loadSavedInputs();
    this.parseUrlParams();
    ChartManager.init();
    this.initSectionToggles();
  },

  showCalculator(fanType) {
    this.fanType = fanType;
    document.getElementById('landingSection').classList.add('hidden');
    document.getElementById('calculatorSection').classList.remove('hidden');
    document.getElementById('fanTypeLabel').textContent =
      fanType === 'variable' ? 'Variable Frequency Fan' : 'Fixed Frequency Fan';

    // Show/hide VFD parameters based on fan type
    const vfdParams = document.getElementById('vfdParams');
    if (vfdParams) {
      vfdParams.style.display = fanType === 'variable' ? 'block' : 'none';
    }
  },

  showLanding() {
    document.getElementById('calculatorSection').classList.add('hidden');
    document.getElementById('landingSection').classList.remove('hidden');
  },

  updateExchangeRateInfo() {
    const infoEl = document.getElementById('exchangeRateInfo');
    if (infoEl && Utils.lastRateUpdate) {
      infoEl.innerHTML = `
        <span class="inline-flex items-center">
          <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>
          Exchange rates from Google Finance (${Utils.getLastUpdateText()})
        </span>
      `;
    }
  },

  bindEvents() {
    // Landing page buttons
    document.getElementById('startVariable')?.addEventListener('click', () => this.showCalculator('variable'));
    document.getElementById('startFixed')?.addEventListener('click', () => this.showCalculator('fixed'));
    document.getElementById('backToLanding')?.addEventListener('click', () => this.showLanding());

    document.getElementById('calculateBtn').addEventListener('click', () => this.calculate());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());
    document.getElementById('downloadPdfBtn').addEventListener('click', () => this.downloadPdf());
    document.getElementById('shareBtn').addEventListener('click', () => this.share());

    document.querySelectorAll('.input-field').forEach(input => {
      input.addEventListener('change', () => this.saveInputs());
    });
  },

  initSectionToggles() {
    document.querySelectorAll('.section-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const section = document.getElementById('section-' + toggle.dataset.section);
        section.classList.toggle('hidden');
        toggle.querySelector('svg').classList.toggle('rotate-180');
      });
    });
  },

  getConfig() {
    return {
      airVolume: Utils.getInputValue('airVolume'),
      fanType: this.fanType,
      mediaPrice: Utils.getInputValue('mediaPrice'),
      mespPrice: Utils.getInputValue('mespPrice'),
      mespEspPrice: Utils.getInputValue('mespEspPrice'),
      mediaInstall: Utils.getInputValue('mediaInstall'),
      mespInstall: Utils.getInputValue('mespInstall'),
      mespEspInstall: Utils.getInputValue('mespInstall') * 1.25,
      mediaFreq: Utils.getInputValue('mediaFreq'),
      mespFreq: Utils.getInputValue('mespFreq'),
      mespEspFreq: Math.max(1, Utils.getInputValue('mespFreq') - 1),
      totalPressure: Utils.getInputValue('totalPressure'),
      operatingDays: Utils.getInputValue('operatingDays'),
      runningTime: Utils.getInputValue('runningTime'),
      electricityPrice: Utils.getInputValue('electricityPrice'),
      fanEfficiency: Utils.getInputValue('fanEfficiency') || 0.8,
      mechanicalEfficiency: Utils.getInputValue('mechanicalEfficiency') || 0.92,
      mediaInitR: Utils.getInputValue('mediaInitR'),
      mediaFinalR: Utils.getInputValue('mediaFinalR'),
      mespInitR: Utils.getInputValue('mespInitR'),
      mespFinalR: Utils.getInputValue('mespFinalR'),
      mespEspInitR: Utils.getInputValue('mespEspInitR'),
      mespEspFinalR: Utils.getInputValue('mespEspFinalR')
    };
  },

  calculate() {
    const config = this.getConfig();
    this.currency = document.getElementById('currency').value;
    this.calculator = new MESPCalculator(config);
    this.results = this.calculator.calculate();
    const breakdown = this.calculator.getYearlyBreakdown();

    this.displayResults();
    ChartManager.updateChart(this.results, breakdown, this.currency);

    document.getElementById('resultsSection').classList.remove('hidden');
    document.getElementById('downloadPdfBtn').disabled = false;
    document.getElementById('shareBtn').disabled = false;
    
    this.saveInputs();
  },

  displayResults() {
    const r = this.results;
    const fmt = (v) => Utils.formatCurrency(v, this.currency);

    document.getElementById('totalSavings').textContent = fmt(r.mesp.yearlySavings * 10);
    document.getElementById('roiPeriod').textContent = `${r.mesp.roiYears.toFixed(2)} years`;
    document.getElementById('energySaving').textContent = Utils.formatPercent(r.mesp.energySavingRate);
    document.getElementById('roiPeriodEsp').textContent = `${r.mespEsp.roiYears.toFixed(2)} years`;

    const tableBody = document.getElementById('resultsTable');
    const rows = [
      { label: 'Equipment Cost (10Y)', key: 'equipmentCost' },
      { label: 'Labor Cost (10Y)', key: 'laborCost' },
      { label: 'Energy Cost (10Y)', key: 'energyCost' },
      { label: 'Total Investment (10Y)', key: 'totalInvestment', bold: true },
      { label: 'Yearly Savings', key: 'yearlySavings' },
      { label: 'ROI Period', key: 'roiYears', format: 'years' },
      { label: 'Energy Saving Rate', key: 'energySavingRate', format: 'percent' }
    ];

    tableBody.innerHTML = rows.map(row => {
      const values = ['media', 'mesp', 'mespEsp'].map(type => {
        let val = r[type][row.key];
        if (row.format === 'years') return type === 'media' ? '-' : `${val.toFixed(2)} years`;
        if (row.format === 'percent') return type === 'media' ? '-' : Utils.formatPercent(val);
        return type === 'media' && row.key === 'yearlySavings' ? '-' : fmt(val);
      });

      const minIdx = row.key === 'totalInvestment' ? values.indexOf(Math.min(...values.map(v => parseFloat(v.replace(/[^0-9.-]/g, '')) || Infinity)).toString()) : -1;

      return `<tr class="${row.bold ? 'font-semibold bg-gray-50' : ''}">
        <td class="px-4 py-3 text-sm text-gray-900">${row.label}</td>
        ${values.map((v, i) => `<td class="px-4 py-3 text-sm text-right ${i === 1 && row.key === 'totalInvestment' ? 'best-value' : ''}">${v}</td>`).join('')}
      </tr>`;
    }).join('');
  },

  reset() {
    document.querySelectorAll('.input-field').forEach(input => {
      input.value = input.defaultValue;
    });
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('downloadPdfBtn').disabled = true;
    document.getElementById('shareBtn').disabled = true;
    localStorage.removeItem('mesp_roi_inputs');
  },

  saveInputs() {
    const inputs = {};
    document.querySelectorAll('.input-field').forEach(input => {
      inputs[input.id] = input.value;
    });
    Utils.saveToLocalStorage('mesp_roi_inputs', inputs);
  },

  loadSavedInputs() {
    const saved = Utils.loadFromLocalStorage('mesp_roi_inputs');
    if (saved) {
      Object.entries(saved).forEach(([id, value]) => {
        Utils.setInputValue(id, value);
      });
    }
  },

  parseUrlParams() {
    const params = Utils.parseShareUrl();
    if (Object.keys(params).length > 0) {
      Object.entries(params).forEach(([key, value]) => {
        Utils.setInputValue(key, value);
      });
      setTimeout(() => this.calculate(), 100);
    }
  },

  async share() {
    const config = this.getConfig();
    const url = Utils.generateShareUrl(config);
    const success = await Utils.copyToClipboard(url);
    alert(success ? 'Link copied to clipboard!' : 'Failed to copy link');
  },

  downloadPdf() {
    if (!this.results) return;
    PDFGenerator.generate(this.results, this.getConfig(), this.currency);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
