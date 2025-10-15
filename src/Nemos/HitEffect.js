// Returns a color string blended with black by the given ratio (0~1)
function lightenColor(color, ratio = 0.5) {
    const canvas = document.createElement('canvas');
    const c = canvas.getContext('2d');
    c.fillStyle = color;
    const rgb = c.fillStyle.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!rgb) return color;
    const r = Math.min(255, Math.floor(parseInt(rgb[1], 10) * (1 - ratio) + 255 * ratio));
    const g = Math.min(255, Math.floor(parseInt(rgb[2], 10) * (1 - ratio) + 255 * ratio));
    const b = Math.min(255, Math.floor(parseInt(rgb[3], 10) * (1 - ratio) + 255 * ratio));
    return `rgb(${r},${g},${b})`;
}

class HitEffect {
    constructor(x, y, bulletSize, angle, targetColor, duration = 20) {
        this.squares = [];
        this.size = bulletSize * 1.2;
        this.duration = duration;
        this.age = 0;

        const color = lightenColor(targetColor, 0.5);
        for (let i = 0; i < 6; i++) {
            const spread = (Math.random() - 0.5) * Math.PI; // +/-90deg
            this.squares.push({
                x,
                y,
                angle: angle + Math.PI + spread,
                speed: 1 + Math.random() * 1.5,
                color
            });
        }
    }

    update() {
        this.age++;
        this.squares.forEach(s => {
            s.x += Math.cos(s.angle) * s.speed;
            s.y += Math.sin(s.angle) * s.speed;
        });
    }

    draw(ctx) {
        const alpha = 1 - this.age / this.duration;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.squares.length > 0 ? this.squares[0].color : 'white';
        this.squares.forEach(s => {
            ctx.fillStyle = s.color;
            ctx.fillRect(s.x - this.size / 2, s.y - this.size / 2, this.size, this.size);
        });
        ctx.restore();
    }

    isDone() {
        return this.age >= this.duration;
    }
}

export { lightenColor as mixWithBlack };

export default HitEffect;
