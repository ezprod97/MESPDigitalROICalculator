class MESPCalculator {
  constructor(config = {}) {
    this.airVolume = config.airVolume || 50000;
    this.years = config.years || 10;
    this.electricityPrice = config.electricityPrice || 0.143;
    this.operatingDays = config.operatingDays || 365;
    this.runningTime = config.runningTime || 12;
    this.totalPressure = config.totalPressure || 1200;
    this.fanEfficiency = 0.8;
    this.mechanicalEfficiency = 0.92;
    this.fanType = config.fanType || 'variable';

    this.prices = {
      media: config.mediaPrice || 0.0214,
      mesp: config.mespPrice || 0.2143,
      mespEsp: config.mespEspPrice || 0.2429
    };

    this.installFees = {
      media: config.mediaInstall || 0.0071,
      mesp: config.mespInstall || 0.0114,
      mespEsp: config.mespEspInstall || 0.0143
    };

    this.maintFreq = {
      media: config.mediaFreq || 4,
      mesp: config.mespFreq || 4,
      mespEsp: config.mespEspFreq || 3
    };

    this.resistance = {
      media: { initial: config.mediaInitR || 120, final: config.mediaFinalR || 450 },
      mesp: { initial: config.mespInitR || 45, final: config.mespFinalR || 50 },
      mespEsp: { initial: config.mespEspInitR || 50, final: config.mespEspFinalR || 65 }
    };

    this.purifierPower = { mesp: 12, mespEsp: 20 };
    this.laborCostPerTime = 71.43;
  }

  getAvgResistance(type) {
    const r = this.resistance[type];
    return (r.initial + r.final) / 2;
  }

  getPurifierUnits() {
    return Math.ceil(this.airVolume / 3000);
  }

  calcEquipmentCost(type) {
    const filterPrice = this.airVolume * this.prices[type];
    if (type === 'media') {
      return filterPrice * this.maintFreq[type] * this.years;
    }
    return filterPrice;
  }

  calcLaborCost(type) {
    const installCost = this.airVolume * this.installFees[type];
    const annualLabor = this.laborCostPerTime * this.maintFreq[type];
    return installCost + (annualLabor * this.years);
  }

  getFanPowerFromLookup(airflow) {
    const table = [
      { airflow: 2070, power: 1.5 }, { airflow: 2880, power: 2.2 },
      { airflow: 4140, power: 3.7 }, { airflow: 5130, power: 3.7 },
      { airflow: 6210, power: 5.5 }, { airflow: 9540, power: 7.5 },
      { airflow: 11790, power: 11 }, { airflow: 15120, power: 15 },
      { airflow: 17100, power: 15 }, { airflow: 19260, power: 18.5 },
      { airflow: 23580, power: 18.5 }, { airflow: 29340, power: 18.5 },
      { airflow: 33750, power: 30 }, { airflow: 36360, power: 30 },
      { airflow: 38970, power: 30 }, { airflow: 43380, power: 30 },
      { airflow: 48510, power: 37 }, { airflow: 52290, power: 37 },
      { airflow: 109440, power: 90 }
    ];
    for (let i = 0; i < table.length; i++) {
      if (airflow <= table[i].airflow) return table[i].power;
    }
    return table[table.length - 1].power;
  }

  calcFanPower(type) {
    const basePower = this.getFanPowerFromLookup(this.airVolume);
    if (type === 'media') return basePower;

    if (this.fanType === 'variable') {
      const avgR_media = this.getAvgResistance('media');
      const avgR_type = this.getAvgResistance(type);
      const pressureDiff = avgR_media - avgR_type;
      const newPressure = this.totalPressure - pressureDiff;
      return basePower * (newPressure / this.totalPressure);
    }
    return basePower;
  }

  calcEnergyCost(type) {
    const fanPower = this.calcFanPower(type);
    const operatingHours = this.operatingDays * this.runningTime;
    let totalPower = fanPower;

    if (type !== 'media') {
      const purifierPowerKW = this.purifierPower[type] * this.getPurifierUnits() / 1000;
      totalPower += purifierPowerKW;
    }

    const yearlyKWH = totalPower * operatingHours;
    return yearlyKWH * this.electricityPrice * this.years;
  }

  calcEnergySavingRate(type) {
    if (type === 'media') return 0;
    const mediaEnergy = this.calcEnergyCost('media');
    const typeEnergy = this.calcEnergyCost(type);
    return (mediaEnergy - typeEnergy) / mediaEnergy;
  }

  calcTotalInvestment(type) {
    return this.calcEquipmentCost(type) + this.calcLaborCost(type) + this.calcEnergyCost(type);
  }

  calcYearlySavings(type) {
    if (type === 'media') return 0;
    const mediaCost = this.calcTotalInvestment('media');
    const typeCost = this.calcTotalInvestment(type);
    return (mediaCost - typeCost) / this.years;
  }

  calcROI(type) {
    if (type === 'media') return 0;
    const mediaInitial = (this.airVolume * this.prices.media) + (this.airVolume * this.installFees.media);
    const typeInitial = (this.airVolume * this.prices[type]) + (this.airVolume * this.installFees[type]);
    const initialDiff = typeInitial - mediaInitial;
    const yearlySavings = this.calcYearlySavings(type);
    if (yearlySavings <= 0) return Infinity;
    return initialDiff / yearlySavings;
  }

  calculate() {
    const types = ['media', 'mesp', 'mespEsp'];
    const results = {};
    types.forEach(type => {
      results[type] = {
        equipmentCost: this.calcEquipmentCost(type),
        laborCost: this.calcLaborCost(type),
        energyCost: this.calcEnergyCost(type),
        totalInvestment: this.calcTotalInvestment(type),
        yearlySavings: this.calcYearlySavings(type),
        roiYears: this.calcROI(type),
        energySavingRate: this.calcEnergySavingRate(type)
      };
    });
    return results;
  }

  getYearlyBreakdown() {
    const types = ['media', 'mesp', 'mespEsp'];
    const breakdown = { media: [], mesp: [], mespEsp: [] };
    
    types.forEach(type => {
      let cumulative = 0;
      const initialCost = (this.airVolume * this.prices[type]) + (this.airVolume * this.installFees[type]);
      const yearlyEquip = type === 'media' ? this.airVolume * this.prices[type] * this.maintFreq[type] : 0;
      const yearlyLabor = this.laborCostPerTime * this.maintFreq[type];
      const yearlyEnergy = this.calcEnergyCost(type) / this.years;
      
      for (let year = 0; year <= 10; year++) {
        if (year === 0) {
          cumulative = initialCost;
        } else {
          cumulative += yearlyEquip + yearlyLabor + yearlyEnergy;
        }
        breakdown[type].push(Math.round(cumulative));
      }
    });
    return breakdown;
  }
}
