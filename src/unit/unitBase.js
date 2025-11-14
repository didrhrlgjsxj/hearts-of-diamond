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
        this.nation = null; // 유닛이 소속된 국가 (Nation 객체)
        this.size = size; // 유닛 아이콘의 크기 (반지름)
        this.team = team; // 유닛의 팀 ('blue' 또는 'red')
        this.reinforcementLevel = 0; // 증강 레벨
        this.isSelected = false; // 유닛 선택 여부
        this.damageTaken = 0; // 받은 피해량
        this.engagementRange = 200; // 교전 범위 (탐지 거리)
        this.isInCombat = false; // 전투 상태 여부
        this.isEnemyDetected = false; // 적 발견 상태 여부
        this._isDestroyed = false; // 유닛이 파괴되었는지 여부 (내부 플래그)
        this.destination = null; // 이동 목표 지점 {x, y}
        this.playerDestination = null; // 플레이어가 직접 지정한 최종 목표
        this.isRetreating = false; // 후퇴 중인지 여부
        this.isRefitting = false; // 재정비 중인지 여부
        this.isReserve = false; // 예비대 상태인지 여부
        this._direction = -Math.PI / 2; // 부대 진형의 현재 방향 (기본값: 위쪽)
        this._lastX = x; // 마지막 프레임의 X 위치 (방향 계산용)
        this._lastY = y; // 마지막 프레임의 Y 위치 (방향 계산용)
        this._moveSpeed = 6; // 모든 부대의 기본 이동 속도
        this.mobility = 0; // 기동력
        this.floatingTexts = []; // 피해량 표시 텍스트 배열
        this.displayStrength = -1; // 화면에 표시되는 체력 (애니메이션용)
        this.attackCooldown = 2.0; // 공격 주기 (초)
        this.attackProgress = 0;   // 현재 공격 진행도
        this.currentTarget = null; // 현재 공격 대상
        this.battalionTarget = null; // 대대가 조준하는 적 대대
        this.isBeingTargeted = false; // 다른 유닛에게 공격받고 있는지 여부
        this.combatSubUnits = []; // 실제 전투를 수행하는 가상 하위 부대
        this.formationRadius = 0; // 전투 부대 배치 반경
        this.tactic = null; // 현재 전투 전술
        this.tacticChangeCooldown = 3.0; // 전술 변경 주기 (초)
        this.tacticChangeProgress = 0;   // 현재 전술 변경 진행도
        this.organizationRecoveryRate = 5; // 초당 조직력 회복량 (비전투)
        this.organizationRecoveryRateInCombat = 0; // 초당 조직력 회복량 (전투 중)
        this.minOrgDamageAbsorption = 0.1; // 조직력 0%일 때의 최소 피해 흡수율
        this.maxOrgDamageAbsorption = 0.9; // 조직력 100%일 때의 최대 피해 흡수율
        this.squadsData = []; // 중대에서 사용할 분대 데이터 배열 (생성자 순서 문제 해결)

        // 신규 능력치
        this.firepower = 0;
        this.softAttack = 0;
        this.hardAttack = 0;
        this.reconnaissance = 0;
        this.organizationDefense = 0; // 부대의 유기적 방어력
        this.unitDefense = 0;         // 개별 단위의 방어력
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

    get direction() {
        return this._direction;
    }

    set direction(value) {
        this._direction = value;
    }

    /**
     * 부대의 최종 이동 속도를 계산합니다.
     */
    get moveSpeed() {
        // 중대는 휘하 분대 중 가장 낮은 기동력을 기반으로 속도를 계산합니다.
        if (this instanceof Company) {
            const squads = this.getAllSquads();
            if (squads.length === 0) {
                return this._moveSpeed;
            }
            const minMobility = Math.min(...squads.map(s => s.mobility));
            return this._moveSpeed + (minMobility / 5);
        }

        // 대대 이상의 지휘 부대는 휘하 부대 중 가장 느린 부대의 속도를 따릅니다.
        if (this instanceof SymbolUnit && this.subUnits.length > 0) {
            const slowestSubUnitSpeed = Math.min(...this.subUnits.map(u => u.moveSpeed));
            return slowestSubUnitSpeed;
        }

        // 분대 또는 하위 유닛이 없는 경우 기본 속도를 반환합니다.
        return this._moveSpeed;
    }

    set moveSpeed(value) {
        this._moveSpeed = value;
    }

    /**
     * 현재 병력을 계산합니다.
     * 하위 유닛이 있으면 그 유닛들의 병력 총합을, 없으면 자신의 기본 병력을 기준으로 계산합니다.
     */
    get currentStrength() {
        // SymbolUnit(사단, 대대 등)의 현재 내구력을 계산합니다.
        if (this instanceof SymbolUnit) {
            // 대대(Battalion)는 자신에게 누적된 피해(damageTaken)를 기반으로 계산합니다.
            if (this.echelon === 'BATTALION') {
                return Math.max(0, this.baseStrength - this.damageTaken);
            }
            // 사단, 여단 등 최상급 부대는 휘하 대대들의 현재 내구력(currentStrength)을 모두 합산합니다.
            // 이렇게 해야 대대가 입은 피해가 상위 부대 UI에 정확히 반영됩니다.
            const battalions = this.getAllBattalions();
            return battalions.reduce((sum, battalion) => sum + battalion.currentStrength, 0);
        }

        if (this.isDestroyed) return 0;
        return Math.max(0, this.damageTaken > 0 ? this._baseStrength - this.damageTaken : this._baseStrength);
    }

    /**
     * 유닛의 파괴 상태를 설정합니다.
     * SymbolUnit의 경우, 자신이 파괴될 때 모든 하위 유닛도 함께 파괴시킵니다.
     */
    set isDestroyed(value) {
        if (this._isDestroyed === value) return; // 이미 같은 상태이면 변경하지 않음
        this._isDestroyed = value;
        if (value && this instanceof SymbolUnit) {
            // 자신이 파괴될 때 하위 유닛들도 연쇄적으로 파괴시킵니다.
            this.subUnits.forEach(sub => sub.isDestroyed = true);
        }
    }
    get isDestroyed() {
        return this._isDestroyed;
    }

    /**
     * 기본 편성 병력을 반환합니다.
     */
    get baseStrength() {
        // SymbolUnit(사단, 대대 등)의 최대 내구력을 계산합니다.
        if (this instanceof SymbolUnit) {
            // 대대(Battalion)는 휘하 중대들의 기본 내구력을 합산합니다.
            if (this.echelon === 'BATTALION') {
                return this.subUnits.reduce((sum, unit) => sum + unit.baseStrength, 0);
            }
            // 사단, 여단 등 최상급 부대는 휘하 대대들의 최대 내구력(baseStrength)을 모두 합산합니다.
            const battalions = this.getAllBattalions();
            return battalions.reduce((sum, battalion) => sum + battalion.baseStrength, 0);
        }
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
     * 모든 하위 분대(Squad)를 기반으로 이 유닛의 모든 전투 능력치를 계산하고 업데이트합니다.
     * 이 메서드는 편제가 변경될 때마다 호출되어야 합니다.
     */
    calculateStats(squadsToCalculate) {
        // 1. 자신의 하위 유닛에 속한 모든 분대를 가져옵니다.
        let allSquads = this.getAllSquads();

        // 2. 본부 중대(hqCompany)가 있다면, 본부 중대의 분대들도 능력치 계산에 포함합니다.
        // 본부 중대는 실제 전투 유닛이 아니므로, 능력치 계산에만 반영됩니다.
        if (this.hqCompany) {
            allSquads = allSquads.concat(this.hqCompany.getAllSquads());
        }

        // UNIT_STAT_AGGREGATORS에 정의된 각 계산 함수를 실행하여 능력치를 할당합니다.
        this.firepower = UNIT_STAT_AGGREGATORS.firepower(allSquads);
        this.softAttack = UNIT_STAT_AGGREGATORS.softAttack(allSquads);
        this.hardAttack = UNIT_STAT_AGGREGATORS.hardAttack(allSquads);
        this.reconnaissance = UNIT_STAT_AGGREGATORS.reconnaissance(allSquads);
        this.organizationDefense = UNIT_STAT_AGGREGATORS.organizationDefense(allSquads, this.maxOrganization);
        this.unitDefense = UNIT_STAT_AGGREGATORS.unitDefense(allSquads);
        this.armor = UNIT_STAT_AGGREGATORS.armor(allSquads);
        this._baseStrength = UNIT_STAT_AGGREGATORS.baseStrength(allSquads);
    }

    /**
     * 부대 편제가 완료된 후, 최대 조직력에 맞춰 현재 조직력을 초기화합니다.
     * 이 메서드는 재귀적으로 모든 하위 유닛에 대해 호출됩니다.
     */
    initializeOrganization() {
        this.organization = this.maxOrganization;
        this.subUnits.forEach(subUnit => subUnit.initializeOrganization());
    }

    get maxOrganization() {
        // SymbolUnit은 휘하 모든 부대의 최대 조직력을 합산합니다.
        if (this instanceof SymbolUnit) {
            return this.subUnits.reduce((sum, unit) => sum + unit.maxOrganization, 0);
        }
        return 100 + this.getAllSquads().reduce((total, squad) => total + squad.organizationBonus, 0);
    }

    set organization(value) {
        if (!(this instanceof SymbolUnit)) {
            this._organization = value;
        }
    }
    get organization() {
        if (this instanceof SymbolUnit) {
            return this.subUnits.reduce((sum, unit) => sum + unit.organization, 0);
        }
        return this._organization;
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
        // 중대는 더 이상 하위 유닛을 갖지 않고, 분대 데이터를 직접 가집니다.
        if (this instanceof Company) {
            return this.squadsData;
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
        // Battalion 클래스이거나, echelon이 'BATTALION'인 SymbolUnit을 대대로 인식합니다.
        if (this instanceof Battalion || (this instanceof SymbolUnit && this.echelon === 'BATTALION')) {
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
        // 재정비 중인 유닛은 플레이어 이동 명령을 무시합니다.
        if (this.isRefitting) {
            console.log(`${this.name}은(는) 재정비 중이라 이동할 수 없습니다.`);
            return;
        }
        // 플레이어의 직접 이동 명령은 playerDestination에 저장합니다.
        this.playerDestination = { x, y };
        this.isRetreating = false; // 일반 이동 시 후퇴 상태 해제

        // destination은 현재 프레임의 최종 목표이므로, 여기서는 설정하지 않습니다.
        // updateMovement에서 우선순위에 따라 결정됩니다.
    }

    /**
     * 유닛의 이동을 처리합니다.
     * @param {number} deltaTime 프레임 간 시간 간격 (초)
     */
    updateMovement(deltaTime) {
        if (this.isDestroyed) return;

        // 재정비 상태 로직: 조직력이 90% 이상 회복되면 재정비 상태를 해제합니다.
        if (this.isRefitting && this.organization >= this.maxOrganization * 0.9) {
            this.isRefitting = false;
            // 재정비가 끝나면, 대대를 따라다니던 목표를 초기화하여
            // 다음 턴에 진형 위치로 복귀하도록 합니다.
            this.destination = null;
            console.log(`${this.name} 재정비 완료, 전투 복귀 가능.`);
        }

        // 1. 가능한 모든 이동 목표를 평가하고 가장 우선순위가 높은 목표를 선택합니다.
        const movementGoals = this.evaluateMovementGoals();
        const finalGoal = movementGoals.sort((a, b) => a.priority - b.priority)[0];

        // 2. 최종 목표가 없으면 이동을 중단합니다.
        if (!finalGoal) return;
        const finalDestination = finalGoal.destination;

        const dx = finalDestination.x - this.x;
        const dy = finalDestination.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 목표 지점까지의 거리가 1픽셀 이상일 때만 이동 방향을 업데이트합니다.
        if (distance > 1) this._direction = Math.atan2(dy, dx);

        // 현재 이동 속도를 결정합니다. 전투 중일 경우 10% 페널티를 적용합니다.
        let currentMoveSpeed = this.moveSpeed;
        if (this.isInCombat) {
            currentMoveSpeed *= 0.9; // 10% 속도 감소
        }

        const moveDistance = currentMoveSpeed * deltaTime;

        if (distance < moveDistance) {
            // 목표에 도달함
            this.x = finalDestination.x;
            this.y = finalDestination.y;

            // 후퇴 목표에 도달하면, 재정비 상태로 전환합니다.
            if (this.isRetreating) {
                this.isRetreating = false;
                this.isRefitting = true;
            }

            // 플레이어 명령(최종 목표)에 도달했을 때만 상태를 초기화합니다.
            if (this.playerDestination && Math.hypot(this.x - this.playerDestination.x, this.y - this.playerDestination.y) < 1) {
                this.playerDestination = null;
                this.isRetreating = false;
                this.destination = null; // 상위 부대가 주는 기본 진형 위치도 초기화
            }

            // 플레이어의 직접 명령이 아닌, 진형 이동에 의해 목표에 도달한 경우,
            // 상위 부대의 방향으로 자신의 방향을 정렬합니다.
            if (!this.playerDestination && this.parent && this.parent instanceof SymbolUnit) {
                this.direction = this.parent.direction;
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
     * 현재 유닛의 상황에 맞는 모든 이동 목표를 생성하고 배열로 반환합니다.
     * @returns {{destination: {x: number, y: number}, priority: number}[]}
     */
    evaluateMovementGoals() {
        const goals = [];

        // 목표 0: 후퇴 (최우선)
        if (this.isRetreating && this.parent) {
            goals.push({ destination: { x: this.parent.x, y: this.parent.y }, priority: MOVEMENT_PRIORITIES.RETREAT });
            return goals; // 후퇴 시 다른 모든 목표를 무시합니다.
        }

        // 목표 0.5: 재정비 (후퇴 다음으로 높은 우선순위)
        if (this.isRefitting && this.parent) {
            const parentBattalion = this.parent;
            // 부모 대대에 속한 재정비 중인 중대 목록을 찾습니다.
            const refittingCompanies = parentBattalion.subUnits.filter(u => u.isRefitting && !u.isDestroyed);
            const myIndex = refittingCompanies.indexOf(this);

            // 대대 크기, 중대 크기를 고려하여 적절한 이격 거리를 계산합니다.
            const refitRadius = parentBattalion.size + this.size + 15; // 15는 추가 여유 공간
            // 재정비 중인 중대 수에 따라 원형으로 배치될 각도를 계산합니다.
            const angle = (myIndex / refittingCompanies.length) * 2 * Math.PI;

            const destX = parentBattalion.x + refitRadius * Math.cos(angle);
            const destY = parentBattalion.y + refitRadius * Math.sin(angle);

            goals.push({ destination: { x: destX, y: destY }, priority: MOVEMENT_PRIORITIES.REFIT });
            return goals; // 재정비 중에는 다른 모든 목표를 무시합니다.
        }

        // 목표 1: 플레이어의 직접 명령 (우선순위 1)
        if (this.playerDestination) {
            goals.push({ destination: this.playerDestination, priority: MOVEMENT_PRIORITIES.PLAYER_COMMAND });
        }

        // 목표 2: 기본 진형 위치 (우선순위 10)
        // destination은 상위 부대가 updateCombatSubUnitPositions를 통해 설정해주는 기본 위치입니다.
        if (this.destination) {
            goals.push({ destination: this.destination, priority: MOVEMENT_PRIORITIES.DEFAULT_FORMATION });
        }

        // --- 중대(Company) 또는 향후 추가될 대대급 자율 AI 로직 ---
        // 이 로직은 Unit을 상속받는 특정 클래스에만 적용될 수 있습니다.
        if (this instanceof Company && this.parent) { // isRefitting 체크는 위에서 처리했으므로 제거
            const parentUnit = this.parent;

            // 목표 3: 진형 이탈 시 복귀 (우선순위 4)
            const formationOffsetInfo = FORMATION_OFFSETS[this.role];
            if (formationOffsetInfo) {
                // 부모의 위치와 방향을 기준으로 내 역할의 '선(line)'을 계산합니다.
                const lineDistance = formationOffsetInfo.distance;
                const lineOriginX = parentUnit.x + lineDistance * Math.cos(parentUnit.direction);
                const lineOriginY = parentUnit.y + lineDistance * Math.sin(parentUnit.direction);
                const lineVectorX = -Math.sin(parentUnit.direction); // 선의 방향 벡터
                const lineVectorY = Math.cos(parentUnit.direction);

                // 내 위치에서 선까지의 최단거리 벡터 계산
                const vecToUnitX = this.x - lineOriginX;
                const vecToUnitY = this.y - lineOriginY;
                const dotProduct = vecToUnitX * lineVectorX + vecToUnitY * lineVectorY;
                const closestPointOnLineX = lineOriginX + dotProduct * lineVectorX;
                const closestPointOnLineY = lineOriginY + dotProduct * lineVectorY;
                
                const distanceFromLine = Math.hypot(this.x - closestPointOnLineX, this.y - closestPointOnLineY);

                // 선에서 너무 멀리 떨어졌다면, 선 위의 가장 가까운 점으로 복귀하는 목표를 추가합니다.
                if (distanceFromLine > MAX_FORMATION_DEVIATION) {
                    goals.push({
                        destination: { x: closestPointOnLineX, y: closestPointOnLineY },
                        priority: MOVEMENT_PRIORITIES.FORMATION_COHESION
                    });
                }
            }

            // 목표 4: 전투 효율성 극대화 (우선순위 7)
            if (parentUnit.isInCombat && this.companyTarget) {
                const enemyCompany = this.companyTarget;
                const rangeInfo = UNIT_TYPE_EFFECTIVENESS_RANGE[this.type] || { optimal: 100 };
                const optimalDistance = rangeInfo.optimal;

                const vecX = this.x - enemyCompany.x;
                const vecY = this.y - enemyCompany.y;
                const currentDist = Math.hypot(vecX, vecY);

                if (currentDist > 1) {
                    // 최적 거리를 유지하려는 위치를 목표로 설정합니다.
                    const idealX = enemyCompany.x + (vecX / currentDist) * optimalDistance;
                    const idealY = enemyCompany.y + (vecY / currentDist) * optimalDistance;
                    goals.push({
                        destination: { x: idealX, y: idealY },
                        priority: MOVEMENT_PRIORITIES.COMBAT_EFFECTIVENESS
                    });
                }
            }
        }

        return goals;
    }

    /**
     * 유닛이 후퇴를 시작하도록 합니다.
     */
    startRetreat() {
        if (this.isRetreating || this.isRefitting) return; // 이미 후퇴/재정비 중이면 무시

        console.log(`${this.name}의 조직력이 0이 되어 후퇴합니다!`);
        this.isRetreating = true;
        this.isRefitting = false;
        this.isInCombat = false;
        this.companyTarget = null;
        this.playerDestination = null; // 플레이어 명령 취소
        this.destination = null; // 진형 목표 취소
    }

    /**
     * 유닛이 특정 지점으로 후퇴하도록 명령합니다.
     * @param {number} x 후퇴할 x 좌표
     * @param {number} y 후퇴할 y 좌표
     */
    retreatTo(x, y) {
        this.isRetreating = true;
        this.playerDestination = { x, y };
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
     * 피해 흡수율을 계산합니다. 이 로직은 takeDamage에서만 사용됩니다.
     * @returns {number} 0과 1 사이의 피해 흡수율
     * @private
     */
    _calculateDamageAbsorptionRate() {
        // 중대는 상위 대대의 능력치를 기준으로 피해 흡수율을 계산합니다.
        const decisionMaker = (this instanceof Company && this.parent) ? this.parent : this;

        if (decisionMaker instanceof SymbolUnit) {
            // 1. 대대의 조직 방어력에 따른 기본 흡수율 (최대 70%)
            const absorptionFromDefense = (decisionMaker.organizationDefense / (decisionMaker.organizationDefense + 50)) * 0.7;

            // 2. 대대의 현재 조직력 비율에 따른 추가 흡수율 (최대 25%)
            const orgRatio = decisionMaker.maxOrganization > 0 ? decisionMaker.organization / decisionMaker.maxOrganization : 0;
            const absorptionFromOrgRatio = orgRatio * 0.25;

            // 3. 두 흡수율을 합산하되, 최대 95%를 넘지 않도록 제한합니다. 기본적으로 0.1의 흡수율을 가집니다.
            return Math.min(0.95, 0.1 + absorptionFromDefense + absorptionFromOrgRatio);
        } else {
            // 대대가 없는 경우(독립 중대 등 예외 상황)에는 기존 로직을 따릅니다.
            const absorptionFromDefense = (this.organizationDefense / (this.organizationDefense + 50)) * 0.75;
            const orgRatio = this.maxOrganization > 0 ? this.organization / this.maxOrganization : 0;
            const absorptionFromOrgRatio = orgRatio * 0.20;
            return Math.min(0.95, absorptionFromDefense + absorptionFromOrgRatio);
        }
    }

    /**
     * 피해를 받습니다.
     * @param {number} totalAttackPower 장갑으로 경감된 후의 총 공격력
     * @param {{x: number, y: number}} fromCoords 공격자 좌표
     */
    takeDamage(totalAttackPower, fromCoords) {
        // 1. 최종 공격력을 그대로 사용합니다.
        // 단위 방어력(unitDefense)에 의한 피해 감소는 unitLogic.js에서 대물 공격력과 계산하는 방식으로 변경되었습니다.
        const finalAttackPower = totalAttackPower;

        // 2. 피해 흡수율을 계산합니다.
        const damageAbsorptionRate = this._calculateDamageAbsorptionRate();

        // 3. 조직력 피해와 내구력 피해로 분배합니다.
        const orgDamage = finalAttackPower * damageAbsorptionRate;
        const strDamage = finalAttackPower * (1 - damageAbsorptionRate);
    
        // --- 요청사항 적용 ---
        // 이 유닛이 중대(Company)인 경우, 피해 적용 방식을 변경합니다.
        if (this instanceof Company) {
            // 1. 조직력 피해는 중대 자신에게 적용합니다.
            const tacticOrgModifier = this.parent?.tactic ? this.parent.tactic.orgDamageModifier : 1.0;
            const modifiedOrgDamage = orgDamage * tacticOrgModifier;
            this._organization = Math.max(0, this._organization - modifiedOrgDamage);

            // 조직력이 0이 되면 후퇴를 시작합니다.
            if (this._organization <= 0) {
                this.startRetreat();
            }

            // 2. 내구력 피해는 상위 대대(parent)에게 적용하고, 대대의 파괴 여부를 즉시 확인합니다.
            if (strDamage > 0 && this.parent) {
                this.parent.takeStrengthDamage(strDamage);

                // 내구력 피해량 텍스트는 대대 위치에 표시합니다.
                this.parent.floatingTexts.push({
                    text: `-${Math.floor(strDamage)}`,
                    life: 1.5,
                    alpha: 1.0,
                    x: this.parent.x,
                    y: this.parent.y - this.parent.size - 15,
                });
            }
            // 3. 중대는 스스로 파괴되지 않습니다.

        } else {
            // 중대가 아닌 다른 유닛(독립 대대 등)은 자신에게 모든 피해를 적용합니다.
            this._organization = Math.max(0, this._organization - orgDamage);
            this.takeStrengthDamage(strDamage);
        }
    }

    /**
     * 내구력(Strength) 피해만 입고, 파괴 여부를 확인합니다.
     * @param {number} strDamage - 입을 내구력 피해량
     */
    takeStrengthDamage(strDamage) {
        if (strDamage <= 0 || this.isDestroyed) return;

        this.damageTaken += strDamage;
        if (this.currentStrength <= 0) {
            this.isDestroyed = true; // isDestroyed setter가 연쇄 파괴를 처리합니다.
            this._organization = 0;
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

        // 모든 하위 유닛의 시각 효과도 재귀적으로 업데이트합니다.
        this.subUnits.forEach(subUnit => subUnit.updateVisuals(deltaTime));

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
        // 1. SymbolUnit의 경우, '부대 마크' 영역 클릭을 먼저 확인합니다.
        if (this instanceof SymbolUnit) {
            const markCenterX = this.x; // 부대 마크의 X 좌표
            const markCenterY = this.y; // 부대 마크의 Y 좌표 (오프셋 제거)
            const distanceToMark = Math.hypot(x - markCenterX, y - markCenterY);
            if (distanceToMark < this.size) {
                return this; // 부대 마크가 클릭되면 CommandUnit 자신을 반환
            }
        }

        // 2. 하위 유닛들을 확인합니다. (위에 그려진 유닛부터)
        for (let i = this.subUnits.length - 1; i >= 0; i--) {
            const found = this.subUnits[i].getUnitAt(x, y);
            if (found) return found;
        }

        // 3. 마지막으로 자기 자신의 아이콘을 확인합니다.
        const distance = Math.hypot(x - this.x, y - this.y);
        if (distance < this.size) return this;

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

        // '부대 마크' 그리기: SymbolUnit이고 하위 유닛이 있을 때만 실행됩니다.
        if (this instanceof SymbolUnit && this.subUnits.length > 0) {
            const visibleSubUnits = this.subUnits.filter(u => !u.isDestroyed);
            if (visibleSubUnits.length > 0) {
                // 1. '부대 마크'의 위치는 SymbolUnit의 실제 위치(this.x, this.y)입니다.
                const markCenterX = this.x;
                const markCenterY = this.y; // 오프셋 제거

                // 2. '부대 마크'에 표시할 총 능력치 계산 (모든 하위 부대의 합산)
                const totalCurrentStrength = this.currentStrength;
                const totalBaseStrength = this.baseStrength;
                const totalOrganization = this.organization;
                const totalMaxOrganization = this.maxOrganization;

                // 3. 능력치 바 그리기
                const barWidth = 40;
                const barHeight = 5;
                const barX = markCenterX - barWidth / 2;
                const barY = markCenterY - 25;

                // 내구력 바
                ctx.fillStyle = '#555';
                ctx.fillRect(barX, barY, barWidth, barHeight);
                const strengthRatio = totalBaseStrength > 0 ? totalCurrentStrength / totalBaseStrength : 0;
                ctx.fillStyle = '#ff8c00';
                ctx.fillRect(barX, barY, barWidth * strengthRatio, barHeight);
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.strokeRect(barX, barY, barWidth, barHeight);

                // 조직력 바
                const orgBarY = barY + barHeight + 2;
                ctx.fillStyle = '#555';
                ctx.fillRect(barX, orgBarY, barWidth, barHeight);
                const orgRatio = totalMaxOrganization > 0 ? totalOrganization / totalMaxOrganization : 0;
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(barX, orgBarY, barWidth * orgRatio, barHeight);
                ctx.strokeRect(barX, orgBarY, barWidth, barHeight);

                // 4. 반투명한 부대 아이콘 그리기
                const markOpacity = this.isSelected ? 0.5 : 0.2; // 더 투명하게 변경
                const color = this.team === 'blue' ? `rgba(100, 149, 237, ${markOpacity})` : `rgba(255, 99, 71, ${markOpacity})`;
                ctx.fillStyle = color;
                ctx.fillRect(markCenterX - this.size, markCenterY - this.size, this.size * 2, this.size * 2); // this.size 사용
                ctx.strokeStyle = 'black';
                ctx.strokeRect(markCenterX - this.size, markCenterY - this.size, this.size * 2, this.size * 2);

                // 부대 규모 기호(단대호)를 그립니다.
                this.drawEchelonSymbol(ctx);

            }
        }
        
        // 모든 개별 유닛(중대, 독립 대대 등)은 자신의 아이콘을 그립니다.
        // SymbolUnit 자체는 '부대 마크'로만 표현되므로 자신의 아이콘을 그리지 않습니다.
        if (!(this instanceof SymbolUnit)) {
            this.drawOwnIcon(ctx);
            this.drawStatBars(ctx); // 중대 개별 능력치 바 그리기
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

        // 부대 방향을 나타내는 선을 그립니다.
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.direction);
        ctx.beginPath();
        ctx.moveTo(0, 0); // 부대 중심에서
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

        // SymbolUnit 자체는 이름을 그리지 않고, 하위 부대들이 각자 이름을 그립니다.
        if (!(this instanceof SymbolUnit)) {
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.font = '11px sans-serif';
            ctx.fillText(`${this.name}`, this.x, this.y + 25);
        }

        // 피해량 텍스트 그리기
        ctx.font = 'bold 12px sans-serif';
        this.floatingTexts.forEach(t => {
            ctx.fillStyle = `rgba(255, 100, 100, ${t.alpha})`;
            ctx.strokeStyle = `rgba(0, 0, 0, ${t.alpha})`;
            ctx.strokeText(t.text, t.x, t.y);
            ctx.fillText(t.text, t.x, t.y);
        });

        // 예광탄 그리기부
        this.tracers.forEach(t => {
            ctx.save(); // 현재 캔버스 상태 저장
            ctx.beginPath();
            ctx.moveTo(t.from.x, t.from.y);
            ctx.lineTo(t.to.x, t.to.y);
            if (t.type === 'company') {
                ctx.strokeStyle = `rgba(255, 255, 150, ${t.alpha * 0.7})`; // 중대 교전: 밝은 노란색
                ctx.lineWidth = 1.0;
            } else if (t.type === 'frontal') {
                ctx.strokeStyle = `rgba(255, 0, 0, ${t.alpha * 0.5})`; // 정면전투: 반투명 빨간색
                ctx.lineWidth = 5; // 선 두께를 5로 늘림
            } else { // 'flank'
                ctx.strokeStyle = `rgba(0, 150, 255, ${t.alpha * 0.5})`; // 측면전투: 반투명 파란색
                ctx.lineWidth = 5; // 선 두께를 5로 늘림
            }
            ctx.lineCap = 'round'; // 선의 끝을 둥글게 처리
            ctx.stroke();
            ctx.restore(); // 저장했던 캔버스 상태 복원
        });

        // 중대(Company)보다 상위 부대일 경우, 하위 부대를 재귀적으로 그립니다.
        // 이렇게 하면 소대(Platoon)와 분대(Squad)는 화면에 그려지지 않습니다.
        if (this instanceof SymbolUnit) {
            this.subUnits.forEach(subUnit => {
                if (subUnit.isDestroyed) return;
                // 본부 위치에서 다른 하위 부대로 연결선을 그립니다.
                ctx.beginPath();
                ctx.moveTo(this.x, this.y); // 선의 시작점을 오프셋이 없는 SymbolUnit의 기준 위치(본부 중대 위치)로 변경
                ctx.lineTo(subUnit.x, subUnit.y);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.stroke();
                subUnit.draw(ctx);
            });
        }
    }

    /**
     * 유닛 아이콘 위에 내구력과 조직력 바를 그립니다.
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawStatBars(ctx) {
        // 중대는 내구력 바를 표시하지 않습니다.
        if (!(this instanceof Company)) {
            const barWidth = 30;
            const barHeight = 4;
            const barX = this.x - barWidth / 2;
            const strengthBarY = this.y - this.size - 15; // 아이콘 위로
            const orgBarY = strengthBarY + barHeight + 2;

            // 내구력 바
            ctx.fillStyle = '#555';
            ctx.fillRect(barX, strengthBarY, barWidth, barHeight);
            if (this.displayStrength === -1) {
                this.displayStrength = this.currentStrength;
            } else {
                const decreaseAmount = this.baseStrength * 0.5 * (ctx.canvas.deltaTime || 0.016);
                this.displayStrength = Math.max(this.currentStrength, this.displayStrength - decreaseAmount);
            }
            const strengthRatio = this.baseStrength > 0 ? this.displayStrength / this.baseStrength : 0;
            ctx.fillStyle = '#ff8c00'; // DarkOrange
            ctx.fillRect(barX, strengthBarY, barWidth * strengthRatio, barHeight);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, strengthBarY, barWidth, barHeight);

            // 조직력 바 (SymbolUnit 용)
            ctx.fillStyle = '#555';
            ctx.fillRect(barX, orgBarY, barWidth, barHeight);
            const orgRatio = this.maxOrganization > 0 ? this.organization / this.maxOrganization : 0;
            ctx.fillStyle = '#00ff00'; // Lime Green
            ctx.fillRect(barX, orgBarY, barWidth * orgRatio, barHeight);
            ctx.strokeRect(barX, orgBarY, barWidth, barHeight);
        } else {
            // 중대일 경우, 오른쪽에 세로 조직력 바를 그립니다.
            const barWidth = 4;
            const barHeight = 28; // 세로 막대의 총 높이
            const barX = this.x + this.size + 5;
            const barY = this.y - barHeight / 2;

            // 1. 배경 막대 그리기
            ctx.fillStyle = '#555';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // 2. 현재 조직력에 따라 채워진 막대 그리기 (아래에서 위로)
            const orgRatio = this.maxOrganization > 0 ? this._organization / this.maxOrganization : 0;
            const filledHeight = barHeight * orgRatio;
            ctx.fillStyle = '#00ff00'; // Lime Green
            ctx.fillRect(barX, barY + barHeight - filledHeight, barWidth, filledHeight);

            // 3. 테두리 그리기
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
    }

    /**
     * 유닛의 고유 아이콘을 그립니다. (사각형, 팀 색상, 유닛 타입 심볼)
     * @param {CanvasRenderingContext2D} ctx 
     * @param {number} [opacity=0.7] 아이콘의 불투명도
     */
    drawOwnIcon(ctx, opacity = 0.7) {
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

        // 아이콘 위에 부대 규모 심볼을 그립니다.
        this.drawEchelonSymbol(ctx);

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