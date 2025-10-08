const UNIT_STRENGTHS = {
    SQUAD: 12,
    PLATOON: 12 * 3,       // 36
    COMPANY: 12 * 3 * 3,     // 108
    BATTALION: 12 * 3 * 3 * 3, // 324
    BRIGADE: 12 * 3 * 3 * 3 * 3, // 972
};

const UNIT_TYPES = {
    INFANTRY: '보병',
    RECON: '정찰',
    ARMOR: '기갑',
    ARTILLERY: '포병',
    ENGINEER: '공병',
};

// NATO APP-6A 표준을 단순화한 유닛 타입 아이콘
const UNIT_TYPE_ICONS = {
    [UNIT_TYPES.INFANTRY]: '✕', // 보병 (교차 소총)
    [UNIT_TYPES.RECON]: '◇',   // 정찰 (기병)
    [UNIT_TYPES.ARMOR]: '⬬',   // 기갑 (궤도)
    [UNIT_TYPES.ARTILLERY]: '●', // 포병 (포탄)
    [UNIT_TYPES.ENGINEER]: 'E',   // 공병
};

// 유닛 타입별 색상
const UNIT_TYPE_COLORS = {
    [UNIT_TYPES.INFANTRY]: 'rgba(100, 149, 237, 0.9)', // CornflowerBlue
    [UNIT_TYPES.RECON]: 'rgba(255, 255, 0, 0.9)',      // Yellow
    [UNIT_TYPES.ARMOR]: 'rgba(47, 79, 79, 0.9)',       // DarkSlateGray
    [UNIT_TYPES.ARTILLERY]: 'rgba(255, 69, 0, 0.9)',   // OrangeRed
    [UNIT_TYPES.ENGINEER]: 'rgba(139, 69, 19, 0.9)',   // SaddleBrown
};

// 유닛 타입별 기본 능력치 (분대 기준)
const UNIT_TYPE_STATS = {
    [UNIT_TYPES.INFANTRY]: { firepower: 1, softAttack: 2, hardAttack: 0.5, reconnaissance: 1, armor: 0, organizationBonus: 10 },
    [UNIT_TYPES.RECON]:    { firepower: 0.5, softAttack: 1, hardAttack: 0.5, reconnaissance: 15, armor: 0, organizationBonus: 2 },
    [UNIT_TYPES.ARMOR]:    { firepower: 4, softAttack: 5, hardAttack: 3, reconnaissance: 2, armor: 8, organizationBonus: 5 },
    [UNIT_TYPES.ARTILLERY]:{ firepower: 8, softAttack: 3, hardAttack: 4, reconnaissance: 1, armor: 1, organizationBonus: 1 },
    [UNIT_TYPES.ENGINEER]: { firepower: 1, softAttack: 1, hardAttack: 6, reconnaissance: 1, armor: 2, organizationBonus: 3 },
};


/**
 * 모든 군사 유닛의 기본이 되는 클래스입니다.
 * 이름, 위치, 하위 유닛 목록을 가집니다.
 */
class Unit {
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
        this.detectionRange = 100; // 인식 범위 (교전 범위보다 넓게 설정)
        this.isEnemyDetected = false; // 적 발견 상태 여부
        this.destination = null; // 이동 목표 지점 {x, y}
        this.moveSpeed = 30; // 초당 이동 속도
        this.floatingTexts = []; // 피해량 표시 텍스트 배열
        this.displayStrength = -1; // 화면에 표시되는 체력 (애니메이션용)
        this.combatSubUnits = []; // 실제 전투를 수행하는 가상 하위 부대
        this.formationRadius = 0; // 전투 부대 배치 반경
        this.tracers = []; // 예광탄 효과 배열
        this.maxOrganization = 100; // 최대 조직력
        this.organization = 100; // 현재 조직력
        this.organizationRecoveryRate = 5; // 초당 조직력 회복량

