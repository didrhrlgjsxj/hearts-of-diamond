import { BATTALION_ROLES, BATTALION_FORMATION_OFFSETS, COMPANY_ROLES, ECHELON_SYMBOLS, FORMATION_OFFSETS, MIN_UNIT_SPACING, UNIT_TYPE_ICONS } from "./unitConstants.js";

/**
 * 모든 군사 유닛의 기본이 되는 클래스입니다.
 * 이름, 위치, 하위 유닛 목록을 가집니다.
 */
export class Unit {
    constructor(name, x = 0, y = 0, baseStrength = 0, size = 5, team = 'blue', type = null) {
        this.name = name;
        this._x = x; // 유닛의 절대 또는 상대 X 좌표
        this._y = y; // 유닛의 절대 또는 상대 Y 좌표
        this.type = type; // 유닛 타입 (보병, 기갑 등)
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
        this.isEnemyDetected = false; // 적 발견 상태 여부
        this.isDestroyed = false; // 유닛이 파괴되었는지 여부
        this.destination = null; // 이동 목표 지점 {x, y}
        this.isRetreating = false; // 후퇴 중인지 여부
        this.isReserve = false; // 예비대 상태인지 여부
        this.direction = -Math.PI / 2; // 부대 진형의 현재 방향 (기본값: 위쪽)
        this.moveSpeed = 30; // 초당 이동 속도
        this.floatingTexts = []; // 피해량 표시 텍스트 배열
        this.displayStrength = -1; // 화면에 표시되는 체력 (애니메이션용)
        this.attackCooldown = 2.0; // 공격 주기 (초)
        this.attackProgress = 0;   // 현재 공격 진행도
        this.currentTarget = null; // 현재 공격 대상
        this.isBeingTargeted = false; // 다른 유닛에게 공격받고 있는지 여부
        this.combatSubUnits = []; // 실제 전투를 수행하는 가상 하위 부대
        this.formationRadius = 0; // 전투 부대 배치 반경
        this.organizationRecoveryRate = 5; // 초당 조직력 회복량 (비전투)
        this.organizationRecoveryRateInCombat = 0.5; // 초당 조직력 회복량 (전투 중)
        this.minOrgDamageAbsorption = 0.1; // 조직력 0%일 때의 최소 피해 흡수율
        this.maxOrgDamageAbsorption = 0.9; // 조직력 100%일 때의 최대 피해 흡수율

        // 신규 능력치
        this.firepower = 0;
        this.softAttack = 0;
        this.hardAttack = 0;
        this.reconnaissance = 0;
        this.armor = 0;
        this.tracers = []; // 예광탄 효과 배열

        // 조직력은 maxOrganization getter가 정의된 후에 초기화해야 합니다.
        this.organization = this.maxOrganization; // 현재 조직력
    }

    // 정찰력에 기반한 탐지 범위 계산
    get detectionRange() {
        // 기본 탐지 범위 100에 정찰력 능력치를 더합니다.
        // 하위 유닛이 있다면 그 유닛들의 정찰력 총합을 사용합니다.
        return 100 + this.totalReconnaissance;
    }

    // 부모가 있으면 상대 위치를, 없으면 절대 위치를 반환
    get x() {
        return this._x;
    }

    // 부모가 있으면 상대 위치를, 없으면 절대 위치를 설정
    set x(value) {
        this._x = value;
    }

    get y() {
        return this._y;
    }

    set y(value) {
        this._y = value;
    }

    /**
     * 현재 병력을 계산합니다.
     * 하위 유닛이 있으면 그 유닛들의 병력 총합을, 없으면 자신의 기본 병력을 기준으로 계산합니다.
     */
    get currentStrength() {
        if (this.isDestroyed) return 0;
        return Math.max(0, this.damageTaken > 0 ? this._baseStrength - this.damageTaken : this._baseStrength);
    }

    /**
     * 기본 편성 병력을 반환합니다. 이 값은 생성 시점에 고정됩니다.
     */
    get baseStrength() {
        return this._baseStrength;
    }

    /**
     * 부대의 기갑화율(Hardness)을 계산합니다. 0(완전 보병)에서 1(완전 기갑) 사이의 값입니다.
     * 기갑화율은 대인/대물 공격이 얼마나 효과적으로 적용될지 결정하는 데 사용됩니다.
     */
    get hardness() {
        const allSquads = this.getAllSquads();
        if (allSquads.length === 0) {
            return 0; // 분대가 없으면 소프트 타겟으로 간주
        }

        // 장갑이 1 이상인 분대의 비율을 기갑화율로 계산합니다.
        // 이는 보병(장갑 0)과 기갑/차량화 유닛을 구분하는 간단한 척도입니다.
        const armoredSquads = allSquads.filter(squad => squad.armor > 0).length;
        return armoredSquads / allSquads.length;
    }

