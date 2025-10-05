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
        this._baseStrength = baseStrength; // 기본 인원 (내부 속성)
        this.size = size; // 유닛 아이콘의 크기 (반지름)
        this.reinforcementLevel = 0; // 증강 레벨
        this.isSelected = false; // 유닛 선택 여부
    }

    /**
     * 현재 병력을 계산합니다.
     * 하위 유닛이 있으면 그 유닛들의 병력 총합을, 없으면 자신의 기본 병력을 기준으로 계산합니다.
     */
    get currentStrength() {
        if (this.subUnits.length > 0) {
            return this.subUnits.reduce((total, unit) => total + unit.currentStrength, 0);
        }
        return Math.floor(this._baseStrength * (1 + (1/6) * this.reinforcementLevel));
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
     * 유닛의 선택 상태를 설정합니다.
     * @param {boolean} selected
     */
    setSelected(selected) {
        this.isSelected = selected;
    }

    /**
     * 특정 좌표에 위치한 유닛을 재귀적으로 찾습니다.
     * @param {number} x 월드 X 좌표
     * @param {number} y 월드 Y 좌표
     * @returns {Unit|null}
     */
    getUnitAt(x, y) {
        // 자신이 선택된 경우, 하위 유닛부터 역순으로 확인 (위에 그려진 유닛 먼저)
        if (this.isSelected) {
            for (let i = this.subUnits.length - 1; i >= 0; i--) {
                const unit = this.subUnits[i];
                // 특이사항이 있는 하위 유닛만 클릭 대상으로 간주
                if (unit.hasReinforcedDescendants()) {
                    const found = unit.getUnitAt(x, y);
                    if (found) return found;
                }
            }
        }

        // 자기 자신 확인
        const distance = Math.sqrt(Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2));
        if (distance < this.size) {
            return this;
        }

        return null;
    }

    /**
     * 자신 또는 하위 유닛 중 증강된 유닛이 있는지 확인합니다.
     * @returns {boolean}
     */
    hasReinforcedDescendants() {
        if (this.reinforcementLevel > 0) {
            return true;
        }
        // 재귀적으로 하위 유닛을 확인합니다.
        for (const unit of this.subUnits) {
            if (unit.hasReinforcedDescendants()) return true;
        }
        return false;
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
        
        // 2a. 기본 병력 바 (최대 100%까지, 녹색)
        const baseBarWidth = barWidth * Math.min(strengthRatio, 1);
        ctx.fillStyle = '#00ff00'; // Lime Green
        ctx.fillRect(barX, barY, baseBarWidth, barHeight);

        // 2b. 증강된 병력 바 (100% 초과분, 노란색)
        if (strengthRatio > 1) {
            const reinforcedBarWidth = barWidth * (strengthRatio - 1);
            ctx.fillStyle = '#f0e68c'; // Khaki
            ctx.fillRect(barX + baseBarWidth, barY, Math.min(reinforcedBarWidth, barWidth - baseBarWidth), barHeight);
        }
        
        // 3. 병력 바 테두리
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // 부대 종류별 심볼을 그립니다.
        this.drawEchelonSymbol(ctx);

        // 각 유닛을 사각형으로 표현하고, 선택되었을 때 테두리 색을 변경합니다.
        ctx.strokeStyle = 'black';
        ctx.lineWidth = this.isSelected ? 2 : 1;
        ctx.strokeStyle = this.isSelected ? 'white' : 'black';
        ctx.strokeRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);

        // 유닛 이름을 표시합니다.
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.font = '10px sans-serif';
        ctx.fillText(`${this.name} [${this.currentStrength}]`, this.x, this.y + 20);

        // 자신이 선택되었을 때만 하위 유닛을 그립니다.
        if (this.isSelected) {
            // 최적화 규칙: 증강된 하위 부대만 그립니다.
            for (const unit of this.subUnits) {
                if (unit.hasReinforcedDescendants()) {
                    // 하위 유닛과의 연결선을 그립니다.
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(unit.x, unit.y);
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                    ctx.stroke();
                    unit.draw(ctx);
                }
            }
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
    constructor(name, x, y) {
        super(name, x, y, 0, 14); // 기본 병력은 하위 유닛의 합이므로 0으로 시작
        // 3개의 사단을 자동으로 생성
        this.addUnit(new Division(`${name}-1`, x - 50, y + 50));
        this.addUnit(new Division(`${name}-2`, x + 50, y + 50));
        this.addUnit(new Division(`${name}-3`, x, y - 50));
    }
    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('XXX', this.x, this.y - this.size - 2);
    }
}

/** 사단 (Division) */
class Division extends Unit {
    constructor(name, x, y) {
        super(name, x, y, 0, 12);
        // 3개의 여단을 자동으로 생성
        this.addUnit(new Brigade(`${name}-1`, x - 30, y + 30));
        this.addUnit(new Brigade(`${name}-2`, x + 30, y + 30));
        this.addUnit(new Brigade(`${name}-3`, x, y - 30));
    }
    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('XX', this.x, this.y - this.size - 2);
    }
}

/** 여단 (Brigade) */
class Brigade extends Unit {
    constructor(name, x, y) {
        super(name, x, y, 0, 10);
        // 3개의 대대를 자동으로 생성
        this.addUnit(new Battalion(`${name}-1`, x - 20, y + 20));
        this.addUnit(new Battalion(`${name}-2`, x + 20, y + 20));
        this.addUnit(new Battalion(`${name}-3`, x, y - 20));
    }
    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('X', this.x, this.y - this.size - 2);
    }
}

/** 대대 (Battalion) */
class Battalion extends Unit {
    constructor(name, x, y) {
        super(name, x, y, 0, 8);
        // 3개의 중대를 자동으로 생성
        this.addUnit(new Company(`${name}-1`, x - 15, y + 15));
        this.addUnit(new Company(`${name}-2`, x + 15, y + 15));
        this.addUnit(new Company(`${name}-3`, x, y - 15));
    }
    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('||', this.x, this.y - this.size - 2);
    }
}

/** 중대 (Company) */
class Company extends Unit {
    constructor(name, x, y) {
        // 객체 존재 규칙: 중대는 하위 부대를 객체로 갖지 않습니다.
        // 대신, 미리 정의된 상수 값을 사용하여 자신의 기본 병력을 설정합니다.
        super(name, x, y, UNIT_STRENGTHS.COMPANY, 7);
    }
    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('|', this.x, this.y - this.size - 2);
    }
}

/** 소대 (Platoon) */
class Platoon extends Unit {
    constructor(name, x, y) {
        super(name, x, y, 0, 6);
        // 3개의 분대를 자동으로 생성
        this.addUnit(new Squad(`${name}-1`, x - 5, y + 5));
        this.addUnit(new Squad(`${name}-2`, x + 5, y + 5));
        this.addUnit(new Squad(`${name}-3`, x, y - 5));
    }
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