        // 신규 능력치
        this.firepower = 0;
        this.softAttack = 0;
        this.hardAttack = 0;
        this.reconnaissance = 0;
        this.armor = 0;
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
            return subUnitsStrength;
        }
        return Math.max(0, Math.floor(this._baseStrength * (1 + (1/6) * this.reinforcementLevel) - this.damageTaken));
    }

    // --- 능력치 Getter: 하위 유닛의 능력치를 재귀적으로 합산 ---
    get totalFirepower() {
        if (this.subUnits.length > 0) {
            return this.subUnits.reduce((total, unit) => total + unit.totalFirepower, 0);
        }
        return this.firepower;
    }
    get totalSoftAttack() {
        if (this.subUnits.length > 0) {
            return this.subUnits.reduce((total, unit) => total + unit.totalSoftAttack, 0);
        }
        return this.softAttack;
    }
    get totalHardAttack() {
        if (this.subUnits.length > 0) {
            return this.subUnits.reduce((total, unit) => total + unit.totalHardAttack, 0);
        }
        return this.hardAttack;
    }
    get totalReconnaissance() {
        if (this.subUnits.length > 0) {
            return this.subUnits.reduce((total, unit) => total + unit.totalReconnaissance, 0);
        }
        return this.reconnaissance;
    }
    get totalArmor() {
        // 장갑은 평균값으로 계산하는 것이 일반적입니다.
        if (this.subUnits.length > 0) {
            const combatUnits = this.getAllSquads().filter(s => s.currentStrength > 0);
            if (combatUnits.length === 0) return 0;
            const totalArmor = combatUnits.reduce((total, unit) => total + unit.armor, 0);
            return totalArmor / combatUnits.length;
        }
        return this.armor;
    }
    /**
     * 기본 편성 병력을 계산합니다. 하위 유닛이 있으면 그 유닛들의 기본 병력 총합을 반환합니다.
     */
    get baseStrength() {
        return this.subUnits.length > 0 ? this.subUnits.reduce((total, unit) => total + unit.baseStrength, 0) : this._baseStrength;
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
        this.updateCombatSubUnitPositions();
    }

    /**
     * 특정 위치에서 가장 가까운, 피해를 입을 분대를 찾습니다.
     * @param {number} fromX 공격이 시작된 X좌표
     * @param {number} fromY 공격이 시작된 Y좌표
     * @returns {Squad|null} 피해를 입을 분대
     */
    findSquadToTakeDamage(fromX, fromY) {
        let closestSquad = null;
        let minDistance = Infinity;

        for (const squad of this.combatSubUnits) {
            if (squad.currentStrength <= 0) continue; // 이미 파괴된 분대는 제외
            const distance = Math.hypot(squad.x - fromX, squad.y - fromY);
            if (distance < minDistance) {
                minDistance = distance;
                closestSquad = squad;
            }
        }
        return closestSquad;
    }

    /**
     * 가상 전투 부대들의 위치를 부모 유닛 주변에 원형으로 배치합니다.
     */
    updateCombatSubUnitPositions() {
        // 이제 분대들은 각자의 상위 부대(소대, 중대 등)에 상대적으로 위치하므로,
        // 최상위 부대가 직접 모든 분대의 위치를 재조정하지 않습니다.
        // 각 하위 부대의 updateMovement가 연쇄적으로 호출되며 위치가 결정됩니다.
        // 하위 유닛들의 상대 위치를 업데이트합니다.
        this.subUnits.forEach((subUnit, i) => {
            const angle = (i / this.subUnits.length) * 2 * Math.PI;
            subUnit._x = this.formationRadius * Math.cos(angle);
            subUnit._y = this.formationRadius * Math.sin(angle);
        });
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
     * @param {number} amount 총 피해량
     * @param {{x: number, y: number}} fromCoords 공격자 위치
     * @param {number} orgDamage 조직력에 가해지는 기본 피해
     * @param {number} strDamage 병력에 가해지는 기본 피해
     */
    takeDamage(orgDamage, strDamage, fromCoords) {
        // 1. 조직력에 직접 피해를 적용합니다.
        const actualOrgDamage = Math.min(this.organization, orgDamage);
        this.organization -= actualOrgDamage;

        // 2. 병력 피해는 조직력 손실 정도에 따라 증폭됩니다.
        // 조직력이 낮을수록(비율이 0에 가까울수록) 병력 피해가 커집니다.
        const orgRatio = this.organization / this.maxOrganization;
        const bonusDamageMultiplier = Math.pow(1 - orgRatio, 2); // 조직력이 0이면 1, 100이면 0. 제곱하여 초반 피해를 줄이고 후반 피해를 늘립니다.
        
        // 조직력이 0이 되어 막지 못한 조직력 피해도 병력 피해에 추가됩니다.
        const orgSpilloverDamage = orgDamage - actualOrgDamage;
        const totalStrengthDamage = strDamage + orgSpilloverDamage + (strDamage * bonusDamageMultiplier);

        if (totalStrengthDamage > 0) {
            // 공격 위치에서 가장 가까운 분대를 찾아 피해를 입힙니다.
            const targetSquad = this.findSquadToTakeDamage(fromCoords.x, fromCoords.y);
            if (targetSquad) {
                targetSquad.damageTaken += totalStrengthDamage;
                // 상위 부대의 damageTaken은 currentStrength getter에서 재귀적으로 계산되므로 중복 누적하지 않습니다.

                // 피해량 텍스트를 해당 분대 위치에 생성합니다.
                this.floatingTexts.push({
                    text: `-${Math.floor(totalStrengthDamage)}`,
                    life: 1.5, // 1.5초 동안 표시
                    alpha: 1.0,
                    x: targetSquad.x,
                    y: targetSquad.y - targetSquad.size - 5,
                });
            }

            // 피해를 입은 분대의 병력이 0 이하가 되면, 부모의 하위 유닛 목록과 최상위 부대의 전투 부대 목록에서 모두 제거합니다.
            if (targetSquad && targetSquad.currentStrength <= 0) {
                const topLevelParent = this.getTopLevelParent();

                // 1. 직접적인 부모(소대)의 subUnits 목록에서 제거
                if (targetSquad.parent) {
                    targetSquad.parent.subUnits = targetSquad.parent.subUnits.filter(s => s !== targetSquad);
                }
                // 2. 최상위 부대의 combatSubUnits 목록에서도 제거
                topLevelParent.combatSubUnits = topLevelParent.combatSubUnits.filter(s => s !== targetSquad);
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
            } else {
                // 표시되는 체력이 실제 체력보다 낮을 경우 (예: 회복), 즉시 따라잡게 함
                this.displayStrength = this.currentStrength;
            }
        }
        const currentBaseStrength = this.baseStrength;
        const strengthRatio = currentBaseStrength > 0 ? this.displayStrength / currentBaseStrength : 0;
        
        // 2a. 기본 병력 바 (최대 100%까지, 주황색)
        const baseBarWidth = barWidth * Math.min(strengthRatio, 1);
        ctx.fillStyle = '#ff8c00'; // DarkOrange
        ctx.fillRect(barX, barY, baseBarWidth, barHeight);

        // 2b. 증강된 병력 바 (100% 초과분, 카키색)
        if (strengthRatio > 1) {
            const reinforcedBarWidth = barWidth * (strengthRatio - 1);
            ctx.fillStyle = '#f0e68c'; // Khaki
            ctx.fillRect(barX + baseBarWidth, barY, Math.min(reinforcedBarWidth, barWidth - baseBarWidth), barHeight);
        }

        // 2c. 피해 받은 부분 표시 (애니메이션용, 붉은색)
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

        // 4. 조직력 바 (초록색)
        const orgBarY = barY + barHeight + 2;
        ctx.fillStyle = '#555';
        ctx.fillRect(barX, orgBarY, barWidth, barHeight);
        const orgRatio = this.organization / this.maxOrganization;
        ctx.fillStyle = '#00ff00'; // Lime Green
        ctx.fillRect(barX, orgBarY, barWidth * orgRatio, barHeight);
        ctx.strokeRect(barX, orgBarY, barWidth, barHeight);

        // 소속된 분대들을 작은 사각형으로 항상 표시
        if (this.combatSubUnits.length > 0) {
            const squadBoxSize = 3;
            this.combatSubUnits.forEach(squad => {
                if (squad.currentStrength > 0) {
                    // 분대 타입에 따라 색상 변경
                    ctx.fillStyle = UNIT_TYPE_COLORS[squad.type] || 'grey';
                    ctx.fillRect(
                        squad.x - squadBoxSize / 2,
                        squad.y - squadBoxSize / 2,
                        squadBoxSize, squadBoxSize
                    );
                }
            });
        }
        // 전투 중일 때 아이콘을 깜빡이게 표시
        if (this.isInCombat) {
            // 1초에 두 번 깜빡이는 효과
            if (Math.floor(Date.now() / 500) % 2 === 0) {
                ctx.fillStyle = 'rgba(255, 255, 0, 0.5)'; // 노란색 하이라이트
                ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
            }
        }
        // 부대 종류별 심볼을 그립니다.

        // 적 발견 상태일 때 초록색으로 빛나게 표시 (테두리)
        if (this.isEnemyDetected) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 5, 0, Math.PI * 2); // 유닛 크기보다 약간 크게
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)'; // 초록색 테두리
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        this.drawEchelonSymbol(ctx);

        // 팀 색상에 따라 아이콘 배경을 칠합니다.
        ctx.fillStyle = this.team === 'blue' ? 'rgba(100, 149, 237, 0.7)' : 'rgba(255, 99, 71, 0.7)'; // CornflowerBlue / Tomato
        ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);

        // 유닛 타입 아이콘을 그립니다.
        if (this.type && UNIT_TYPE_ICONS[this.type]) {
            ctx.font = `bold ${this.size * 1.5}px "Segoe UI Symbol"`; // 아이콘 폰트 지정
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle'; // 텍스트를 수직 중앙에 정렬
            ctx.fillText(UNIT_TYPE_ICONS[this.type], this.x, this.y);
            // 다른 텍스트를 위해 textBaseline을 원래대로 되돌립니다.
            ctx.textBaseline = 'alphabetic';
        }

        // 각 유닛을 사각형으로 표현하고, 선택되었을 때 테두리 색을 변경합니다.
        ctx.strokeStyle = 'black';
        ctx.lineWidth = this.isSelected ? 2 : 1;
        ctx.strokeStyle = this.isSelected ? 'white' : 'black';
        ctx.strokeRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);

        // 선택된 유닛의 교전 범위를 표시합니다.
        if (this.isSelected) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.engagementRange, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'; // 반투명 노란색
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // 유닛 이름을 표시합니다.
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.font = '10px sans-serif';
        ctx.fillText(`${this.name} [${this.currentStrength}]`, this.x, this.y + 25);

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
            ctx.strokeStyle = `rgba(255, 255, 150, ${t.alpha})`; // 밝은 노란색
            ctx.lineWidth = 1.5;
            ctx.stroke();
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

