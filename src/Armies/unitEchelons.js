import { Unit } from './unitBase.js';
import { BATTALION_ROLES, BATTALION_FORMATION_OFFSETS, COMPANY_ROLES, ECHELON_SYMBOLS, FORMATION_OFFSETS, UNIT_TYPES, UNIT_DURABILITIES, UNIT_TYPE_STATS } from './unitConstants.js';

/**
 * 지휘 부대 (사단, 여단, 연대, 대대)의 공통 로직을 담는 기본 클래스입니다.
 * Unit을 상속받습니다.
 */
export class CommandUnit extends Unit {
    constructor(name, x, y, team, size, echelon = null) {
        super(name, x, y, 0, size, team);
        this.isIndependentMoving = false; // 독립적으로 이동 중인지 여부
        this.formationMode = 'base'; // 'base' 또는 'custom'
        this.echelon = echelon; // 부대 규모 (e.g., 'DIVISION', 'BRIGADE')
        this.echelonSymbol = ECHELON_SYMBOLS[echelon] || '';
        this.reserveUnits = []; // 지휘관을 잃은 예비대 유닛 목록
    }

    // 이동 명령을 받으면, 목표 지점과 방향만 설정합니다.
    moveTo(x, y, allUnits = []) {
        // CommandUnit의 moveTo는 하위 유닛의 진형 목표를 설정하므로, 충돌 방지 로직을 여기에 직접 적용하지 않고
        // 각 하위 유닛이 자신의 moveTo에서 처리하도록 위임합니다.
        this.destination = { x, y }; // 상위 부대의 최종 목표만 설정
        const dx = x - this.x;
        const dy = y - this.y;
        this.direction = Math.atan2(dy, dx);
        // 최상위 부대가 아닌, 하위 지휘부대를 직접 움직일 때만 독립 이동으로 간주합니다.
        if (this.parent && this.parent instanceof CommandUnit) {
            this.isIndependentMoving = true; // 독립 이동 시작
        }

        // 하위 부대를 직접 이동시키면 커스텀 진형 모드가 됩니다.
        if (this.parent && this.parent instanceof CommandUnit) {
            // 부모의 진형이 'base'일 때만 'custom'으로 전환하고, 현재 진형을 저장합니다.
            if (this.parent.formationMode === 'base') {
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
                });
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
    updateMovement(deltaTime) {
        super.updateMovement(deltaTime); // Unit의 기본 이동 로직을 그대로 사용합니다.

        // 2. 목표 지점에 도달하면 독립 이동 상태를 해제합니다.
        if (this.isIndependentMoving && this.destination === null) { // 목표 도달
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

        // 1단계: 하위 부대가 대대(CommandUnit)인지 확인합니다.
        if (this.subUnits.length > 0 && this.subUnits.find(u => u instanceof CommandUnit)) {
            // 사단/여단/연대의 경우: 휘하 대대들을 배치합니다.
            const hqX = this.x; // 자신의 위치를 기준으로 합니다.
            const hqY = this.y; 
            const battalions = this.subUnits.filter(u => u instanceof CommandUnit && !u.isDestroyed);

            // 진형 계산 전에, 모든 하위 대대의 방향을 자신의 방향과 동기화합니다.
            // 이렇게 해야 대대 휘하의 중대들도 올바른 방향으로 진형을 유지할 수 있습니다.
            battalions.forEach(battalion => {
                battalion.direction = this.direction;
            });

            const roles = {};
            battalions.forEach(b => {
                if (!b.role) b.role = BATTALION_ROLES.MAIN_FORCE; // 역할이 없으면 '주력'으로 간주
                if (!roles[b.role]) roles[b.role] = [];
                roles[b.role].push(b);
            });

            Object.keys(roles).forEach(role => {
                const battalionsInRole = roles[role];
                const offsetInfo = BATTALION_FORMATION_OFFSETS[role];
                if (!offsetInfo) return;

                const count = battalionsInRole.length;
                const formationPoints = [];

                for (let i = 0; i < count; i++) {
                    const sideOffsetAngle = this.direction + Math.PI / 2;
                    const sideOffset = (i - (count - 1) / 2) * offsetInfo.spread;
                    const destX = hqX + (offsetInfo.distance * Math.cos(this.direction)) + (sideOffset * Math.cos(sideOffsetAngle));
                    const destY = hqY + (offsetInfo.distance * Math.sin(this.direction)) + (sideOffset * Math.sin(sideOffsetAngle));
                    formationPoints.push({ x: destX, y: destY });
                }

                const assignedPoints = new Array(count).fill(false);
                battalionsInRole.forEach(unit => {
                    let closestPointIndex = -1;
                    let minDistance = Infinity;
                    for (let i = 0; i < formationPoints.length; i++) {
                        if (assignedPoints[i]) continue;
                        const point = formationPoints[i];
                        const distance = Math.hypot(unit.x - point.x, unit.y - point.y);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestPointIndex = i;
                        }
                    }
                    if (closestPointIndex !== -1) {
                        unit.destination = formationPoints[closestPointIndex];
                        assignedPoints[closestPointIndex] = true;
                    }
                });
            });
        } else if (this.subUnits.length > 0 && this.subUnits.find(u => u instanceof Company)) {
            // 2단계: 대대의 경우: 휘하 중대들을 역할에 따라 배치합니다.
            const hqX = this.x; // 자신의 위치를 기준으로 합니다.
            const hqY = this.y;
            const companies = this.subUnits.filter(u => u instanceof Company && !u.isDestroyed);

            const roles = {};
            companies.forEach(c => {
                if (!roles[c.role]) roles[c.role] = [];
                roles[c.role].push(c);
            });

            Object.keys(roles).forEach(role => {
                const companiesInRole = roles[role];
                const offsetInfo = FORMATION_OFFSETS[role];
                if (!offsetInfo) return;

                const count = companiesInRole.length;
                const formationPoints = [];

                // 역할에 대한 모든 진형 목표 지점을 미리 계산합니다.
                for (let i = 0; i < count; i++) {
                    // 상위 부대(대대)의 현재 방향을 기준으로 진형을 계산합니다.
                    const parentDirection = this.direction;
                    const sideOffsetAngle = parentDirection + Math.PI / 2;
                    const sideOffset = (i - (count - 1) / 2) * offsetInfo.spread;
                    const destX = hqX + (offsetInfo.distance * Math.cos(parentDirection)) + (sideOffset * Math.cos(sideOffsetAngle));
                    const destY = hqY + (offsetInfo.distance * Math.sin(parentDirection)) + (sideOffset * Math.sin(sideOffsetAngle));
                    formationPoints.push({ x: destX, y: destY });
                }

                // 각 중대가 자신에게 가장 가까운, 아직 할당되지 않은 목표 지점을 찾아가도록 합니다.
                const assignedPoints = new Array(count).fill(false);
                companiesInRole.forEach(unit => {
                    let closestPointIndex = -1;
                    let minDistance = Infinity;
                    for (let i = 0; i < formationPoints.length; i++) {
                        if (assignedPoints[i]) continue;
                        const point = formationPoints[i];
                        const distance = Math.hypot(unit.x - point.x, unit.y - point.y);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestPointIndex = i;
                        }
                    }
                    if (closestPointIndex !== -1) {
                        unit.destination = formationPoints[closestPointIndex];
                        assignedPoints[closestPointIndex] = true;
                    }
                });
            });
        }
    }

