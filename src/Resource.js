class MineralPatch {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
    }

    draw(ctx) {
        ctx.fillStyle = 'skyblue';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class MineralPiece {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 6;
        this.carried = false;
    }

    draw(ctx) {
        ctx.fillStyle = 'cyan';
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
}

class Storage {
    constructor(x, y, ghost = false) {
        this.x = x;
        this.y = y;
        this.size = 80;
        this.ghost = ghost;
        this.resources = { mineral: 0 };
    }

    store(type, amount = 1) {
        if (!this.resources[type]) this.resources[type] = 0;
        this.resources[type] += amount;
    }

    getAmount(type) {
        return this.resources[type] || 0;
    }

    total() {
        return Object.values(this.resources).reduce((a, b) => a + b, 0);
    }

    draw(ctx) {
        ctx.save();
        if (this.ghost) ctx.globalAlpha = 0.5;
        ctx.fillStyle = 'rgba(0,0,255,0.3)';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        const half = this.size / 2;
        ctx.fillRect(this.x - half, this.y - half, this.size, this.size);
        ctx.strokeRect(this.x - half, this.y - half, this.size, this.size);

        // Draw stacked minerals
        const mineralCount = this.getAmount('mineral');
        const pieceSize = 6;
        const padding = 4;
        const cols = Math.floor((this.size - padding * 2) / pieceSize);
        for (let i = 0; i < mineralCount; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const px = this.x - half + padding + col * pieceSize;
            const py = this.y + half - padding - pieceSize - row * pieceSize;
            ctx.fillStyle = 'cyan';
            ctx.fillRect(px, py, pieceSize, pieceSize);
        }

        ctx.restore();
    }
}

export { MineralPatch, MineralPiece, Storage };
