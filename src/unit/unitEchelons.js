/**
 * 지휘 부대 (사단, 여단, 연대, 대대)의 공통 로직을 담는 기본 클래스입니다.
 * Unit을 상속받습니다.
 */
class CommandUnit extends Unit {
    constructor(name, x, y, team, size, echelon = null) {
        super(name, x, y, 0, size, team);
        this.isMoving = false; // 현재 이동 중인지 여부를 나타내는 플래그
        this.isIndependentMoving = false; // 독립적으로 이동 중인지 여부
        this.formationMode = 'base'; // 'base' 또는 'custom'
        this.echelon = echelon; // 부대 규모 (e.g., 'DIVISION', 'BRIGADE')
        this.echelonSymbol = ECHELON_SYMBOLS[echelon] || '';
        this.hqCompany = null;   // 모든 지휘부대의 본부 역할을 하는 '중대'
    }

    // 이동 명령을 받으면, 목표 지점과 방향만 설정합니다.
    moveTo(x, y, allUnits = []) {
        // CommandUnit의 moveTo는 하위 유닛의 진형 목표를 설정하므로, 충돌 방지 로직을 여기에 직접 적용하지 않고
        // 각 하위 유닛이 자신의 moveTo에서 처리하도록 위임합니다.
        this.destination = { x, y }; // 상위 부대의 최종 목표만 설정
        this.isMoving = true; // 이동 시작

        // 본부 대대가 있다면, 본부 대대에 이동 명령을 위임합니다.
        if (this.hqCompany) {
            this.hqCompany.moveTo(x, y, allUnits);
            this.direction = this.hqCompany.direction; // 본부 유닛의 방향을 따라갑니다.
        } else {
            // 본부 대대가 없는 경우 (예: 대대 자체)는 Unit의 기본 moveTo 로직을 따릅니다.
            super.moveTo(x, y, allUnits);
            // 최상위 부대가 아닌, 하위 지휘부대를 직접 움직일 때만 독립 이동으로 간주합니다.
            if (this.parent && this.parent instanceof CommandUnit) {
                this.isIndependentMoving = true; // 독립 이동 시작
            }

            // 하위 부대를 직접 이동시키면 커스텀 진형 모드가 됩니다.
            if (this.parent && this.parent instanceof CommandUnit) {
                // 부모의 본부대대(hqBattalion)가 아닌, 일반 하위 대대를 직접 움직일 때만 커스텀 진형으로 전환합니다.
                const isNotHqUnit = this.parent.hqCompany !== this;

                if (isNotHqUnit && this.parent.formationMode === 'base') {
                    this.parent.formationMode = 'custom';
                    console.log(`${this.parent.name}의 진형이 'custom' 모드로 전환됩니다. 현재 대형을 기준으로 상대 위치를 저장합니다.`);

                    // 모든 형제 유닛(자신 포함)의 현재 상대 위치를 기록합니다.
                    this.parent.subUnits.forEach(subUnit => {
                        // 지휘 부대(대대 등) 또는 역할이 있는 부대만 상대 위치를 기록합니다.
                        if (subUnit instanceof CommandUnit || subUnit.role) {
                            subUnit.relativePosition = {
                                x: subUnit.x - this.parent.x,
                                y: subUnit.y - this.parent.y,
                            };
                        }
                    }
                    );
                }
            }
        }
    }

    resetFormation() {
        this.formationMode = 'base';
        // 커스텀 진형을 위해 저장했던 상대 위치 정보를 초기화합니다.
        this.subUnits.forEach(subUnit => {
            if (subUnit.relativePosition) {
                delete subUnit.relativePosition;
            }
        });
    }
    
    // 이동 업데이트 시, 본부 중대에게 목표를 위임합니다.
    // 실제 이동 처리는 unitLogic.js에서 일괄적으로 수행됩니다.
    // CommandUnit의 x, y는 hqBattalion의 x, y를 따르므로, CommandUnit 자체의 updateMovement는 hqBattalion에 위임합니다.
    updateMovement(deltaTime) {
        if (this.hqCompany) {
            // 본부 유닛의 이동을 업데이트합니다.
            this.hqCompany.updateMovement(deltaTime);
            // 본부 유닛이 목표에 도달하면 CommandUnit의 destination도 null로 설정합니다.
            if (this.hqCompany.destination === null) {
                this.destination = null;
                if (this.isMoving) {
                    this.isMoving = false; // 이동 종료
                }
            } else {
                // 본부 유닛이 아직 이동 중이면, 실시간으로 진형을 업데이트합니다.
                this.updateCombatSubUnitPositions();
            }
            // 본부 유닛의 방향을 따라갑니다.
            this.direction = this.hqCompany.direction;
        } else {
            // 본부 대대가 없는 경우 (예: 대대 자체)는 Unit의 기본 이동 로직을 따릅니다.
            super.updateMovement(deltaTime);
        }

        // 목표 지점에 도달하면 독립 이동 상태를 해제합니다.
        // 이 로직은 CommandUnit 자체의 destination이 null이 되었을 때 (즉, hqBattalion이 목표에 도달했을 때) 실행됩니다.
        // 또는 CommandUnit 자체가 이동하는 경우 (hqBattalion이 없을 때) 실행됩니다.
        if (this.isIndependentMoving && this.destination === null) {
            this.isIndependentMoving = false;
            // 커스텀 진형 유지를 위해, 멈춘 위치를 기준으로 새로운 상대 위치를 기록합니다.
            if (this.parent && this.parent.formationMode === 'custom') {
                this.relativePosition = {
                    x: this.x - this.parent.x,
                    y: this.y - this.parent.y,
                };
            }
        }
    }

