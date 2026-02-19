// Vision4Life – Simple & Robust Eco-Calculator
// Formula: Total Impact = Mobility + Diet + Energy + Consumption

window.Utils = {

    // ─── 1. MOBILITY ───
    // Factors (kg CO2 per km)
    // Car: 0.15, Bike: 0.06, Bus: 0.06, Metro: 0.04, Cycle/Walk: 0.00
    factors: { car: 0.15, bike: 0.06, bus: 0.06, metro: 0.04, cycle: 0.00 },

    calculateMobility(state) {
        const mix = state.transportMix || {};
        const days = state.days || 5;
        let dailyEmission = 0;

        // Sum emissions from all modes
        for (const [mode, km] of Object.entries(mix)) {
            dailyEmission += (km || 0) * (this.factors[mode] || 0);
        }

        const annualKg = dailyEmission * days * 52;
        return { daily: dailyEmission, annualKg };
    },

    // ─── 2. DIET ───
    // Non-Veg Meal: 3.0 kg, Veg Meal: 1.0 kg
    // Dairy: 0.5 kg/day
    calculateDiet(state) {
        const nv = state.nonVegMeals || 0;
        const veg = 21 - nv; // 21 total meals/week
        const dairy = state.hasDairy ? 0.5 * 7 : 0; // Weekly dairy

        const weeklyKg = (nv * 3.0) + (veg * 1.0) + dairy;
        const annualKg = weeklyKg * 52;

        return { daily: weeklyKg / 7, annualKg };
    },

    // ─── 3. ENERGY ───
    // Grid: 0.7 kg/kWh
    calculateEnergy(state) {
        const kwh = state.monthlyKwh || 100;
        const ac = state.acHours || 0;

        // Annual Elec + Annual AC (1kwh/hr * 365)
        const totalKwh = (kwh * 12) + (ac * 365);
        const annualKg = totalKwh * 0.7;

        return { daily: annualKg / 365, annualKg };
    },

    // ─── 4. CONSUMPTION ───
    // Clothing: Monthly(300), Quarterly(150), Bi-annual(80), Rarely(40)
    // Plastic: High(120), Medium(70), Low(30)
    clothing: { monthly: 300, quarterly: 150, biannual: 80, rarely: 40 },
    plastic: { high: 120, medium: 70, low: 30 },

    calculateConsumption(state) {
        const cf = state.clothingFreq || 'quarterly';
        const pl = state.plasticLevel || 'medium';
        const ff = state.isFastFashion || false;

        let clothKg = this.clothing[cf] || 150;
        if (ff) clothKg *= 1.5;

        const plasKg = this.plastic[pl] || 70;
        const annualKg = clothKg + plasKg;

        return { daily: annualKg / 365, annualKg };
    },

    // ─── UNIFIED CALCULATOR ───
    calculate(mod, state) {
        let res = { daily: 0, annualKg: 0 };
        try {
            switch (mod) {
                case 'mobility': res = this.calculateMobility(state); break;
                case 'diet': res = this.calculateDiet(state); break;
                case 'energy': res = this.calculateEnergy(state); break;
                case 'consumption': res = this.calculateConsumption(state); break;
            }
        } catch (e) { console.warn("Calc Error", e); }

        // Append Common Stats
        res.annualT = res.annualKg / 1000;
        res.treesRequired = Math.ceil(res.annualKg / 20); // 1 Tree = 20kg absorption
        res.challenge14Day = (res.annualKg / 365) * 14;

        return res;
    },

    // ─── HEAL SCENARIO (SHIFT) ───
    calculateHeal(mod, state) {
        const current = this.calculate(mod, state);

        // Create a 'Better' State based on Master Prompt Rules
        let healState = JSON.parse(JSON.stringify(state)); // Deep copy

        switch (mod) {
            case 'mobility':
                // Reduce Car/Bike KM by 20%
                if (healState.transportMix) {
                    ['car', 'bike'].forEach(m => {
                        if (healState.transportMix[m]) {
                            healState.transportMix[m] = Math.round(healState.transportMix[m] * 0.8);
                        }
                    });
                    // Note: We don't necessarily add to public transport in the 'simple' formula, 
                    // just assuming user reduced travel or carpooled.
                }
                break;

            case 'diet':
                // Replace 5 NV meals
                healState.nonVegMeals = Math.max(0, (state.nonVegMeals || 0) - 5);
                break;

            case 'energy':
                // Reduce 1 kWh per day (30/month)
                healState.monthlyKwh = Math.max(0, (state.monthlyKwh || 100) - 30);
                break;

            case 'consumption':
                // Reduce clothing frequency one level
                const levels = ['monthly', 'quarterly', 'biannual', 'rarely'];
                const idx = levels.indexOf(state.clothingFreq || 'quarterly');
                if (idx < 3) healState.clothingFreq = levels[idx + 1];
                healState.isFastFashion = false;
                break;
        }

        const target = this.calculate(mod, healState);

        return {
            current,
            target,
            savings: {
                annualKg: Math.max(0, current.annualKg - target.annualKg),
                treesSaved: Math.max(0, current.treesRequired - target.treesRequired),
                challengeSavedKg: Math.max(0, current.challenge14Day - target.challenge14Day)
            }
        };
    }
};
