const UNIT_STRENGTHS = {
    SQUAD: 12,
    PLATOON: 12 * 3,       // 36
    COMPANY: 12 * 3 * 3,     // 108
    BATTALION: 12 * 3 * 3 * 3, // 324
    BRIGADE: 12 * 3 * 3 * 3 * 3, // 972
    DIVISION: 12 * 3 * 3 * 3 * 3 * 3, // 2916
    CORPS: 12 * 3 * 3 * 3 * 3 * 3 * 3, // 8748
};

/**
 * 모든 군사 유닛의 기본이 되는 클래스입니다.
 * 이름, 위치, 하위 유닛 목록을 가집니다.
 */
class Unit {
    constructor(name, x = 0, y = 0, baseStrength = 0, size = 5) {
        this.name = name;
        this.x = x;
        this.y = y;
        this.subUnits = []; // 이 유닛에 소속된 하위 유닛들
        this.baseStrength = baseStrength; // 기본 인원
        this.size = size; // 유닛 아이콘의 크기 (반지름)
        this.reinforcementLevel = 0; // 증강 레벨
    }

    /**
     * 현재 병력을 계산합니다.
     * 하위 유닛이 있으면 그 유닛들의 병력 총합을, 없으면 자신의 기본 병력을 기준으로 계산합니다.
     */
    get currentStrength() {
        if (this.subUnits.length > 0) {
            return this.subUnits.reduce((total, unit) => total + unit.currentStrength, 0);
        }
        return Math.floor(this.baseStrength * (1 + (1/6) * this.reinforcementLevel));
    }

    /**
     * 기본 편성 병력을 계산합니다. 하위 유닛이 있으면 그 유닛들의 기본 병력 총합을 반환합니다.
     */
    get baseStrength() {
        return this.subUnits.length > 0 ? this.subUnits.reduce((total, unit) => total + unit.baseStrength, 0) : this._baseStrength;
    }

    /**
     * 하위 유닛을 추가합니다.
     * @param {Unit} unit 추가할 유닛
     */
    addUnit(unit) {
        // baseStrength를 _baseStrength로 변경하여 getter/setter 충돌을 방지합니다.
        if (this.constructor.name === 'Unit' && !this.hasOwnProperty('_baseStrength')) {
            this._baseStrength = this.baseStrength;
        }
        if (unit.constructor.name === 'Unit' && !unit.hasOwnProperty('_baseStrength')) {
            unit._baseStrength = unit.baseStrength;
        }

        this.subUnits.push(unit);
    }

    /**
     * 유닛을 증강합니다.
     * @param {number} level 증강할 레벨
     */
    reinforce(level) {
        this.reinforcementLevel = level;
    }

    /**
     * 모든 하위 유닛을 포함하여 유닛을 그립니다.
     * @param {CanvasRenderingContext2D} ctx 캔버스 렌더링 컨텍스트
     */
    draw(ctx) {
        const barWidth = 40;
        const barHeight = 5;
        const barX = this.x - barWidth / 2;
        const barY = this.y - 25;

        // 1. 병력 바 배경 (어두운 회색)
        ctx.fillStyle = '#555';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // 2. 현재 병력 바
        // baseStrength가 0인 경우(하위 유닛이 없는 최상위 유닛)를 대비해 0으로 나누는 것을 방지합니다.
        const currentBaseStrength = this.baseStrength;
        const strengthRatio = currentBaseStrength > 0 ? this.currentStrength / currentBaseStrength : 0;
        const currentBarWidth = Math.min(barWidth, barWidth * strengthRatio);

        // 증강으로 100%를 초과하면 노란색, 아니면 녹색으로 표시
        ctx.fillStyle = strengthRatio > 1 ? '#f0e68c' : '#00ff00'; // Khaki / Lime Green
        ctx.fillRect(barX, barY, currentBarWidth, barHeight);

        // 3. 병력 바 테두리
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // 부대 종류별 심볼을 그립니다.
        this.drawEchelonSymbol(ctx);

        // 각 유닛을 간단한 사각형으로 표현합니다.
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);

        // 유닛 이름을 표시합니다.
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.font = '10px sans-serif';
        ctx.fillText(`${this.name} [${this.currentStrength}]`, this.x, this.y + 20);

        // 하위 유닛들도 그립니다.
        for (const unit of this.subUnits) {
            // 하위 유닛과의 연결선을 그립니다.
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(unit.x, unit.y);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.stroke();

            unit.draw(ctx);
        }
    }

    /**
     * 부대 규모(Echelon) 심볼을 그립니다. 하위 클래스에서 오버라이드됩니다.
     * @param {CanvasRenderingContext2D} ctx
     */
    drawEchelonSymbol(ctx) {
        // 기본적으로는 아무것도 그리지 않습니다.
    }
}

/** 군단 (Corps) */
class Corps extends Unit {
    constructor(name, x, y) { super(name, x, y, UNIT_STRENGTHS.CORPS, 14); }
    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('XXX', this.x, this.y - this.size - 2);
    }
}

/** 사단 (Division) */
class Division extends Unit {
    constructor(name, x, y) { super(name, x, y, UNIT_STRENGTHS.DIVISION, 12); }
    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('XX', this.x, this.y - this.size - 2);
    }
}

/** 여단 (Brigade) */
class Brigade extends Unit {
    constructor(name, x, y) { super(name, x, y, UNIT_STRENGTHS.BRIGADE, 10); }
    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('X', this.x, this.y - this.size - 2);
    }
}

/** 대대 (Battalion) */
class Battalion extends Unit {
    constructor(name, x, y) { super(name, x, y, UNIT_STRENGTHS.BATTALION, 8); }
    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('||', this.x, this.y - this.size - 2);
    }
}

/** 중대 (Company) */
class Company extends Unit {
    constructor(name, x, y) { super(name, x, y, UNIT_STRENGTHS.COMPANY, 7); }
    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('|', this.x, this.y - this.size - 2);
    }
}

/** 소대 (Platoon) */
class Platoon extends Unit {
    constructor(name, x, y) { super(name, x, y, UNIT_STRENGTHS.PLATOON, 6); }
    drawEchelonSymbol(ctx) {
        ctx.fillStyle = 'black';
        const dotSize = 2;
        const spacing = 5;
        const yPos = this.y - this.size - 4;
        // 3개의 점 그리기
        ctx.beginPath();
        ctx.arc(this.x - spacing, yPos, dotSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x, yPos, dotSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + spacing, yPos, dotSize, 0, Math.PI * 2);
        ctx.fill();
    }
}

/** 분대 (Squad) */
class Squad extends Unit {
    constructor(name, x, y) { super(name, x, y, UNIT_STRENGTHS.SQUAD, 5); }
    drawEchelonSymbol(ctx) {
        ctx.fillStyle = 'black';
        const dotSize = 2;
        const yPos = this.y - this.size - 4;
        // 1개의 점 그리기
        ctx.beginPath();
        ctx.arc(this.x, yPos, dotSize, 0, Math.PI * 2);
        ctx.fill();
    }
}