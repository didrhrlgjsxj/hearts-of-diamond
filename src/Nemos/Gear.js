class Gear {
    constructor(nemo, size = nemo.size * 0.4 * 1.5) {
        this.nemo = nemo;
        this.size = size;
        this.angle = 0;
   }

    update() {
        // Calculate activity weight based on Nemo's state
        this.activityWeight = 1; // Reset to default idle weight

        if (this.nemo.isMoving) {
            this.activityWeight += 0.5; // Increase weight if moving
        }

        // Check for attacking (assuming platform activation implies attacking)
        const activePlatforms = this.nemo.platforms ? this.nemo.platforms.filter(p => p.mode2 === 'attackOn').length : 0;
        this.activityWeight += activePlatforms * 0.3; // Increase weight per active platform

        // Ensure weight doesn't exceed a reasonable maximum (optional)
        this.activityWeight = Math.min(this.activityWeight, 3);

       this.angle += 0.05 * this.activityWeight; // Apply weighted rotation
   }

    getTeethCount() {
        if (this.nemo.unitType === 'unit') return 2;
        if (this.nemo.unitType === 'army') {
            switch (this.nemo.armyType) {
                case 'squad':
                case 'sqaudio':
                    return 3;
                case 'platoon':
                    return 4;
                case 'company':
                    return 6;
            }
        }
        return 8;
    }

    draw(ctx) {
        ctx.save();
        ctx.rotate(this.angle);
        // Add glow effect that depends on activityWeight
        ctx.shadowColor = 'gold'; // Adjust color as needed
        ctx.shadowBlur = 5 + this.activityWeight * 2; // Adjust blur intensity as needed
        const r = this.size / 2;
        const inner = r * 0.6;
        const teeth = this.getTeethCount();
        ctx.fillStyle = 'lightgray';
        ctx.strokeStyle = 'gray';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, inner, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < teeth; i++) {
            const a = i * 2 * Math.PI / teeth;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            ctx.stroke();
        }
        ctx.restore();
    }
}

export default Gear;
