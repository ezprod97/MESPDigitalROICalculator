const PDFGenerator = {
  logoBase64: null,
  arabicFontLoaded: false,

  async loadLogo() {
    if (this.logoBase64) return this.logoBase64;
    const logos = ['assets/icons/eng_Logo.png', 'assets/icons/1logo.png'];

    for (const logoPath of logos) {
      try {
        const response = await fetch(logoPath);
        if (!response.ok) continue;
        const blob = await response.blob();
        const result = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        this.logoBase64 = result;
        return result;
      } catch (e) {
        console.warn(`Could not load logo from ${logoPath}:`, e);
      }
    }
    return null;
  },

  async loadArabicFont(doc) {
    if (this.arabicFontLoaded) return;
    try {
      // Try loading from local assets first, then CDN
      let fontUrl = 'assets/fonts/NotoSansArabic-Regular.ttf';
      let response = await fetch(fontUrl).catch(() => null);

      if (!response || !response.ok) {
        // Fallback to CDN - using Noto Sans Arabic
        fontUrl = 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-arabic@5.0.18/files/noto-sans-arabic-arabic-400-normal.woff';
        response = await fetch(fontUrl);
      }

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        doc.addFileToVFS('NotoSansArabic.ttf', base64);
        doc.addFont('NotoSansArabic.ttf', 'NotoSansArabic', 'normal');
        this.arabicFontLoaded = true;
      }
    } catch (e) {
      console.warn('Could not load Arabic font:', e);
    }
  },

  containsArabic(text) {
    return /[\u0600-\u06FF]/.test(text);
  },

  async generate(results, config, currency) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const symbol = Utils.pdfCurrencySymbols[currency] || '$';
    const logo = await this.loadLogo();

    // Load Arabic font if needed
    await this.loadArabicFont(doc);

    if (logo) {
      doc.addImage(logo, 'PNG', 75, 10, 60, 15);
    } else {
      doc.setFontSize(20);
      doc.setTextColor(0, 119, 182);
      doc.text('AirQuality Technology', 105, 20, { align: 'center' });
    }
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('AHU Filtration ROI Analysis Report', 105, 35, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 43, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(0, 119, 182);
    doc.text('Project Parameters', 14, 55);

    // Helper to render text with Arabic support
    const renderText = (text, x, y, options = {}) => {
      if (this.containsArabic(text) && this.arabicFontLoaded) {
        doc.setFont('NotoSansArabic', 'normal');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      doc.text(text, x, y, options);
    };

    doc.setFontSize(10);
    doc.setTextColor(0);
    const params = [
      `Air Volume: ${config.airVolume.toLocaleString()} CMH`,
      `Fan Type: ${config.fanType === 'variable' ? 'Variable Frequency' : 'Fixed Frequency'}`,
      `Operating Hours: ${config.operatingDays} days × ${config.runningTime} hrs/day`,
      `Electricity Rate: ${symbol}${config.electricityPrice}/kWh`
    ];
    params.forEach((p, i) => doc.text(p, 14, 63 + i * 6));

    doc.setFontSize(12);
    doc.setTextColor(0, 119, 182);
    doc.text('10-Year Cost Comparison', 14, 95);

    // Configure autoTable to use Arabic font when needed
    const tableFont = this.arabicFontLoaded ? 'NotoSansArabic' : 'helvetica';

    doc.autoTable({
      startY: 100,
      head: [['Item', 'Media Filter', 'MESP', 'MESP+ESP']],
      body: [
        ['Equipment Cost', `${symbol}${Math.round(Utils.convertCurrency(results.media.equipmentCost, currency)).toLocaleString()}`, `${symbol}${Math.round(Utils.convertCurrency(results.mesp.equipmentCost, currency)).toLocaleString()}`, `${symbol}${Math.round(Utils.convertCurrency(results.mespEsp.equipmentCost, currency)).toLocaleString()}`],
        ['Labor Cost', `${symbol}${Math.round(Utils.convertCurrency(results.media.laborCost, currency)).toLocaleString()}`, `${symbol}${Math.round(Utils.convertCurrency(results.mesp.laborCost, currency)).toLocaleString()}`, `${symbol}${Math.round(Utils.convertCurrency(results.mespEsp.laborCost, currency)).toLocaleString()}`],
        ['Energy Cost', `${symbol}${Math.round(Utils.convertCurrency(results.media.energyCost, currency)).toLocaleString()}`, `${symbol}${Math.round(Utils.convertCurrency(results.mesp.energyCost, currency)).toLocaleString()}`, `${symbol}${Math.round(Utils.convertCurrency(results.mespEsp.energyCost, currency)).toLocaleString()}`],
        ['Total Investment', `${symbol}${Math.round(Utils.convertCurrency(results.media.totalInvestment, currency)).toLocaleString()}`, `${symbol}${Math.round(Utils.convertCurrency(results.mesp.totalInvestment, currency)).toLocaleString()}`, `${symbol}${Math.round(Utils.convertCurrency(results.mespEsp.totalInvestment, currency)).toLocaleString()}`]
      ],
      headStyles: { fillColor: [0, 119, 182], textColor: 255, font: tableFont },
      bodyStyles: { font: tableFont },
      alternateRowStyles: { fillColor: [240, 248, 255] }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(0, 119, 182);
    doc.text('ROI Summary', 14, finalY);

    doc.setFillColor(220, 252, 231);
    doc.rect(14, finalY + 5, 85, 25, 'F');
    doc.setFontSize(10);
    doc.setTextColor(22, 101, 52);
    doc.text('MESP Payback Period', 20, finalY + 15);
    doc.setFontSize(14);
    doc.text(`${results.mesp.roiYears.toFixed(2)} years`, 20, finalY + 25);

    doc.setFillColor(219, 234, 254);
    doc.rect(105, finalY + 5, 85, 25, 'F');
    doc.setFontSize(10);
    doc.setTextColor(30, 64, 175);
    doc.text('10-Year Savings (MESP)', 111, finalY + 15);
    doc.setFontSize(14);
    doc.text(`${symbol}${Math.round(Utils.convertCurrency(results.mesp.yearlySavings * 10, currency)).toLocaleString()}`, 111, finalY + 25);

    doc.setFillColor(207, 250, 254);
    doc.rect(14, finalY + 35, 85, 25, 'F');
    doc.setFontSize(10);
    doc.setTextColor(14, 116, 144);
    doc.text('Energy Saving Rate', 20, finalY + 45);
    doc.setFontSize(14);
    doc.text(`${(results.mesp.energySavingRate * 100).toFixed(1)}%`, 20, finalY + 55);

    doc.setFillColor(243, 232, 255);
    doc.rect(105, finalY + 35, 85, 25, 'F');
    doc.setFontSize(10);
    doc.setTextColor(107, 33, 168);
    doc.text('MESP+ESP Payback Period', 111, finalY + 45);
    doc.setFontSize(14);
    doc.text(`${results.mespEsp.roiYears.toFixed(2)} years`, 111, finalY + 55);

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('This report is generated by AirQuality Technology ROI Calculator', 105, 280, { align: 'center' });
    doc.text('www.airquality.com | info@airquality.com | +86 21 6139 7200', 105, 285, { align: 'center' });

    doc.save('MESP_ROI_Report.pdf');
  }
};
