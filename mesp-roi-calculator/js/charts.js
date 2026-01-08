let mainChart = null;
let currentChartType = 'comparison';
let currentCurrency = 'USD';

const ChartManager = {
  colors: {
    media: { bg: 'rgba(239, 68, 68, 0.7)', border: 'rgb(239, 68, 68)' },
    mesp: { bg: 'rgba(34, 197, 94, 0.7)', border: 'rgb(34, 197, 94)' },
    mespEsp: { bg: 'rgba(59, 130, 246, 0.7)', border: 'rgb(59, 130, 246)' }
  },

  init() {
    document.querySelectorAll('.chart-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentChartType = e.target.dataset.chart;
        if (window.lastResults) this.updateChart(window.lastResults, window.lastBreakdown, currentCurrency);
      });
    });
  },

  updateChart(results, breakdown, currency = 'USD') {
    window.lastResults = results;
    window.lastBreakdown = breakdown;
    currentCurrency = currency;
    const symbol = Utils.currencySymbols[currency] || '$';
    
    if (mainChart) mainChart.destroy();
    const ctx = document.getElementById('mainChart').getContext('2d');

    if (currentChartType === 'comparison') {
      this.renderComparisonChart(ctx, results, symbol, currency);
    } else if (currentChartType === 'breakdown') {
      this.renderBreakdownChart(ctx, results, symbol, currency);
    } else if (currentChartType === 'timeline') {
      this.renderTimelineChart(ctx, breakdown, symbol, currency);
    }
  },

  renderComparisonChart(ctx, results, symbol, currency) {
    mainChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Media Filter', 'MESP', 'MESP+ESP'],
        datasets: [{
          label: '10-Year Total Investment',
          data: [
            Utils.convertCurrency(results.media.totalInvestment, currency),
            Utils.convertCurrency(results.mesp.totalInvestment, currency),
            Utils.convertCurrency(results.mespEsp.totalInvestment, currency)
          ],
          backgroundColor: [this.colors.media.bg, this.colors.mesp.bg, this.colors.mespEsp.bg],
          borderColor: [this.colors.media.border, this.colors.mesp.border, this.colors.mespEsp.border],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${symbol}${Math.round(ctx.raw).toLocaleString()}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => symbol + Math.round(v).toLocaleString() }
          }
        }
      }
    });
  },

  renderBreakdownChart(ctx, results, symbol, currency) {
    mainChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Media Filter', 'MESP', 'MESP+ESP'],
        datasets: [
          {
            label: 'Equipment Cost',
            data: [
              Utils.convertCurrency(results.media.equipmentCost, currency),
              Utils.convertCurrency(results.mesp.equipmentCost, currency),
              Utils.convertCurrency(results.mespEsp.equipmentCost, currency)
            ],
            backgroundColor: 'rgba(251, 146, 60, 0.7)'
          },
          {
            label: 'Labor Cost',
            data: [
              Utils.convertCurrency(results.media.laborCost, currency),
              Utils.convertCurrency(results.mesp.laborCost, currency),
              Utils.convertCurrency(results.mespEsp.laborCost, currency)
            ],
            backgroundColor: 'rgba(168, 85, 247, 0.7)'
          },
          {
            label: 'Energy Cost',
            data: [
              Utils.convertCurrency(results.media.energyCost, currency),
              Utils.convertCurrency(results.mesp.energyCost, currency),
              Utils.convertCurrency(results.mespEsp.energyCost, currency)
            ],
            backgroundColor: 'rgba(14, 165, 233, 0.7)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${symbol}${Math.round(ctx.raw).toLocaleString()}` } }
        },
        scales: {
          x: { stacked: true },
          y: { stacked: true, ticks: { callback: (v) => symbol + Math.round(v).toLocaleString() } }
        }
      }
    });
  },

  renderTimelineChart(ctx, breakdown, symbol, currency) {
    mainChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9', 'Year 10'],
        datasets: [
          {
            label: 'Media Filter',
            data: breakdown.media.map(v => Utils.convertCurrency(v, currency)),
            borderColor: this.colors.media.border,
            backgroundColor: this.colors.media.bg,
            fill: false,
            tension: 0.1
          },
          {
            label: 'MESP',
            data: breakdown.mesp.map(v => Utils.convertCurrency(v, currency)),
            borderColor: this.colors.mesp.border,
            backgroundColor: this.colors.mesp.bg,
            fill: false,
            tension: 0.1
          },
          {
            label: 'MESP+ESP',
            data: breakdown.mespEsp.map(v => Utils.convertCurrency(v, currency)),
            borderColor: this.colors.mespEsp.border,
            backgroundColor: this.colors.mespEsp.bg,
            fill: false,
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${symbol}${Math.round(ctx.raw).toLocaleString()}` } }
        },
        scales: {
          y: { ticks: { callback: (v) => symbol + Math.round(v).toLocaleString() } }
        }
      }
    });
  }
};
