/** 여단 (Brigade) */
class Brigade extends Unit {
    constructor(name, x, y, team) {
        super(name, x, y, 0, 10, team);
        this.hqUnit = null;
        // 하위 유닛 생성은 이제 division_templates.js에서 담당합니다.
    }

    // 여단의 위치는 항상 본부 중대의 위치를 따릅니다.
    get x() { return this.hqUnit ? this.hqUnit.x : this._x; }
    set x(value) {
        if (this.hqUnit) this.hqUnit.x = value;
        else this._x = value;
    }
    get y() { return this.hqUnit ? this.hqUnit.y : this._y; }
    set y(value) {
        if (this.hqUnit) this.hqUnit.y = value;
        else this._y = value;
    }

    moveTo(x, y) {
        // 상위 부대의 이동 명령은 본부(HQ) 중대에 직접 전달됩니다.
        // 나머지 중대들은 진형 시스템에 따라 본부를 따라갑니다.
        if (this.hqUnit) {
            const dx = x - this.x;
            const dy = y - this.y;
            this.direction = Math.atan2(dy, dx);
            this.hqUnit.moveTo(x, y);
        }
    }

    drawEchelonSymbol(ctx) {
        const size = this.size * 2; // 아이콘 크기에 비례
        ctx.font = `bold ${size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'black';
        ctx.fillText('X', this.x, this.y + size * 0.1); // 폰트에 따라 미세 조정
    }
}
/** 대대 (Battalion) */
class Battalion extends Unit {
    constructor(name, x, y, team) {
        super(name, x, y, 0, 8, team);
        this.hqUnit = null;
        // 하위 유닛 생성은 이제 division_templates.js에서 담당합니다.
    }

    // 대대의 위치는 항상 본부 중대의 위치를 따릅니다.
    get x() { return this.hqUnit ? this.hqUnit.x : this._x; }
    set x(value) {
        if (this.hqUnit) this.hqUnit.x = value;
        else this._x = value;
    }
    get y() { return this.hqUnit ? this.hqUnit.y : this._y; }
    set y(value) {
        if (this.hqUnit) this.hqUnit.y = value;
        else this._y = value;
    }

    moveTo(x, y) {
        if (this.hqUnit) {
            const dx = x - this.x;
            const dy = y - this.y;
            this.direction = Math.atan2(dy, dx);
            this.hqUnit.moveTo(x, y);
        }
    }

    drawEchelonSymbol(ctx) {
        const size = this.size * 2; // 아이콘 크기에 비례
        ctx.font = `bold ${size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'black';
        ctx.fillText('||', this.x, this.y + size * 0.1); // 폰트에 따라 미세 조정
    }
}
/** 중대 (Company) */
class Company extends Unit {
    constructor(name, x, y, team) {
        super(name, x, y, 0, 7, team, UNIT_TYPES.INFANTRY);
        this.role = COMPANY_ROLES.SUPPORT; // 기본 역할은 '유지대'
        this.formationRadius = 20;
        // 하위 유닛 생성은 이제 division_templates.js에서 담당합니다.
    }
    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('|', this.x, this.y - this.size - 5);
    }
}
/** 소대 (Platoon) */
class Platoon extends Unit {
    constructor(name, x, y, team) {
        super(name, x, y, 0, 6, team, UNIT_TYPES.INFANTRY);
        this.formationRadius = 10;
        // 하위 유닛 생성은 이제 division_templates.js에서 담당합니다.
    }
    drawEchelonSymbol(ctx) {
        ctx.fillStyle = 'black';
        const dotSize = 2;
        const spacing = 5;
        const yPos = this.y - this.size - 6;
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
    constructor(name, x, y, team) {
        super(name, x, y, UNIT_STRENGTHS.SQUAD, 4, team, UNIT_TYPES.INFANTRY);
        this.setType(UNIT_TYPES.INFANTRY); // 기본 타입을 보병으로 설정

        // 분대는 최하위 단위이므로, combatSubUnits는 상위에서 설정합니다.
        // 만약 분대가 최상위로 생성되면, 자기 자신을 전투 단위로 가집니다.
        if (!this.parent) {
            this.combatSubUnits.push(this);
        }
    }

    // 분대의 타입을 설정하고, 해당 타입의 능력치를 적용하는 메서드
    setType(type) {
        this.type = type;
        const stats = UNIT_TYPE_STATS[type];
        Object.assign(this, stats); // stats 객체의 모든 속성을 this에 복사
        this.organization = this.maxOrganization; // 조직력을 최대로 재설정
    }

    drawEchelonSymbol(ctx) {
        ctx.fillStyle = 'black';
        const dotSize = 2;
        const yPos = this.y - this.size - 6;
        // 1개의 점 그리기
        ctx.beginPath();
        ctx.arc(this.x, yPos, dotSize, 0, Math.PI * 2);
        ctx.fill();
    }
}