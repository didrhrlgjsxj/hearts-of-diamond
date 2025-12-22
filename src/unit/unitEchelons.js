/**
 * 부대 마크(Symbol)를 나타내는 클래스입니다.
 * 사단, 여단 등 지휘 부대의 정보를 담고, 화면에 부대 마크로 그려집니다.
 * Unit을 상속받습니다.
 */
class SymbolUnit extends Unit {
    constructor(name, x, y, team, size, echelon = null) {
        super(name, x, y, 0, size, team);
        this.isMoving = false; // 현재 이동 중인지 여부를 나타내는 플래그
        this.isIndependentMoving = false; // 독립적으로 이동 중인지 여부
        this.formationMode = 'base'; // 'base' 또는 'custom'
        this.echelon = echelon; // 부대 규모 (e.g., 'DIVISION', 'BRIGADE')
        this.echelonSymbol = ECHELON_SYMBOLS[echelon] || ''; // 이제 ECHELON_SYMBOLS가 로드된 후 호출됩니다.
        this.hqCompany = null;   // 모든 지휘부대의 본부 역할을 하는 '중대'
    }

    // 이동 명령을 받으면, 목표 지점과 방향만 설정합니다.
    moveTo(x, y, allUnits = []) {
        // SymbolUnit의 moveTo는 하위 유닛의 진형 목표를 설정하므로, 충돌 방지 로직을 여기에 직접 적용하지 않고
        // 각 하위 유닛이 자신의 moveTo에서 처리하도록 위임합니다.
        this.destination = { x, y }; // 상위 부대의 최종 목표만 설정
        this.isMoving = true; // 이동 시작

        // 하위 부대를 직접 이동시키면 커스텀 진형 모드가 됩니다.
        if (this.parent && this.parent instanceof SymbolUnit) {
            if (this.parent && this.parent instanceof SymbolUnit) {
                // 부모의 본부대대(hqBattalion)가 아닌, 일반 하위 대대를 직접 움직일 때만 커스텀 진형으로 전환합니다.
                const isNotHqUnit = this.parent.hqCompany !== this;

                if (isNotHqUnit && this.parent.formationMode === 'base') {
                    this.parent.formationMode = 'custom';
                    console.log(`${this.parent.name}의 진형이 'custom' 모드로 전환됩니다. 현재 대형을 기준으로 상대 위치를 저장합니다.`);

                    // 모든 형제 유닛(자신 포함)의 현재 상대 위치를 기록합니다.
                    this.parent.subUnits.forEach(subUnit => {
                        // 지휘 부대(대대 등) 또는 역할이 있는 부대만 상대 위치를 기록합니다.
                        if (subUnit instanceof SymbolUnit || subUnit.role) {
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
    
    updateMovement(deltaTime) {
        // 1. 부대 자체의 이동을 먼저 처리합니다. (Unit의 기본 로직 사용)
        super.updateMovement(deltaTime);

        // 2. 이동이 끝났는지 확인하고 상태를 업데이트합니다.
        if (this.destination === null && this.isMoving) {
            this.isMoving = false;
        }

        // 3. 지휘 부대가 이동하는 동안 실시간으로 휘하 부대들의 진형 목표 위치를 업데이트합니다.
        this.updateCombatSubUnitPositions();

        // 4. 모든 하위 부대(중대, 대대 등)가 각자의 목표(진형 위치)를 향해 이동하도록 업데이트를 호출합니다.
        this.subUnits.forEach(subUnit => {
            if (!subUnit.isDestroyed) {
                subUnit.updateMovement(deltaTime);
            }
        });
    }

    // SymbolUnit의 위치는 부대 마크의 위치입니다.
    get x() { return this._x; }
    set x(value) { this._x = value; }
    get y() { return this._y; }
    set y(value) { this._y = value; }
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
        this.subUnits.forEach(subUnit => delete subUnit.relativePosition); // 커스텀 위치 초기화
        const hqPosition = this; // 이제 항상 SymbolUnit의 위치를 기준점으로 사용

        // 모든 하위 부대(본부 중대 포함)를 역할별로 그룹화합니다.
        const roles = {};
        this.subUnits.forEach(unit => {
            // 파괴되었거나, 역할이 없거나, 재정비 중인 유닛은 진형 배치에서 제외합니다.
            if (unit.isDestroyed || !unit.role || unit.isRefitting) return;
            if (!roles[unit.role]) roles[unit.role] = [];
            roles[unit.role].push(unit);
        });

        // 각 역할 그룹에 대해 진형 위치를 설정합니다.
        Object.keys(roles).forEach(role => {
            const unitsInRole = roles[role];
            const offsetInfo = FORMATION_OFFSETS[role];
            if (!offsetInfo) return;

            // 후위(Rearguard) 역할의 경우, 본부 중대를 중앙에 고정합니다.
            if (role === FORMATION_ROLES.REARGUARD) {
                // 후위 부대들은 심볼 부대(this.x, this.y)를 중심으로 좌우로 배치됩니다.
                unitsInRole.forEach((unit, i) => {
                    const positionIndex = i - (unitsInRole.length - 1) / 2;
                    const sideOffsetAngle = this.direction + Math.PI / 2;
                    const sideOffset = positionIndex * offsetInfo.spread;

                    const destX = this.x + (offsetInfo.distance * Math.cos(this.direction)) + (sideOffset * Math.cos(sideOffsetAngle));
                    const destY = this.y + (offsetInfo.distance * Math.sin(this.direction)) + (sideOffset * Math.sin(sideOffsetAngle));
                    unit.destination = { x: destX, y: destY };
                });
            } else {
                // 후위가 아닌 다른 역할의 부대들을 배치합니다.
                this.setSubUnitFormation(unitsInRole, offsetInfo); // 기존 로직 재사용
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
        ctx.fillText(this.echelonSymbol, this.snappedX, this.snappedY + size * 0.1);
    }
}
/** 대대 (Battalion) */
class Battalion extends SymbolUnit {
    constructor(name, x, y, team, size) {
        super(name, x, y, team, size, 'BATTALION');
        this.role = 'FRONTLINE'; // 기본 역할은 '전위'
        // Battalion은 이제 스스로 이동하고, 자신의 하위 중대들을 관리합니다.
        this.engagementRange = 280; // 대대의 교전 범위는 70 * 4 = 280으로 설정
        // Battalion은 SymbolUnit이므로, x, y, direction getter/setter는 SymbolUnit의 것을 사용합니다.

        // 타겟 선정 최적화를 위한 타이머
        this.targetSelectionTimer = Math.random(); // 초기값을 랜덤하게 주어 부하 분산
        this.targetSelectionCooldown = 1.5; // 1.5초마다 타겟 재설정
    }
}
/** 중대 (Company) */
class Company extends Unit {
    constructor(name, x, y, team) {
        super(name, x, y, 0, 5, team, 'INFANTRY');
        this.echelon = 'COMPANY';
        this.role = 'REARGUARD'; // 기본 역할은 '후위'
        this.combatEffectiveness = 1.0; // 전투 효율성 계수
        this.companyTarget = null; // 중대가 조준하는 적 중대
    }

    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('|', this.snappedX, this.snappedY - this.size - 5);
    }
}
// 소대(Platoon)와 분대(Squad) 클래스는 더 이상 실제 유닛으로 생성되지 않으므로 제거합니다.