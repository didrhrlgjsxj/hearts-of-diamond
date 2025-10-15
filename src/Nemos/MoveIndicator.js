class MoveIndicator {
    constructor(x, y, size = 40, duration = 20, color = 'red') {
        this.x = x;
        this.y = y;
        this.size = size;
        this.duration = duration;
        this.age = 0;
        this.color = color;
    }

    update() {
        this.age++;
    }

    draw(ctx) {
        const progress = this.age / this.duration;
        const alpha = 1 - progress;
        const offset = this.size * (1 - progress * progress);
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 5;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(this.x - offset, this.y);
        ctx.lineTo(this.x - offset / 2, this.y);
        ctx.moveTo(this.x + offset, this.y);
        ctx.lineTo(this.x + offset / 2, this.y);
        ctx.moveTo(this.x, this.y - offset);
        ctx.lineTo(this.x, this.y - offset / 2);
        ctx.moveTo(this.x, this.y + offset);
        ctx.lineTo(this.x, this.y + offset / 2);
        ctx.stroke();
        ctx.restore();
    }

    isDone() {
        return this.age >= this.duration;
    }
}

export default MoveIndicator;
