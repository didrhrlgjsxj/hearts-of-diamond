class Bullet {
    constructor(x, y, angle, speed, range, target = null) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.range = range;
        this.traveled = 0;
        this.size = 6;
        this.target = target; // 목표가 사망하면 총알 제거용
    }

    update() {
        if (this.target && this.target.dead) {
            // 대상이 사망하면 남은 거리를 0으로 만들어 즉시 제거
            this.traveled = this.range;
            return;
        }
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.traveled += this.speed;
    }

    draw(ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
}

export default Bullet;
