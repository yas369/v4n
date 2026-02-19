// Vision4Life depends on: calculate.js (Utils), animations.js (Effects)

// ─── Flowmap Navigation ───
window.Flowmap = class Flowmap {
    constructor() {
        this.el = document.getElementById('flowmap');
        this.handle = document.getElementById('flow-handle');
        this.nodes = document.querySelectorAll('.flow-node');

        this.isDragging = false;
        this.startPos = { x: 0, y: 0 };
        this.currentPos = { x: 0, y: 0 }; // Relative translation
        this.rafID = null;

        this.initDrag();
        this.initNav();
        this.initScrollSpy();
    }

    initDrag() {
        // Pointer events for mouse + touch
        this.handle.addEventListener('pointerdown', (e) => {
            this.isDragging = true;
            this.startPos = { x: e.clientX, y: e.clientY };
            // Capture initial element position relative to viewport
            const rect = this.el.getBoundingClientRect();
            this.initialElPos = { x: rect.left, y: rect.top };

            this.el.setPointerCapture(e.pointerId);
            this.el.style.transition = 'none';
            this.el.style.cursor = 'grabbing';
            e.preventDefault();
        });

        this.handle.addEventListener('pointermove', (e) => {
            if (!this.isDragging) return;
            e.preventDefault(); // Stop scroll on mobile

            const dx = e.clientX - this.startPos.x;
            const dy = e.clientY - this.startPos.y;

            // Use RAF for performance if needed, but direct style update is usually fine for single element
            // We update fixed position directly
            this.el.style.right = 'auto';
            this.el.style.bottom = 'auto';

            // Boundary checks
            let newX = this.initialElPos.x + dx;
            let newY = this.initialElPos.y + dy;

            // Keep on screen (padding 10px)
            const maxW = window.innerWidth - this.el.offsetWidth - 10;
            const maxH = window.innerHeight - this.el.offsetHeight - 10;

            newX = Math.max(10, Math.min(newX, maxW));
            newY = Math.max(10, Math.min(newY, maxH));

            this.el.style.left = `${newX}px`;
            this.el.style.top = `${newY}px`;
        });

        const stopDrag = (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            this.el.releasePointerCapture(e.pointerId);
            this.el.style.transition = 'transform 0.1s ease-out, box-shadow 0.3s';
            this.el.style.cursor = 'grab';
        };

        this.handle.addEventListener('pointerup', stopDrag);
        this.handle.addEventListener('pointercancel', stopDrag);

        // Touch specific safety (pointer events usually cover it, but just in case)
        this.handle.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }

    initNav() {
        this.nodes.forEach(node => {
            node.addEventListener('click', (e) => {
                // Ignore if we just dragged (simple check: if transition is active?)
                // But pointer events handle drag on handle, click on node is separate?
                // Yes, handle is distinct from nodes.

                const targetId = node.dataset.target;
                const target = document.getElementById(targetId);
                if (target) {
                    // Unhide if needed (P3/P4/P5 might be hidden)
                    target.classList.add('active');
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    initScrollSpy() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    this.nodes.forEach(n => n.classList.toggle('active', n.dataset.target === id));
                }
            });
        }, { threshold: 0.5 });

        ['p1-landing', 'p2-area', 'p3-input', 'p4-impact', 'p5-challenge'].forEach(id => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });
    }
};