/** 여단 (Brigade) */
class Brigade extends Unit {
    constructor(name, x, y, team) {
        super(name, x, y, 0, 10, team);
        this.formationRadius = 40;
        this.setupDefaultFormation();
        this.combatSubUnits = this.getAllSquads();
        this.updateCombatSubUnitPositions();

        // 여단 특성: 정찰 분대 1개 추가
        const allSquads = this.getAllSquads();
        if (allSquads.length > 0) {
            allSquads[0].setType(UNIT_TYPES.RECON);
        }
    }
    setupDefaultFormation() {
        for (let i = 0; i < 3; i++) {
            this.addUnit(new Battalion(`${this.name}-${i + 1}`, 0, 0, this.team));
        }
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
        this.formationRadius = 30;
        // 상위 부대에서 생성하므로, 여기서는 하위 부대를 직접 생성하지 않습니다.
        // 만약 대대가 최상위 유닛으로 생성될 경우를 대비해 setup을 호출할 수 있습니다.
        if (!this.parent) {
            this.setupDefaultFormation();
            this.combatSubUnits = this.getAllSquads();
            this.updateCombatSubUnitPositions();
        }
    }
    setupDefaultFormation() {
        for (let i = 0; i < 3; i++) {
            this.addUnit(new Company(`${this.name}-${i + 1}`, 0, 0, this.team));
        }
    }
    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('||', this.x, this.y - this.size - 2);
    }
}
/** 중대 (Company) */
class Company extends Unit {
    constructor(name, x, y, team) {
        super(name, x, y, 0, 7, team, UNIT_TYPES.INFANTRY);
        this.formationRadius = 20;
        if (!this.parent) {
            this.setupDefaultFormation();
            this.combatSubUnits = this.getAllSquads();
            this.updateCombatSubUnitPositions();
        }
    }
    setupDefaultFormation() {
        for (let i = 0; i < 3; i++) {
            this.addUnit(new Platoon(`${this.name}-${i + 1}`, 0, 0, this.team));
        }
    }
    drawEchelonSymbol(ctx) {
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('|', this.x, this.y - this.size - 2);
    }
}
/** 소대 (Platoon) */
class Platoon extends Unit {
    constructor(name, x, y, team) {
        super(name, x, y, 0, 6, team, UNIT_TYPES.INFANTRY);
        this.formationRadius = 10;
        if (!this.parent) {
            this.setupDefaultFormation();
            this.combatSubUnits = this.getAllSquads();
            this.updateCombatSubUnitPositions();
        }
    }
    setupDefaultFormation() {
        for (let i = 0; i < 3; i++) {
            this.addUnit(new Squad(`${this.name}-${i + 1}`, 0, 0, this.team));
        }
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
        this.maxOrganization = 100 + (stats.organizationBonus || 0);
        this.organization = this.maxOrganization;
    }

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