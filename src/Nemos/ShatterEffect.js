class ShatterEffect {
    constructor(x, y, size, color, pieceCount = 12, duration = 40) {
        this.pieces = [];
        this.color = color;
        this.duration = duration;
        this.age = 0;
        for (let i = 0; i < pieceCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            const s = size * 0.2 * (0.5 + Math.random());
            const rotation = Math.random() * Math.PI * 2;
            const rotationSpeed = (Math.random() - 0.5) * 0.4;
            this.pieces.push({ x, y, angle, speed, size: s, rotation, rotationSpeed });
        }
    }

    update() {
        this.age++;
        this.pieces.forEach(p => {
            p.x += Math.cos(p.angle) * p.speed;
            p.y += Math.sin(p.angle) * p.speed;
            p.rotation += p.rotationSpeed;
        });
    }

    draw(ctx) {
        // Clamp alpha to ensure it doesn't become negative
        const alpha = Math.max(0, 1 - this.age / this.duration);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        this.pieces.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.beginPath();
            ctx.moveTo(-p.size / 2, p.size / 2);
            ctx.lineTo(p.size / 2, p.size / 2);
            ctx.lineTo(0, -p.size / 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });
        ctx.restore();
    }

    isDone() {
        return this.age >= this.duration;
    }
}

export default ShatterEffect;