    // CommandUnit의 위치는 본부 대대의 위치를 따릅니다.
    get x() {
        // 본부 유닛이 있으면 그 위치를, 없으면 자신의 위치를 반환합니다.
        return this.hqCompany ? this.hqCompany.x : this._x;
    }
    set x(value) {
        if (this.hqCompany) this.hqCompany.x = value;
        else this._x = value;
    }
    get y() {
        return this.hqCompany ? this.hqCompany.y : this._y;
    }
    set y(value) {
        if (this.hqCompany) this.hqCompany.y = value;
        else this._y = value;
    }

    // CommandUnit의 방향은 본부 대대의 방향을 따릅니다.
    get direction() {
        return this.hqCompany ? this.hqCompany.direction : this._direction;
    }
    set direction(value) {
        if (this.hqCompany) this.hqCompany.direction = value;
        else this._direction = value;
    }
    /**
     * 휘하 부대들의 진형을 업데이트합니다.
     * 이 메서드는 2단계로 작동합니다.
     * 1. 상위 부대(사단/여단/연대)는 휘하의 대대들을 배치합니다.
     * 2. 대대는 휘하의 중대들을 배치합니다.
     */
    updateCombatSubUnitPositions() {
        if (this.subUnits.length === 0) return;

        // 커스텀 진형 모드일 때의 로직
        if (this.formationMode === 'custom') {
            // 커스텀 모드에서는 자동 진형 배치를 하지 않습니다.
            // 각 하위 부대는 사용자가 지정한 목표 지점(destination)으로 이동하거나

            return; // 커스텀 진형일 때는 아래의 기본 진형 로직을 실행하지 않습니다.
        }

        // 기본 진형('base') 모드일 때의 로직
        // 모든 하위 부대의 상대 위치를 초기화하여 기본 진형을 따르도록 합니다.
        this.subUnits.forEach(subUnit => delete subUnit.relativePosition);
        const hqPosition = this; // 이제 항상 CommandUnit의 위치(hqBattalion의 위치)를 기준점으로 사용

        // 모든 하위 부대(본부 중대 포함)를 역할별로 그룹화합니다.
        const roles = {};
        this.subUnits.forEach(unit => {
            if (unit.isDestroyed || !unit.role) return;
            if (!roles[unit.role]) roles[unit.role] = [];
            roles[unit.role].push(unit);
        });

        // 각 역할 그룹에 대해 진형 위치를 설정합니다.
        Object.keys(roles).forEach(role => {
            const unitsInRole = roles[role];
            const offsetInfo = FORMATION_OFFSETS[role];
            if (!offsetInfo) return;

            // 후위(Rearguard) 역할의 경우, 본부 중대를 중앙에 고정합니다.
            if (role === FORMATION_ROLES.REARGUARD && this.hqCompany) {
                // 본부 중대를 제외한 나머지 후위 부대들
                const otherRearguardUnits = unitsInRole.filter(u => u !== this.hqCompany);
                
                // 1. 본부 중대의 목표 위치는 항상 기준점(부모의 위치)입니다.
                this.hqCompany.destination = { x: this.x, y: this.y };

                // 2. 나머지 후위 부대들을 본부 중대 주변에 배치합니다.
                // 본부 중대가 중앙(0)을 차지하므로, 인덱스를 조정하여 배치합니다.
                otherRearguardUnits.forEach((unit, i) => {
                    // i=0 -> -1, i=1 -> 1, i=2 -> -2, i=3 -> 2 ...
                    const positionIndex = (i % 2 === 0) ? - (Math.floor(i / 2) + 1) : (Math.floor(i / 2) + 1);
                    
                    const sideOffsetAngle = this.direction + Math.PI / 2;
                    const sideOffset = positionIndex * offsetInfo.spread;

                    const destX = this.x + (offsetInfo.distance * Math.cos(this.direction)) + (sideOffset * Math.cos(sideOffsetAngle));
                    const destY = this.y + (offsetInfo.distance * Math.sin(this.direction)) + (sideOffset * Math.sin(sideOffsetAngle));
                    unit.destination = { x: destX, y: destY };
                });

            } else {
                // 후위가 아닌 다른 역할의 부대들을 배치합니다.
                this.setSubUnitFormation(unitsInRole, offsetInfo);
            }
        });
    }

