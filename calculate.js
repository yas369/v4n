// Vision4Life – Multi-Module Emission Calculator
// All factors hardcoded. Consistency > scientific precision.

window.Utils = {

    // ═══════════════════════════════════════
    // MODULE 1: MOBILITY
    // ═══════════════════════════════════════
    mobilityFactors: {
        car: 0.15,      // kg CO₂ per km
        bike: 0.06,     // two-wheeler
        bus: 0.06,
        metro: 0.04,
        cycle: 0.01
    },

    calculateMobility(state) {
        const D = state.distance || 15;    // km/day
        const W = state.days || 5;         // days/week

        // Daily Emission = sum(mode_km × factor)
        let dailyEmission = 0;
        for (const [mode, km] of Object.entries(state.transportMix || {})) {
            if (km > 0) {
                dailyEmission += km * (this.mobilityFactors[mode] || 0);
            }
        }

        const annualKg = dailyEmission * W * 52;
        const annualT = annualKg / 1000;
        const challenge14 = dailyEmission * W * 2;
        const trees = Math.ceil(annualKg / 20);

        return { daily: dailyEmission, annualKg, annualT, challenge14Day: challenge14, treesRequired: trees };
    },

    // ═══════════════════════════════════════
    // MODULE 2: DIET
    // ═══════════════════════════════════════
    // NV meal avg = 3 kg CO₂, Veg meal = 1 kg CO₂
    // 21 meals/week (3/day × 7)

    calculateDiet(state) {
        const NV = state.nonVegMeals || 0;         // non-veg meals per week
        const DY = state.hasDairy || false;

        const weeklyKg = (NV * 3) + ((21 - NV) * 1);
        // Dairy: ~0.5 kg/day if yes
        const dairyWeekly = DY ? 0.5 * 7 : 0;
        const totalWeekly = weeklyKg + dairyWeekly;

        const annualKg = totalWeekly * 52;
        const annualT = annualKg / 1000;
        const challenge14 = totalWeekly * 2;
        const trees = Math.ceil(annualKg / 20);

        return { daily: totalWeekly / 7, annualKg, annualT, challenge14Day: challenge14, treesRequired: trees };
    },

    // ═══════════════════════════════════════
    // MODULE 3: HOME ENERGY
    // ═══════════════════════════════════════
    // India grid: 1 kWh ≈ 0.7 kg CO₂
    // AC: ~1 kWh per hour

    calculateEnergy(state) {
        const E = state.monthlyKwh || 100;     // kWh/month
        const AC = state.acHours || 0;          // hours/day

        const annualElecKwh = E * 12;
        const annualAcKwh = AC * 365;           // 1 kWh per hour
        const totalAnnualKwh = annualElecKwh + annualAcKwh;

        const annualKg = totalAnnualKwh * 0.7;
        const annualT = annualKg / 1000;
        const challenge14 = (annualKg / 365) * 14;
        const trees = Math.ceil(annualKg / 20);

        return { daily: annualKg / 365, annualKg, annualT, challenge14Day: challenge14, treesRequired: trees };
    },

    // ═══════════════════════════════════════
    // MODULE 4: CONSUMPTION
    // ═══════════════════════════════════════
    // Clothing: categorical annual kg
    // Plastic: categorical annual kg

    clothingMap: {
        monthly: 300,
        quarterly: 150,
        biannual: 80,
        rarely: 40
    },

    plasticMap: {
        high: 120,
        medium: 70,
        low: 30
    },

    calculateConsumption(state) {
        const CF = state.clothingFreq || 'quarterly';
        const FF = state.isFastFashion || false;
        const PL = state.plasticLevel || 'medium';

        let clothingKg = this.clothingMap[CF] || 150;
        if (FF) clothingKg *= 1.5;  // Fast fashion markup
        const plasticKg = this.plasticMap[PL] || 70;

        const annualKg = clothingKg + plasticKg;
        const annualT = annualKg / 1000;
        const challenge14 = annualKg * (14 / 365);
        const trees = Math.ceil(annualKg / 20);

        return { daily: annualKg / 365, annualKg, annualT, challenge14Day: challenge14, treesRequired: trees };
    },

    // ═══════════════════════════════════════
    // UNIFIED API
    // ═══════════════════════════════════════
    calculate(module, state) {
        switch (module) {
            case 'mobility': return this.calculateMobility(state);
            case 'diet': return this.calculateDiet(state);
            case 'energy': return this.calculateEnergy(state);
            case 'consumption': return this.calculateConsumption(state);
            default: return { daily: 0, annualKg: 0, annualT: 0, challenge14Day: 0, treesRequired: 0 };
        }
    },

    // ═══════════════════════════════════════
    // HEAL SCENARIOS (per spec)
    // ═══════════════════════════════════════
    calculateHeal(module, state) {
        const current = this.calculate(module, state);
        let healState = { ...state };

        switch (module) {
            case 'mobility': {
                // Reduce car/bike by 50%, shift to metro/bus/cycle
                const newMix = { ...state.transportMix };
                let shift = 0;
                ['car', 'bike'].forEach(m => {
                    if (newMix[m] > 0) {
                        const r = Math.round(newMix[m] * 0.5);
                        newMix[m] -= r;
                        shift += r;
                    }
                });
                if (shift > 0) {
                    newMix.metro = (newMix.metro || 0) + Math.round(shift * 0.4);
                    newMix.bus = (newMix.bus || 0) + Math.round(shift * 0.4);
                    newMix.cycle = (newMix.cycle || 0) + Math.round(shift * 0.2);
                    const oldT = Object.values(state.transportMix).reduce((a, b) => a + b, 0);
                    const newT = Object.values(newMix).reduce((a, b) => a + b, 0);
                    if (newT < oldT) newMix.cycle += (oldT - newT);
                }
                healState.transportMix = newMix;
                break;
            }
            case 'diet':
                // Reduce 5 NV meals → replaced by veg. Dairy off.
                healState.nonVegMeals = Math.max(0, (state.nonVegMeals || 0) - 5);
                healState.hasDairy = false;
                break;
            case 'energy':
                // Reduce 1 kWh/day for 14 days → project annually
                healState.monthlyKwh = Math.round((state.monthlyKwh || 100) * 0.85);
                healState.acHours = Math.max(0, (state.acHours || 0) - 2);
                break;
            case 'consumption':
                // No new purchases for 14 days → 5% annual saving
                healState.clothingFreq = 'rarely';
                healState.isFastFashion = false;
                healState.plasticLevel = 'low';
                break;
        }

        const target = this.calculate(module, healState);

        return {
            current,
            target,
            savings: {
                annualKg: Math.max(0, current.annualKg - target.annualKg),
                treesSaved: Math.max(0, current.treesRequired - target.treesRequired),
                challengeSavedKg: Math.max(0, current.challenge14Day - target.challenge14Day),
                annualProjection: Math.max(0, (current.annualKg - target.annualKg))
            }
        };
    }
};