    /**
     * 부대 편제가 완료된 후, 최대 조직력에 맞춰 현재 조직력을 초기화합니다.
     * 이 메서드는 재귀적으로 모든 하위 유닛에 대해 호출됩니다.
     */
    initializeOrganization() {
        this.organization = this.maxOrganization;
        this.subUnits.forEach(subUnit => subUnit.initializeOrganization());
    }

    /**
     * 이 유닛의 최상위 부모 유닛을 찾습니다.
     * @returns {Unit} 최상위 유닛
     */
    getTopLevelParent() {
        let top = this;
        while (top.parent) {
            top = top.parent;
        }
        return top;
    }

    /**
     * 자신 및 모든 하위 유닛에 포함된 모든 분대(Squad)를 재귀적으로 찾습니다.
     * @returns {Squad[]}
     */
    getAllSquads() {
        if (this instanceof Squad) {
            return [this];
        }

        let squads = [];
        for (const subUnit of this.subUnits) {
            squads = squads.concat(subUnit.getAllSquads());
        }
        return squads;
    }

    /**
     * 자신 및 모든 하위 유닛에 포함된 모든 중대(Company)를 재귀적으로 찾습니다.
     * @returns {Company[]}
     */
    getAllCompanies() {
        if (this instanceof Company) {
            return [this];
        }

        let companies = [];
        if (this.subUnits.length > 0) {
            for (const subUnit of this.subUnits) {
                companies = companies.concat(subUnit.getAllCompanies());
            }
        }
        return companies;
    }
    /**
     * 자신 및 모든 하위 유닛에 포함된 모든 대대(Battalion)를 재귀적으로 찾습니다.
     * @returns {Battalion[]}
     */
    getAllBattalions() {
        if (this instanceof Battalion) {
            return [this];
        }

        let battalions = [];
        if (this.subUnits.length > 0) {
            for (const subUnit of this.subUnits) {
                battalions = battalions.concat(subUnit.getAllBattalions());
            }
        }
        return battalions;
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
    moveTo(x, y, allUnits = []) {
        let targetX = x;
        let targetY = y;

        // 다른 유닛과 너무 가까운지 확인하고 목표 위치를 조정합니다.
        for (const otherUnit of allUnits) {
            // 자기 자신, 부모, 자식 유닛은 충돌 검사에서 제외합니다.
            if (otherUnit === this || otherUnit === this.parent || this.subUnits.includes(otherUnit)) {
                continue;
            }

            const dist = Math.hypot(targetX - otherUnit.x, targetY - otherUnit.y);
            const requiredDist = this.size + otherUnit.size + MIN_UNIT_SPACING;

            if (dist < requiredDist) {
                // 목표가 너무 가까우면, 다른 유닛의 경계선까지만 이동하도록 목표를 수정합니다.
                const angle = Math.atan2(targetY - otherUnit.y, targetX - otherUnit.x);
                targetX = otherUnit.x + requiredDist * Math.cos(angle);
                targetY = otherUnit.y + requiredDist * Math.sin(angle);
            }
        }


        this.destination = { x: targetX, y: targetY };
        this.isRetreating = false; // 일반 이동 시 후퇴 상태 해제
    }

    /**
     * 유닛의 이동을 처리합니다.
     * @param {number} deltaTime 프레임 간 시간 간격 (초)
     */
    updateMovement(deltaTime) {
        // 파괴되었거나 이동 목표가 없으면 아무것도 하지 않습니다.
        if (this.isDestroyed || !this.destination) return;

        const dx = this.destination.x - this.x;
        const dy = this.destination.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 목표 지점까지의 거리가 1픽셀 이상일 때만 이동 방향을 업데이트합니다.
        if (distance > 1) this.direction = Math.atan2(dy, dx);

        const moveDistance = this.moveSpeed * deltaTime;

        if (distance < moveDistance) {
            // 목표에 도달함
            this.x = this.destination.x;
            this.y = this.destination.y;
            this.destination = null;
            // 후퇴 중이었다면, 목표 도달 시 상태를 해제합니다.
            if (this.isRetreating) {
                this.isRetreating = false;
            }
        } else {
            // 목표를 향해 이동
            const moveX = (dx / distance) * moveDistance;
            const moveY = (dy / distance) * moveDistance;
            this.x += moveX;
            this.y += moveY;
        }
    }

    /**
     * 유닛이 특정 지점으로 후퇴하도록 명령합니다.
     * @param {number} x 후퇴할 x 좌표
     * @param {number} y 후퇴할 y 좌표
     */
    retreatTo(x, y) {
        this.isRetreating = true;
        this.destination = { x, y };
    }

    /**
     * 특정 위치에서 가장 가까운, 피해를 입을 분대를 찾습니다.
     * @param {number} fromX 공격이 시작된 X 좌표
     * @param {number} fromY 공격이 시작된 Y 좌표
     * @returns {Unit|null} 피해를 입을 전투 단위 (중대)
     */
    findUnitToTakeDamage(fromX, fromY) {
        let closestUnit = null;
        let minDistance = Infinity;

        for (const unit of this.combatSubUnits) {
            if (unit.currentStrength <= 0) continue; // 이미 파괴된 유닛은 제외
            const distance = Math.hypot(unit.x - fromX, unit.y - fromY);
            if (distance < minDistance) {
                minDistance = distance;
                closestUnit = unit;
            }
        }
        return closestUnit;
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
     * @param {number} totalAttackPower 장갑으로 경감된 후의 총 공격력
     * @param {number} firepowerDamage 화력에 의한 추가 조직력 피해
     * @param {{x: number, y: number}} fromCoords 공격자 좌표
     */
    takeDamage(totalAttackPower, firepowerDamage, fromCoords) {
        // 1. 현재 조직력 상태에 따라 피해 흡수율을 계산합니다.
        const orgRatio = this.organization / this.maxOrganization;
        const absorptionRange = this.maxOrgDamageAbsorption - this.minOrgDamageAbsorption;
        const damageAbsorptionRate = this.minOrgDamageAbsorption + (orgRatio * absorptionRange);

        // 2. 총 공격력을 조직력 피해와 내구력 피해로 분배합니다.
        const orgDamageFromAttack = totalAttackPower * damageAbsorptionRate;
        const strengthDamage = totalAttackPower * (1 - damageAbsorptionRate);

        // 3. 최종 조직력 피해를 계산하고 적용합니다.
        const finalOrgDamage = orgDamageFromAttack + firepowerDamage;
        this.organization = Math.max(0, this.organization - finalOrgDamage);

        // 4. 최종 내구력 피해를 적용하고, 파괴 여부를 확인합니다.
        if (strengthDamage > 0) {
            this.damageTaken += strengthDamage;
            // 내구력 피해량 텍스트를 생성합니다.
            this.getTopLevelParent().floatingTexts.push({
                text: `-${Math.floor(strengthDamage)}`,
                life: 1.5, // 1.5초 동안 표시
                alpha: 1.0,
                x: this.x,
                y: this.y - this.size - 5,
            });
        }

        // 5. 유닛이 파괴되었는지 확인하고, 그렇다면 상위 부대 목록에서 제거합니다.
        if (this.currentStrength <= 0) {
            this.isDestroyed = true;
            this.organization = 0;
            this.destination = null;
            // combatSubUnits 목록에서만 제거하여 전투 로직에서 제외시킵니다.
            this.getTopLevelParent().combatSubUnits = this.getTopLevelParent().combatSubUnits.filter(s => s !== this);

            // 만약 파괴된 유닛이 지휘 부대(CommandUnit)였다면, 휘하의 남은 중대들을 예비대로 전환합니다.
            if (this instanceof CommandUnit) {
                const survivingCompanies = this.subUnits.filter(u => u instanceof Company && !u.isDestroyed);
                const topLevelParent = this.getTopLevelParent();

                survivingCompanies.forEach(company => {
                    console.log(`${company.name}이(가) 지휘관을 잃고 예비대로 전환됩니다.`);
                    company.isReserve = true; // 예비대 상태로 변경
                    // 상위 부대의 목록에서 제거
                    this.subUnits = this.subUnits.filter(u => u !== company);
                    // 최상위 부대의 예비대 목록으로 이동
                    if (topLevelParent) topLevelParent.reserveUnits.push(company);
                });
            }
        }
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

        // 예광탄 효과 업데이트
        this.tracers = this.tracers.filter(t => t.life > 0);
        this.tracers.forEach(t => {
            t.life -= deltaTime;
            t.alpha = Math.max(0, t.life / 0.5);
        });

    }

    /**
     * 교전 범위 내의 적 유닛을 찾습니다.
     * @param {Unit[]} allUnits 모든 최상위 유닛 목록
     * @returns {Unit|null} 가장 가까운 적 유닛 또는 null
     */
    findEnemyInRange(allUnits) {
        // 이 메서드는 이제 main.js의 새로운 전투 로직으로 대체됩니다.
        // 개별 유닛이 아닌, combatSubUnit을 기준으로 적을 찾습니다.
        // 호환성을 위해 빈 메서드로 남겨둘 수 있습니다.
        return null;
    }

    /**
     * 특정 좌표에 가장 가까운 가상 전투 부대를 찾습니다.
     * @param {number} x 월드 X 좌표
     * @param {number} y 월드 Y 좌표
     */
    getClosestCombatSubUnit(x, y) {
        return this.combatSubUnits.reduce((closest, unit) => {
            const dist = Math.hypot(unit.x - x, unit.y - y);
            return dist < closest.dist ? { unit, dist } : closest;
        }, { unit: null, dist: Infinity }).unit;
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
        // 화면에 그려지는 순서의 역순(위에 그려진 유닛부터)으로 클릭을 확인합니다.
        // 지휘 부대는 하위 부대(대대, 중대)를 먼저 확인합니다.
        if (this instanceof CommandUnit) {
             // CommandUnit은 subUnits(대대) 또는 combatSubUnits(중대)를 그립니다.
             // 여기서는 클릭 가능한 대상인 subUnits(주로 대대)를 확인합니다.
             for (let i = this.subUnits.length - 1; i >= 0; i--) {
                 const subUnit = this.subUnits[i];
                 // 중대는 지휘부대 아이콘 아래에 그려지므로 여기서는 확인하지 않습니다.
                 if (subUnit instanceof CommandUnit) {
                     const found = subUnit.getUnitAt(x, y);
                     if (found) return found;
                 }
             }
        }

        // 하위 유닛에서 클릭된 것이 없거나, 자신이 최하위 유닛이면 자기 자신을 확인합니다.
        const distance = Math.hypot(x - this.x, y - this.y);
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
        // 파괴된 유닛은 그리지 않습니다.
        if (this.isDestroyed) return;

        // 부대 종류별 심볼을 먼저 그립니다.
        this.drawEchelonSymbol(ctx);

        const barWidth = 40;
            const barHeight = 5;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.size - 15; // 아이콘 크기에 맞춰 동적으로 위치 조정

            // 1. 병력 바 배경 (어두운 회색)
            ctx.fillStyle = '#555';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // 2. 현재 내구력(Strength) 바
            const currentBaseStrength = this.baseStrength; // 편제상의 최대 병력
            const strengthRatio = currentBaseStrength > 0 ? this.currentStrength / currentBaseStrength : 0;
            
            const baseBarWidth = barWidth * Math.min(strengthRatio, 1);
            ctx.fillStyle = '#ff8c00'; // DarkOrange
            ctx.fillRect(barX, barY, baseBarWidth, barHeight);

            if (strengthRatio > 1) {
                const reinforcedBarWidth = barWidth * (strengthRatio - 1);
                ctx.fillStyle = '#f0e68c'; // Khaki
                ctx.fillRect(barX + baseBarWidth, barY, Math.min(reinforcedBarWidth, barWidth - baseBarWidth), barHeight);
            }

            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);

            const orgBarY = barY + barHeight + 2;
            ctx.fillStyle = '#555';
            ctx.fillRect(barX, orgBarY, barWidth, barHeight);
            const orgRatio = this.organization / this.maxOrganization;
            ctx.fillStyle = '#00ff00'; // Lime Green
            ctx.fillRect(barX, orgBarY, barWidth * orgRatio, barHeight);
            ctx.strokeRect(barX, orgBarY, barWidth, barHeight);

        // --- 디버깅용: 모든 유닛 위에 현재 내구력 표시 ---
        // ctx.font = 'bold 14px sans-serif';
        // ctx.fillStyle = 'red';
        // ctx.textAlign = 'center';
        // ctx.textBaseline = 'bottom';
        // ctx.fillText(`내구력: ${Math.floor(this.currentStrength)}`, this.x, this.y - this.size - 15);
        // ctx.textBaseline = 'alphabetic'; // 텍스트 기준선 원래대로

        // 대대/여단은 반투명한 아이콘을, 그 외에는 일반 아이콘을 그립니다.
        if (this instanceof CommandUnit) {
            this.drawOwnIcon(ctx, 0.3); // 30% 투명도로 아이콘 렌더링
        } else {
            // 중대 부대는 자신의 아이콘을 그립니다.
            this.drawOwnIcon(ctx);
        }

        // 전투 중일 때 아이콘을 깜빡이게 표시
        if (this.isInCombat) {
            // 1초에 두 번 깜빡이는 효과
            if (Math.floor(Date.now() / 500) % 2 === 0) {
                ctx.fillStyle = 'rgba(255, 255, 0, 0.5)'; // 노란색 하이라이트
                ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
            }
        }
        // 적 발견 상태일 때 초록색으로 빛나게 표시 (테두리)
        if (this.isEnemyDetected) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 5, 0, Math.PI * 2); // 유닛 크기보다 약간 크게
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'; // 초록색 테두리
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // 부대 방향을 나타내는 선을 그립니다.
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.direction);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.size, 0);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // 선택된 유닛의 교전 범위를 표시합니다.
        if (this.isSelected) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.engagementRange, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'; // 반투명 노란색
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.font = '10px sans-serif';
        ctx.fillText(`${this.name}`, this.x, this.y + 25);

        // 피해량 텍스트 그리기
        ctx.font = 'bold 12px sans-serif';
        this.floatingTexts.forEach(t => {
            ctx.fillStyle = `rgba(255, 100, 100, ${t.alpha})`;
            ctx.strokeStyle = `rgba(0, 0, 0, ${t.alpha})`;
            ctx.strokeText(t.text, t.x, t.y);
            ctx.fillText(t.text, t.x, t.y);
        });

        // 예광탄 그리기
        this.tracers.forEach(t => {
            ctx.beginPath();
            ctx.moveTo(t.from.x, t.from.y);
            ctx.lineTo(t.to.x, t.to.y); 
            if (t.type === 'frontal') {
                ctx.strokeStyle = `rgba(255, 0, 0, ${t.alpha})`; // 정면전투: 빨간색
            } else { // 'flank'
                ctx.strokeStyle = `rgba(0, 150, 255, ${t.alpha})`; // 측면전투: 파란색
            }
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });

        // 중대(Company)보다 상위 부대일 경우, 하위 부대를 재귀적으로 그립니다.
        // 이렇게 하면 소대(Platoon)와 분대(Squad)는 화면에 그려지지 않습니다.
        if (this instanceof CommandUnit) {
            this.subUnits.forEach(subUnit => {
                if (!subUnit.isDestroyed) {
                    // 하위 부대와의 연결선을 그립니다.
                    ctx.beginPath();
                    ctx.moveTo(this.x, this.y);
                    ctx.lineTo(subUnit.x, subUnit.y);
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                    ctx.stroke();

                    subUnit.draw(ctx);
                } 
            });
        }
    }

    /**
     * 유닛의 고유 아이콘을 그립니다. (사각형, 팀 색상, 유닛 타입 심볼)
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} [opacity=0.7] 아이콘의 불투명도
     */
    drawOwnIcon(ctx, opacity = 0.7) {
        // 팀 색상에 따라 아이콘 배경을 그립니다.
        const color = this.team === 'blue' ? `rgba(100, 149, 237, ${opacity})` : `rgba(255, 99, 71, ${opacity})`; // CornflowerBlue / Tomato
        ctx.fillStyle = color;
        ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
        // 유닛 타입 아이콘을 그립니다.
        if (this.type && UNIT_TYPE_ICONS[this.type]) {
            ctx.font = `bold ${this.size * 1.5}px "Segoe UI Symbol"`; // 아이콘 폰트 지정
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle'; // 텍스트를 수직 중앙에 정렬
            ctx.fillText(UNIT_TYPE_ICONS[this.type], this.x, this.y);
        }

        ctx.lineWidth = this.isSelected ? 2 : 1;
        ctx.strokeStyle = this.isSelected ? 'white' : 'black';
        ctx.strokeRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
    }

    /**
     * 부대 규모(Echelon) 심볼을 그립니다. 하위 클래스에서 오버라이드됩니다.
     * @param {CanvasRenderingContext2D} ctx
     */
    drawEchelonSymbol(ctx) {
        // 각 클래스에서 개별적으로 구현됩니다.
    }
}

// To be used by unitEchelons.js
import { CommandUnit, Battalion, Company, Squad } from './unitEchelons.js';