// ─── Vision4Life App ───
window.Vision4Life = class Vision4Life {
    constructor() {
        this.screens = {
            p1: document.getElementById('p1-landing'),
            p2: document.getElementById('p2-area'),
            p3: document.getElementById('p3-input'),
            p4: document.getElementById('p4-impact'),
            p5: document.getElementById('p5-challenge')
        };

        this.modules = [
            { id: 'mobility', name: 'Mobility', icon: '🚗', desc: 'How your daily travel shapes your air.' },
            { id: 'diet', name: 'Diet', icon: '🥗', desc: 'How your meals impact forests.' },
            { id: 'energy', name: 'Home Energy', icon: '⚡', desc: 'How your electricity use affects emissions.' },
            { id: 'consumption', name: 'Consumption', icon: '🛍️', desc: 'How your purchases shape material demand.' }
        ];

        this.activeModule = null; // No default active module until selected

        this.state = {
            // Mobility
            distance: 15, days: 5,
            transportMix: { car: 15, bike: 0, bus: 0, metro: 0, cycle: 0 },
            // Diet
            nonVegMeals: 7, hasDairy: true,
            // Energy
            monthlyKwh: 150, acHours: 3,
            // Consumption
            clothingFreq: 'quarterly', isFastFashion: false, plasticLevel: 'medium',
            // Results
            calculated: null
        };

        this.init();
    }

    init() {
        this.renderFullProfile();
        this.bindEvents();
        if (window.Effects) window.Effects.init();

        // Init Flowmap active state
        // if (window.flowmap) window.flowmap.setActive('p1-landing');
    }

    // ─── NAVIGATION ───
    goTo(id) {
        const next = document.getElementById(id);
        if (next) {
            // Hide all pages? No, style.css handles .page.active
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            next.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Update Flowmap
            document.querySelectorAll('.flow-node').forEach(n => {
                n.classList.toggle('active', n.dataset.target === id);
            });
        }
    }

    // Scroll buttons removed

    // ─── PAGE 2: FULL PROFILE (ALL INPUTS) ───
    renderFullProfile() {
        const container = document.getElementById('profile-inputs-container');
        container.innerHTML = '';

        this.modules.forEach(mod => {
            const section = document.createElement('div');
            section.className = 'profile-section glass-card';
            section.style.marginBottom = '2rem';

            // Header
            section.innerHTML = `
                <div class="section-header" style="display:flex; align-items:center; gap:1rem; margin-bottom:1.5rem; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:1rem;">
                    <div style="font-size:2rem;">${mod.icon}</div>
                    <div>
                        <h3 style="margin:0; font-size:1.4rem;">${mod.name}</h3>
                        <p style="margin:0; opacity:0.7; font-size:0.9rem;">${mod.desc}</p>
                    </div>
                </div>
                <div class="section-body" id="body-${mod.id}"></div>
            `;
            container.appendChild(section);

            const body = section.querySelector(`#body-${mod.id}`);
            switch (mod.id) {
                case 'mobility': this.renderMobilityInputs(body); break;
                case 'diet': this.renderDietInputs(body); break;
                case 'energy': this.renderEnergyInputs(body); break;
                case 'consumption': this.renderConsumptionInputs(body); break;
            }
        });
    }

    calculateTotalImpact() {
        let totalKg = 0;
        let totalTrees = 0;
        let savingsKg = 0;
        let savingsTrees = 0;

        const results = {};

        this.modules.forEach(mod => {
            try {
                const res = Utils.calculateHeal(mod.id, this.state);
                console.log(`Calculated ${mod.id}:`, res);
                if (res && res.current) {
                    results[mod.id] = res;
                    totalKg += res.current.annualKg || 0;
                    totalTrees += res.current.treesRequired || 0;
                    savingsKg += res.savings.annualKg || 0;
                    savingsTrees += res.savings.treesSaved || 0;
                } else {
                    console.warn(`Invalid result for ${mod.id}`, res);
                }
            } catch (err) {
                console.error(`Error calculating ${mod.id}:`, err);
            }
        });

        // Store aggregated result
        this.state.calculated = {
            current: { annualKg: totalKg, treesRequired: totalTrees },
            target: { annualKg: totalKg - savingsKg, treesRequired: totalTrees - savingsTrees },
            savings: {
                annualKg: savingsKg,
                treesSaved: savingsTrees,
                challengeSavedKg: (savingsKg / 365) * 14
            },
            breakdown: results
        };
    }


    renderMobilityInputs(container) {
        // Distance Slider
        container.innerHTML += `
            <div class="glass-card">
                <label class="input-label">Total Daily Distance: <span id="dist-val">${this.state.distance}</span> km</label>
                <input type="range" id="inp-dist" class="vine-slider" min="1" max="100" value="${this.state.distance}">
            </div>
        `;

        // Days
        container.innerHTML += `
            <div class="glass-card">
                <label class="input-label">Days per week</label>
                <div class="days-row" id="days-row"></div>
            </div>
        `;

        // Mode Breakdown
        container.innerHTML += `
            <div class="glass-card">
                <label class="input-label">Mode Breakdown (<span id="mode-sum">${this.state.distance}</span> / <span id="dist-target">${this.state.distance}</span> km)</label>
                <div id="mix-sliders"></div>
                <div id="setup-warning" class="warning-text">Matches!</div>
            </div>
        `;

        // Bind after innerHTML is set
        requestAnimationFrame(() => {
            // Distance
            document.getElementById('inp-dist').addEventListener('input', (e) => {
                const v = parseInt(e.target.value);
                this.state.distance = v;
                document.getElementById('dist-val').innerText = v;
                document.getElementById('dist-target').innerText = v;
                this.validateMobility();
            });

            // Days
            const dRow = document.getElementById('days-row');
            for (let i = 1; i <= 7; i++) {
                const btn = document.createElement('button');
                btn.innerText = i;
                btn.className = 'day-btn' + (i === this.state.days ? ' selected' : '');
                btn.addEventListener('click', () => {
                    dRow.querySelectorAll('.day-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    this.state.days = i;
                });
                dRow.appendChild(btn);
            }

            // Mode Sliders
            this.state.transportMix = { car: this.state.distance, bike: 0, bus: 0, metro: 0, cycle: 0 };
            const modes = [
                { key: 'car', label: '🚗 Car' },
                { key: 'bike', label: '🏍️ Two-Wheeler' },
                { key: 'bus', label: '🚌 Bus' },
                { key: 'metro', label: '🚇 Metro' },
                { key: 'cycle', label: '🚲 Cycle/Walk' }
            ];
            const mRow = document.getElementById('mix-sliders');

            modes.forEach(({ key, label }) => {
                const div = document.createElement('div');
                div.className = 'mode-slider-row';
                div.innerHTML = `
                    <div class="mode-label"><span>${label}</span><span id="val-${key}">${this.state.transportMix[key]} km</span></div>
                    <input type="range" class="vine-slider mix-input" data-mode="${key}" min="0" max="100" value="${this.state.transportMix[key]}">
                `;
                mRow.appendChild(div);
            });

            mRow.querySelectorAll('.mix-input').forEach(inp => {
                inp.addEventListener('input', (e) => {
                    const mode = e.target.dataset.mode;
                    const val = parseInt(e.target.value);
                    this.state.transportMix[mode] = val;
                    document.getElementById(`val-${mode}`).innerText = val + ' km';
                    this.validateMobility();
                });
            });

            this.validateMobility();
        });
    }

    validateMobility() {
        const sum = Object.values(this.state.transportMix).reduce((a, b) => a + b, 0);
        const target = this.state.distance;
        const btn = document.getElementById('btn-reveal-impact');
        const warn = document.getElementById('setup-warning');
        const sumEl = document.getElementById('mode-sum');

        if (sumEl) sumEl.innerText = sum;

        if (sum === target) {
            if (warn) warn.style.opacity = '0';
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        } else {
            if (warn) {
                warn.style.opacity = '1';
                warn.innerText = sum < target ? `Add ${target - sum} more km` : `Remove ${sum - target} km`;
            }
            if (btn) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        }
    }

    renderDietInputs(container) {
        container.innerHTML = `
            <div class="glass-card">
                <label class="input-label">Non-veg meals per week: <span id="nveg-val">${this.state.nonVegMeals}</span></label>
                <input type="range" id="inp-nveg" class="vine-slider" min="0" max="21" value="${this.state.nonVegMeals}">
                <div class="slider-hints"><span>All Veg</span><span>Every Meal</span></div>
            </div>

            <div class="glass-card">
                <label class="input-label">Do you consume dairy daily?</label>
                <div class="toggle-row">
                    <button class="toggle-opt ${this.state.hasDairy ? 'active' : ''}" id="dairy-yes">Yes</button>
                    <button class="toggle-opt ${!this.state.hasDairy ? 'active' : ''}" id="dairy-no">No</button>
                </div>
            </div>
        `;

        requestAnimationFrame(() => {
            document.getElementById('inp-nveg').addEventListener('input', (e) => {
                this.state.nonVegMeals = parseInt(e.target.value);
                document.getElementById('nveg-val').innerText = this.state.nonVegMeals;
            });
            document.getElementById('dairy-yes').addEventListener('click', () => {
                this.state.hasDairy = true;
                document.getElementById('dairy-yes').classList.add('active');
                document.getElementById('dairy-no').classList.remove('active');
            });
            document.getElementById('dairy-no').addEventListener('click', () => {
                this.state.hasDairy = false;
                document.getElementById('dairy-no').classList.add('active');
                document.getElementById('dairy-yes').classList.remove('active');
            });
        });
    }

    renderEnergyInputs(container) {
        container.innerHTML = `
            <div class="glass-card">
                <label class="input-label">Monthly electricity: <span id="kwh-val">${this.state.monthlyKwh}</span> kWh</label>
                <input type="range" id="inp-kwh" class="vine-slider" min="30" max="500" value="${this.state.monthlyKwh}">
                <div class="slider-hints"><span>30 kWh</span><span>500 kWh</span></div>
            </div>

            <div class="glass-card">
                <label class="input-label">AC usage: <span id="ac-val">${this.state.acHours}</span> hrs/day</label>
                <input type="range" id="inp-ac" class="vine-slider" min="0" max="16" value="${this.state.acHours}">
                <div class="slider-hints"><span>None</span><span>16 hrs</span></div>
            </div>
        `;

        requestAnimationFrame(() => {
            document.getElementById('inp-kwh').addEventListener('input', (e) => {
                this.state.monthlyKwh = parseInt(e.target.value);
                document.getElementById('kwh-val').innerText = this.state.monthlyKwh;
            });
            document.getElementById('inp-ac').addEventListener('input', (e) => {
                this.state.acHours = parseInt(e.target.value);
                document.getElementById('ac-val').innerText = this.state.acHours;
            });
        });
    }

    renderConsumptionInputs(container) {
        container.innerHTML = `
            <div class="glass-card">
                <label class="input-label">How often do you buy new clothes?</label>
                <div class="toggle-row quad">
                    <button class="toggle-opt ${this.state.clothingFreq === 'monthly' ? 'active' : ''}" data-cf="monthly">Monthly</button>
                    <button class="toggle-opt ${this.state.clothingFreq === 'quarterly' ? 'active' : ''}" data-cf="quarterly">Every 3mo</button>
                    <button class="toggle-opt ${this.state.clothingFreq === 'biannual' ? 'active' : ''}" data-cf="biannual">Twice/yr</button>
                    <button class="toggle-opt ${this.state.clothingFreq === 'rarely' ? 'active' : ''}" data-cf="rarely">Rarely</button>
                </div>
            </div>

            <div class="glass-card">
                <label class="input-label">Do you buy fast fashion brands?</label>
                <div class="toggle-row">
                    <button class="toggle-opt ${this.state.isFastFashion ? 'active' : ''}" id="ff-yes">Yes</button>
                    <button class="toggle-opt ${!this.state.isFastFashion ? 'active' : ''}" id="ff-no">No</button>
                </div>
            </div>

            <div class="glass-card">
                <label class="input-label">Plastic usage level</label>
                <div class="toggle-row triple">
                    <button class="toggle-opt ${this.state.plasticLevel === 'low' ? 'active' : ''}" data-pl="low">Low</button>
                    <button class="toggle-opt ${this.state.plasticLevel === 'medium' ? 'active' : ''}" data-pl="medium">Medium</button>
                    <button class="toggle-opt ${this.state.plasticLevel === 'high' ? 'active' : ''}" data-pl="high">High</button>
                </div>
            </div>
        `;

        requestAnimationFrame(() => {
            document.querySelectorAll('[data-cf]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.state.clothingFreq = btn.dataset.cf;
                    document.querySelectorAll('[data-cf]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
            document.getElementById('ff-yes').addEventListener('click', () => {
                this.state.isFastFashion = true;
                document.getElementById('ff-yes').classList.add('active');
                document.getElementById('ff-no').classList.remove('active');
            });
            document.getElementById('ff-no').addEventListener('click', () => {
                this.state.isFastFashion = false;
                document.getElementById('ff-no').classList.add('active');
                document.getElementById('ff-yes').classList.remove('active');
            });

            document.querySelectorAll('[data-pl]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.state.plasticLevel = btn.dataset.pl;
                    document.querySelectorAll('[data-pl]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
        });
    }

    // ─── EVENTS ───
    // ─── EVENTS ───
    bindEvents() {
        document.getElementById('btn-start').addEventListener('click', () => this.goTo('p2-profile'));

        // Reveal Impact
        const btnReveal = document.getElementById('btn-reveal-impact');
        if (btnReveal) {
            console.log("Binding Reveal Button");
            btnReveal.addEventListener('click', () => {
                console.log("Reveal Clicked");
                // Optional: validate mobility match?
                const dist = this.state.distance;
                const mixSum = Object.values(this.state.transportMix).reduce((a, b) => a + b, 0);

                if (dist !== mixSum) {
                    alert(`Please ensure your Transport Mode breakdown (${mixSum} km) matches your Total Distance (${dist} km)!`);
                    document.getElementById('mix-sliders').scrollIntoView({ behavior: 'smooth' });
                    return;
                }

                // Step 1: Calculate
                try {
                    this.calculateTotalImpact();
                } catch (e) {
                    console.error("Calc Failed:", e);
                    alert("Calculation Error: " + e.message);
                    return;
                }

                // Step 2: Visuals
                try {
                    if (window.Effects) window.Effects.triggerConfetti();
                    document.body.style.transition = 'background 1s';
                } catch (e) {
                    console.warn("Effect Failed:", e); // Non-critical
                }

                // Step 3: Render & Nav
                try {
                    this.renderImpact('damage');
                    this.goTo('p3-reveal');
                } catch (e) {
                    console.error("Render/Nav Failed:", e);
                    alert("Display Error: " + e.message);
                }
            });
        } else {
            console.error("Reveal Button Not Found!");
        }

        // Toggle Shock/Heal
        const toggle = document.getElementById('impact-toggle');
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active-right');
            const isHeal = toggle.classList.contains('active-right');
            // Animate transition
            this.renderImpact(isHeal ? 'heal' : 'damage'); // This will update aggregated display
            if (isHeal) document.getElementById('btn-challenge').classList.remove('hidden');
        });

        // Challenge Start
        document.getElementById('btn-challenge').addEventListener('click', () => {
            this.goTo('p4-challenge');
            this.runChallengeSequence();
        });

        // Restart
        const btnRestart = document.getElementById('btn-restart');
        if (btnRestart) btnRestart.addEventListener('click', () => {
            this.goTo('p2-profile');
            document.getElementById('final-stats').classList.add('hidden');
            document.getElementById('day-counter').innerText = '1';
            document.getElementById('tree-growth-stage').innerText = '🌱';
        });

        // Explore Another Area (now just scroll up?)
        const btnAnother = document.getElementById('btn-another');
        if (btnAnother) btnAnother.addEventListener('click', () => this.goTo('p2-profile'));
    }

    // ─── PAGE 4: IMPACT RENDER ───
    renderImpact(mode) {
        const data = this.state.calculated;
        if (!data) return;

        const displayVal = document.getElementById('display-emission');
        const displayDesc = document.getElementById('impact-desc'); // Fixed ID
        const grid = document.getElementById('visual-grid');

        let targetNum, treesReq;
        grid.innerHTML = '';

        if (mode === 'damage') {
            targetNum = data.current.annualKg || 0;
            treesReq = data.current.treesRequired || 0;
            // Provide aggregated context
            displayDesc.innerText = `This is the cost of our daily habits. Requires ${treesReq} trees to absorb.`;
            Effects.setMood('fog');

            for (let i = 0; i < Math.min(treesReq, 50); i++) {
                const sp = document.createElement('span');
                sp.className = 'tree-icon grey';
                sp.innerText = '🌲';
                sp.style.animationDelay = `${i * 30}ms`;
                grid.appendChild(sp);
            }
        } else {
            targetNum = data.target.annualKg || 0;
            treesReq = data.target.treesRequired || 0;
            const saved = data.savings.treesSaved || 0;
            displayDesc.innerText = `You save ${saved} trees worth of emissions annually with these changes.`;
            Effects.setMood('bloom');

            for (let i = 0; i < Math.min(treesReq, 50); i++) {
                const sp = document.createElement('span');
                sp.className = 'tree-icon green';
                sp.innerText = '🌳';
                sp.style.animationDelay = `${i * 30}ms`;
                grid.appendChild(sp);
            }
        }

        const startVal = parseInt(displayVal.innerText) || 0;
        const endVal = Math.round(targetNum) || 0;
        this.animateValue(displayVal, startVal, endVal, 1000);
    }

    animateValue(obj, start, end, duration) {
        if (isNaN(start)) start = 0;
        if (isNaN(end)) end = 0;
        let ts = null;
        const step = (t) => {
            if (!ts) ts = t;
            const p = Math.min((t - ts) / duration, 1);
            obj.innerHTML = Math.floor(p * (end - start) + start);
            if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    // ─── PAGE 5: CHALLENGE ───
    runChallengeSequence() {
        let day = 1;
        const counter = document.getElementById('day-counter');
        const stage = document.getElementById('tree-growth-stage');
        const emojis = ['🌱', '🌿', '🌳', '🌳✨'];

        const iv = setInterval(() => {
            day++;
            counter.innerText = day;

            if (day % 4 === 0) {
                stage.innerText = emojis[Math.min(Math.floor(day / 4), 3)];
                stage.style.transform = `scale(${1 + day / 20})`;
            }

            if (day >= 14) {
                clearInterval(iv);
                this.showFinalStats();
            }
        }, 150);
    }

    showFinalStats() {
        const stats = document.getElementById('final-stats');
        stats.classList.remove('hidden');

        const data = this.state.calculated;
        const savedKg = data?.savings?.challengeSavedKg || 0;
        const savedTrees = data?.savings?.treesSaved || 0;
        const savedAnnual = data?.savings?.annualKg || 0;

        if (document.getElementById('saved-kg')) document.getElementById('saved-kg').innerText = Math.round(savedKg);
        if (document.getElementById('saved-annual')) document.getElementById('saved-annual').innerText = Math.round(savedAnnual);
        if (document.getElementById('saved-trees')) document.getElementById('saved-trees').innerText = savedTrees;

        Effects.triggerConfetti();
    }
}

// ─── Boot ───
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Fallback for dependencies if missing
        if (!window.Utils) window.Utils = { calculateHeal: () => ({ savings: {} }) };
        if (!window.Effects) window.Effects = { init: () => { }, setMood: () => { }, triggerConfetti: () => { } };

        window.app = new window.Vision4Life();
        window.flowmap = new window.Flowmap();
        console.log("Vision4Life & Flowmap initialized");
    } catch (e) {
        console.error("Initialization failed:", e);
        // Emergency Fallback: Bind Start Button manually
        const btn = document.getElementById('btn-start');
        if (btn) {
            btn.addEventListener('click', () => {
                document.getElementById('p1-landing').classList.remove('active');
                const p2 = document.getElementById('p2-profile');
                p2.classList.add('active');
                if (window.app) window.app.renderFullProfile();
            });
        }
    }
});
