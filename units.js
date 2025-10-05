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
    constructor(name, x = 0, y = 0, baseStrength = 0, size = 5, team = 'blue') {
        this.name = name;
        this._x = x; // 유닛의 절대 또는 상대 X 좌표
        this._y = y; // 유닛의 절대 또는 상대 Y 좌표
        this.subUnits = []; // 이 유닛에 소속된 하위 유닛들
        this._baseStrength = baseStrength; // 기본 인원 (내부 속성)
        this.parent = null; // 상위 유닛 참조
        this.size = size; // 유닛 아이콘의 크기 (반지름)
        this.team = team; // 유닛의 팀 ('blue' 또는 'red')
        this.reinforcementLevel = 0; // 증강 레벨
        this.isSelected = false; // 유닛 선택 여부
        this.damageTaken = 0; // 받은 피해량
        this.engagementRange = 70; // 교전 범위
        this.isInCombat = false; // 전투 상태 여부
        this.destination = null; // 이동 목표 지점 {x, y}
        this.moveSpeed = 30; // 초당 이동 속도
        this.floatingTexts = []; // 피해량 표시 텍스트 배열
        this.displayStrength = -1; // 화면에 표시되는 체력 (애니메이션용)
    }

    // 부모가 있으면 상대 위치를, 없으면 절대 위치를 반환
    get x() {
        return this.parent ? this.parent.x + this._x : this._x;
    }

    // 부모가 있으면 상대 위치를, 없으면 절대 위치를 설정
    set x(value) {
        this._x = this.parent ? value - this.parent.x : value;
    }

    get y() {
        return this.parent ? this.parent.y + this._y : this._y;
    }

    set y(value) {
        this._y = this.parent ? value - this.parent.y : value;
    }


    /**
     * 현재 병력을 계산합니다.
     * 하위 유닛이 있으면 그 유닛들의 병력 총합을, 없으면 자신의 기본 병력을 기준으로 계산합니다.
     */
    get currentStrength() {
        if (this.subUnits.length > 0) {
            const subUnitsStrength = this.subUnits.reduce((total, unit) => total + unit.currentStrength, 0);
            // 하위 유닛의 총합에서 이 유닛이 직접 받은 피해를 차감합니다.
            return Math.max(0, subUnitsStrength - this.damageTaken);
        }
        return Math.max(0, Math.floor(this._baseStrength * (1 + (1/6) * this.reinforcementLevel)) - this.damageTaken);
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
        unit.parent = this;
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
     * 유닛의 이동 목표를 설정합니다.
     * @param {number} x 목표 x 좌표
     * @param {number} y 목표 y 좌표
     */
    moveTo(x, y) {
        this.destination = { x, y };
    }

    /**
     * 유닛의 이동을 처리합니다.
     * @param {number} deltaTime 프레임 간 시간 간격 (초)
     */
    updateMovement(deltaTime) {
        if (!this.destination) return;

        const dx = this.destination.x - this.x;
        const dy = this.destination.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const moveDistance = this.moveSpeed * deltaTime;

        if (distance < moveDistance) {
            // 목표에 도달함
            this.x = this.destination.x;
            this.y = this.destination.y;
            this.destination = null;
        } else {
            // 목표를 향해 이동
            const moveX = (dx / distance) * moveDistance;
            const moveY = (dy / distance) * moveDistance;
            this.x += moveX;
            this.y += moveY;
        }
    }

    /**
     * 대상 유닛을 공격하여 피해를 입힙니다.
     * @param {Unit} target 공격할 대상 유닛
     */
    attack(target) {
        // 피해량은 현재 병력의 일부로 계산 (예: 1%)
        const damage = this.currentStrength * 0.01;
        target.takeDamage(damage);
        this.isInCombat = true;
    }

    /**
     * 피해를 받습니다.
     * @param {number} amount 피해량
     */
    takeDamage(amount) {
        const integerDamage = Math.floor(amount);
        if (integerDamage <= 0) return;

        this.damageTaken += integerDamage;

        // 피해량 텍스트 생성
        this.floatingTexts.push({
            text: `-${integerDamage}`,
            life: 1.5, // 1.5초 동안 표시
            alpha: 1.0,
            x: this.x,
            y: this.y - this.size - 10,
        });
    }

    /**
     * 유닛의 시각 효과(피해량 텍스트 등)를 업데이트합니다.
     * @param {number} deltaTime
     */
    updateVisuals(deltaTime) {
        // 떠다니는 텍스트 업데이트
        this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);
        this.floatingTexts.forEach(t => {
            t.life -= deltaTime;
            t.y -= 10 * deltaTime; // 위로 떠오르는 효과
            t.alpha = Math.max(0, t.life / 1.5);
        });
    }

    /**
     * 교전 범위 내의 적 유닛을 찾습니다.
     * @param {Unit[]} allUnits 모든 최상위 유닛 목록
     * @returns {Unit|null} 가장 가까운 적 유닛 또는 null
     */
    findEnemyInRange(allUnits) {
        let closestEnemy = null;
        let minDistance = this.engagementRange;

        for (const otherUnit of allUnits) {
            if (otherUnit.team !== this.team) {
                const distance = Math.sqrt(Math.pow(this.x - otherUnit.x, 2) + Math.pow(this.y - otherUnit.y, 2));
                if (distance < minDistance) {
                    minDistance = distance;
                    closestEnemy = otherUnit;
                }
            }
        }
        return closestEnemy;
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
        if (this.displayStrength === -1) {
            this.displayStrength = this.currentStrength;
        } else {
            // 표시되는 체력이 실제 체력보다 높으면 서서히 감소시켜 따라잡게 함
            if (this.displayStrength > this.currentStrength) {
                this.displayStrength = Math.max(this.currentStrength, this.displayStrength - this.baseStrength * 0.5 * ctx.canvas.deltaTime);
            }
        }
        const currentBaseStrength = this.baseStrength;
        const strengthRatio = currentBaseStrength > 0 ? this.displayStrength / currentBaseStrength : 0;
        
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

        // 2c. 피해 받은 부분 표시 (붉은색)
        const actualStrengthRatio = currentBaseStrength > 0 ? this.currentStrength / currentBaseStrength : 0;
        if (strengthRatio > actualStrengthRatio) {
            const damageBarStart = barWidth * actualStrengthRatio;
            const damageBarWidth = barWidth * (strengthRatio - actualStrengthRatio);
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)'; // Red
            ctx.fillRect(barX + damageBarStart, barY, damageBarWidth, barHeight);
        }
        
        // 3. 병력 바 테두리
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // 전투 중일 때 아이콘을 깜빡이게 표시
        if (this.isInCombat) {
            // 1초에 두 번 깜빡이는 효과
            if (Math.floor(Date.now() / 500) % 2 === 0) {
                ctx.fillStyle = 'rgba(255, 255, 0, 0.5)'; // 노란색 하이라이트
                ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
            }
        }
        // 부대 종류별 심볼을 그립니다.
        this.drawEchelonSymbol(ctx);

        // 팀 색상에 따라 아이콘 배경을 칠합니다.
        ctx.fillStyle = this.team === 'blue' ? 'rgba(100, 149, 237, 0.7)' : 'rgba(255, 99, 71, 0.7)'; // CornflowerBlue / Tomato
        ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);

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

        // 피해량 텍스트 그리기
        ctx.font = 'bold 12px sans-serif';
        this.floatingTexts.forEach(t => {
            ctx.fillStyle = `rgba(255, 100, 100, ${t.alpha})`;
            ctx.strokeStyle = `rgba(0, 0, 0, ${t.alpha})`;
            ctx.strokeText(t.text, t.x, t.y);
            ctx.fillText(t.text, t.x, t.y);
        });
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
    constructor(name, x, y, team) {
        super(name, x, y, 0, 14, team); // 기본 병력은 하위 유닛의 합이므로 0으로 시작
        // 3개의 사단을 자동으로 생성
        this.addUnit(new Division(`${name}-1`, -50, 50, team));
        this.addUnit(new Division(`${name}-2`, 50, 50, team));
        this.addUnit(new Division(`${name}-3`, 0, -50, team));
    }
    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('XXX', this.x, this.y - this.size - 2);
    }
}

