const Effects = {
    canvas: null,
    ctx: null,
    particles: [],
    mood: 'fog', // fog, bloom
    mouse: { x: 0, y: 0 },
    target: { x: 0, y: 0 },
    width: 0, height: 0,

    init() {
        this.canvas = document.getElementById('particle-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Mouse/Touch Tracking for Parallax
        const onMove = (e) => {
            const x = e.touches ? e.touches[0].clientX : e.clientX;
            const y = e.touches ? e.touches[0].clientY : e.clientY;
            // Target is offset from center, normalized somewhat
            this.target.x = (x - this.width / 2) * 0.05;
            this.target.y = (y - this.height / 2) * 0.05;
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, { passive: true });

        this.spawn(50);
        this.loop();
    },

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    },

    setMood(m) {
        this.mood = m;
        this.particles.forEach(p => {
            if (m === 'bloom') p.color = `rgba(67, 160, 71, ${Math.random()})`;
            else p.color = `rgba(200, 200, 200, ${Math.random() * 0.2})`;
        });
    },

    spawn(count) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                s: Math.random() * 3 + 1, // speed/size
                r: Math.random() * 2 + 1, // radius
                a: Math.random() * Math.PI * 2, // angle
                z: Math.random() * 0.5 + 0.5, // depth (0.5 to 1.0)
                color: `rgba(200, 200, 200, ${Math.random() * 0.2})`
            });
        }
    },

    triggerConfetti() {
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: this.width / 2,
                y: this.height / 2,
                r: Math.random() * 4 + 2,
                dx: (Math.random() - 0.5) * 15,
                dy: (Math.random() - 0.5) * 15,
                color: Math.random() > 0.5 ? '#FFD54F' : '#43A047',
                decay: 0.95
            });
        }
    },

    loop() {
        // Smooth mouse
        this.mouse.x += (this.target.x - this.mouse.x) * 0.1;
        this.mouse.y += (this.target.y - this.mouse.y) * 0.1;

        // Fog Parallax
        const fog = document.getElementById('fog-layer');
        if (fog) {
            fog.style.transform = `translate(${-this.mouse.x * 0.2}px, ${-this.mouse.y * 0.1}px)`;
        }

        this.ctx.clearRect(0, 0, this.width, this.height);

        // Iterate backwards to allow removal
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            if (p.decay) {
                // Confetti logic
                p.x += p.dx;
                p.y += p.dy;
                p.dx *= p.decay;
                p.dy *= p.decay;
                p.r *= 0.98;
                if (p.r < 0.5) {
                    this.particles.splice(i, 1);
                    continue;
                }
            } else {
                // Ambient particle logic
                // Move naturally
                p.y -= p.s * 0.5; // Always float up
                p.x += Math.sin(p.a) * 0.5;
                p.a += 0.02;

                // Wrap
                if (p.y < -10) {
                    p.y = this.height + 10;
                    p.x = Math.random() * this.width;
                }
            }

            // Draw with Parallax
            // Parallax moves opposite to mouse? Or with?
            // "Movable screen": if I move mouse right, view moves right, so objects move left.
            // But usually "parallax" means layers move at different speeds.
            // Let's move them opposite to mouse to simulate "looking around".
            const paraX = this.mouse.x * p.z;
            const paraY = this.mouse.y * p.z;

            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x - paraX, p.y - paraY, p.r, 0, Math.PI * 2);
            this.ctx.fill();
        }

        requestAnimationFrame(() => this.loop());
    }
};