    /**
     * 주어진 역할의 중대들에게 진형에 맞는 상대 위치를 설정합니다.
     * @param {Company[]} companies - 위치를 설정할 중대 배열
     * @param {{distance: number, spread: number}} offsetInfo - 진형 오프셋 정보
     * @param {number} [baseDirection=0] - 기준 방향 (라디안). 기본값은 0 (오른쪽).
     */
    setSubUnitFormation(companies, offsetInfo) {
        // 전투 중이 아닐 때만 진형을 강제로 설정합니다.
        // 전투 중에는 중대들이 자율적으로 위치를 잡습니다.
        if (this.isInCombat && !this.isMoving) return;

        const count = companies.length;
        const baseX = this.x;
        const baseY = this.y;

        // 각 중대에 진형 목표 위치(destination)를 할당합니다.
        // 실제 이동은 updateMovement에서 처리됩니다.
        companies.forEach((unit, i) => {
            const sideOffsetAngle = this.direction + Math.PI / 2;
            const sideOffset = (i - (count - 1) / 2) * offsetInfo.spread;

            const destX = baseX + (offsetInfo.distance * Math.cos(this.direction)) + (sideOffset * Math.cos(sideOffsetAngle));
            const destY = baseY + (offsetInfo.distance * Math.sin(this.direction)) + (sideOffset * Math.sin(sideOffsetAngle));
            unit.destination = { x: destX, y: destY };
        });
    }

    drawEchelonSymbol(ctx) {
        if (!this.echelonSymbol) return;

        const size = this.size * 2;
        // 심볼 길이에 따라 폰트 크기 동적 조절
        const fontSize = this.echelonSymbol.length > 1 ? size * 0.8 : size;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'black';
        ctx.fillText(this.echelonSymbol, this.x, this.y + size * 0.1);
    }
}
/** 대대 (Battalion) */
class Battalion extends CommandUnit {
    constructor(name, x, y, team, size) {
        super(name, x, y, team, size, 'BATTALION'); // Battalion은 이제 CommandUnit을 상속받습니다.
        this.role = FORMATION_ROLES.FRONTLINE; // 기본 역할은 '전위'
        // Battalion은 이제 스스로 이동하고, 자신의 하위 중대들을 관리합니다.
        this.engagementRange = 280; // 대대의 교전 범위는 70 * 4 = 280으로 설정
        // Battalion은 CommandUnit이므로, x, y, direction getter/setter는 CommandUnit의 것을 사용합니다.
        // CommandUnit의 x, y, direction은 hqBattalion이 없으면 _x, _y, _direction을 사용합니다.
    }

    /**
     * 대대의 이동 로직입니다. 대대 자체가 이동하고, 휘하 중대들이 진형을 유지하며 따라오게 합니다.
     * @param {number} deltaTime 
     */
    updateMovement(deltaTime) {
        // 1. 대대 자체의 이동을 처리합니다. (Unit의 기본 이동 로직 사용)
        super.updateMovement(deltaTime);

        // 2. 전투 중이 아닐 때, 휘하 중대들의 진형을 계속 업데이트합니다.
        if (!this.isInCombat) {
            this.updateCombatSubUnitPositions();
        }

        // 3. 모든 중대들이 각자의 목표(진형 위치)를 향해 이동하도록 업데이트를 호출합니다.
        this.subUnits.forEach(c => c.updateMovement(deltaTime));
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
        this.role = FORMATION_ROLES.REARGUARD; // 기본 역할은 '후위'
        this.formationRadius = 20;
        this.combatParticipation = 0; // 전투 참여도 (0 to 1, 거리에 따라)
        this.lineIndex = -1; // 진형 내 자신의 순번 (왼쪽부터 0, 1, 2...)
        this.leftNeighbor = null; // 왼쪽 이웃 중대
        this.rightNeighbor = null; // 오른쪽 이웃 중대
        this.combatEffectiveness = 1.0; // 전투 효율성 계수
        this.companyTarget = null; // 중대가 조준하는 적 중대
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
        if (stats) {
            Object.assign(this, stats); // stats 객체의 모든 속성을 this에 복사
        }
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