    drawEchelonSymbol(ctx) {
        if (!this.echelonSymbol) return;

        const yPos = this.y - this.size - 15; // 정보 영역의 상단
        const size = 12; // 폰트 크기 고정
        // 심볼 길이에 따라 폰트 크기 동적 조절
        const fontSize = this.echelonSymbol.length > 1 ? size * 0.9 : size;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'black';
        ctx.fillText(this.echelonSymbol, this.x, yPos);
    }
}
/** 대대 (Battalion) */
export class Battalion extends CommandUnit {
    constructor(name, x, y, team, size) {
        super(name, x, y, team, size, 'BATTALION');
        this.role = BATTALION_ROLES.MAIN_FORCE; // 기본 역할은 '주력'
    }

}
/** 중대 (Company) */
export class Company extends Unit {
    constructor(name, x, y, team) {
        super(name, x, y, 0, 7, team, UNIT_TYPES.INFANTRY);
        this.role = COMPANY_ROLES.SUSTAINMENT; // 기본 역할. division_templates에서 덮어쓸 수 있음.
        this.formationRadius = 20; // 이 속성은 더 이상 사용되지 않을 수 있습니다.
        this.nemosSpawned = false; // 이 중대의 네모들이 실제로 생성되었는지 여부
        this.damageAccumulator = 0; // Nemo 파괴를 트리거하기 위한 피해 누적 변수
        // 하위 유닛 생성은 이제 division_templates.js에서 담당합니다.
    }

    drawEchelonSymbol(ctx) {
        const yPos = this.y - this.size - 15;
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('|', this.x, yPos);
    }
}
/** 소대 (Platoon) */
export class Platoon extends Unit {
    constructor(name, x, y, team) {
        super(name, x, y, 0, 6, team, UNIT_TYPES.INFANTRY);
        this.formationRadius = 10;
        // 하위 유닛 생성은 이제 division_templates.js에서 담당합니다.
    }
    drawEchelonSymbol(ctx) {
        ctx.fillStyle = 'black';
        const dotSize = 2;
        const spacing = 5;
        const yPos = this.y - this.size - 18;
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
export class Squad extends Unit {
    constructor(name, x, y, team) {
        super(name, x, y, UNIT_DURABILITIES.SQUAD, 4, team, UNIT_TYPES.INFANTRY); // UNIT_DURABILITIES는 내구력을 의미
        this.nemoSquad = null; // 이 분대에 해당하는 NemoSquad 참조
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
        const yPos = this.y - this.size - 18;
        // 1개의 점 그리기
        ctx.beginPath();
        ctx.arc(this.x, yPos, dotSize, 0, Math.PI * 2);
        ctx.fill();
    }
}