/** 사단 (Division) */
class Division extends Unit {
    constructor(name, x, y, team) {
        super(name, x, y, 0, 12, team);
        // 3개의 여단을 자동으로 생성
        this.addUnit(new Brigade(`${name}-1`, -30, 30, team));
        this.addUnit(new Brigade(`${name}-2`, 30, 30, team));
        this.addUnit(new Brigade(`${name}-3`, 0, -30, team));
    }
    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('XX', this.x, this.y - this.size - 2);
    }
}

/** 여단 (Brigade) */
class Brigade extends Unit {
    constructor(name, x, y, team) {
        super(name, x, y, 0, 10, team);
        // 3개의 대대를 자동으로 생성
        this.addUnit(new Battalion(`${name}-1`, -20, 20, team));
        this.addUnit(new Battalion(`${name}-2`, 20, 20, team));
        this.addUnit(new Battalion(`${name}-3`, 0, -20, team));
    }
    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('X', this.x, this.y - this.size - 2);
    }
}

/** 대대 (Battalion) */
class Battalion extends Unit {
    constructor(name, x, y, team) {
        super(name, x, y, 0, 8, team);
        // 3개의 중대를 자동으로 생성
        this.addUnit(new Company(`${name}-1`, -15, 15, team));
        this.addUnit(new Company(`${name}-2`, 15, 15, team));
        this.addUnit(new Company(`${name}-3`, 0, -15, team));
    }
    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('||', this.x, this.y - this.size - 2);
    }
}

/** 중대 (Company) */
class Company extends Unit {
    constructor(name, x, y, team) {
        // 객체 존재 규칙: 중대는 하위 부대를 객체로 갖지 않습니다.
        // 대신, 미리 정의된 상수 값을 사용하여 자신의 기본 병력을 설정합니다.
        super(name, x, y, UNIT_STRENGTHS.COMPANY, 7, team);
    }
    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('|', this.x, this.y - this.size - 2);
    }
}

/** 소대 (Platoon) */
class Platoon extends Unit {
    constructor(name, x, y, team) {
        super(name, x, y, 0, 6, team);
        // 3개의 분대를 자동으로 생성
        this.addUnit(new Squad(`${name}-1`, -5, 5, team));
        this.addUnit(new Squad(`${name}-2`, 5, 5, team));
        this.addUnit(new Squad(`${name}-3`, 0, -5, team));
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
    constructor(name, x, y, team) { super(name, x, y, UNIT_STRENGTHS.SQUAD, 5, team); }
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