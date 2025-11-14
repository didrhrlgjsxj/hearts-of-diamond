/**
 * 게임 내 모든 유닛의 생성, 상태 업데이트, 렌더링을 총괄하는 관리자 클래스입니다.
 */
class UnitManager {
    constructor() {
        this.topLevelUnits = []; // 최상위 부대들을 관리하는 배열
        this.selectedUnit = null;   // 현재 선택된 유닛
        this.broadcastedBattle = null; // 현재 중계 중인 전투

        // 부대 고유 번호 생성을 위한 카운터
        this.unitCounters = {
            'Division': 1,
            'Brigade': 1,
            'Regiment': 1,
            'Battalion': 1,
            'Company': 1,
        };
    }

    /**
     * 템플릿을 기반으로 유닛을 생성하고 게임 월드에 추가합니다.
     * @param {string} templateKey - 생성할 유닛의 템플릿 키
     * @param {number} x - 생성 위치 x 좌표
     * @param {number} y - 생성 위치 y 좌표
     * @param {string} team - 유닛의 팀 ('blue' or 'red')
     */
    spawnUnit(templateKey, x, y, team) {
        if (templateKey) {
            // buildUnitFromTemplate 함수가 this.unitCounters를 참조하도록 this를 전달합니다.
            const newUnit = buildUnitFromTemplate(templateKey, x, y, team, this);
            if (newUnit) {
                this.topLevelUnits.push(newUnit);
            }
        }
    }

    /**
     * 특정 월드 좌표에 있는 유닛을 찾아 선택합니다.
     * @param {number} worldX 
     * @param {number} worldY 
     * @returns {Unit | null} 새로 선택된 유닛
     */
    selectUnitAt(worldX, worldY) {
        let clickedUnit = null;
        // 최상위 부대부터 순회하며 클릭된 유닛을 찾음
        for (let i = this.topLevelUnits.length - 1; i >= 0; i--) {
            const unit = this.topLevelUnits[i];
            clickedUnit = unit.getUnitAt(worldX, worldY);
            if (clickedUnit) break;
        }

        // 이전에 선택된 유닛의 선택 상태를 해제
        if (this.selectedUnit) {
            this.selectedUnit.setSelected(false);
        }

        // 새로 클릭된 유닛을 선택 상태로 만듦
        this.selectedUnit = clickedUnit;
        if (this.selectedUnit) {
            this.selectedUnit.setSelected(true);
        }

        return this.selectedUnit;
    }

    /**
     * 선택된 유닛에게 이동 또는 후퇴 명령을 내립니다.
     * @param {number} worldX 
     * @param {number} worldY 
     * @param {boolean} isShiftKey - Shift 키가 눌렸는지 여부 (후퇴 명령)
     */
    orderSelectedUnitTo(worldX, worldY, isShiftKey) {
        if (this.selectedUnit) {
            if (isShiftKey) {
                this.selectedUnit.retreatTo(worldX, worldY);
            } else {
                this.selectedUnit.moveTo(worldX, worldY, this.topLevelUnits);
            }
        }
    }

    /**
     * 모든 유닛의 로직을 업데이트합니다.
     * @param {number} scaledDeltaTime 
     */
    update(scaledDeltaTime) {
        this.broadcastedBattle = null; // 매 프레임 중계 전투 초기화
        
        // unitLogic.js의 updateUnits 함수를 호출합니다.
        // updateUnits는 이제 이 클래스의 인스턴스를 받아 내부 상태를 직접 변경합니다.
        updateUnits(this, scaledDeltaTime);

        // 파괴된 유닛을 제거합니다.
        this.cleanupDestroyedUnits();
    }

    /**
     * 모든 유닛을 캔버스에 그립니다.
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        for (const unit of this.topLevelUnits) {
            unit.draw(ctx);
        }
    }

    /**
     * 파괴된 최상위 유닛을 게임 월드에서 제거합니다.
     */
    cleanupDestroyedUnits() {
        // isDestroyed 플래그가 true인 최상위 유닛을 필터링하여 제거합니다.
        this.topLevelUnits = this.topLevelUnits.filter(unit => {
            if (unit.isDestroyed) {
                // 파괴된 유닛이 현재 선택된 유닛이라면, 선택을 해제합니다.
                if (this.selectedUnit === unit) {
                    this.selectedUnit = null;
                }
                return false; // 배열에서 제거
            }
            return true; // 배열에 유지
        });

        // 선택된 유닛이 (하위 유닛으로서) 파괴되었을 경우를 대비한 추가 확인
        if (this.selectedUnit && this.selectedUnit.isDestroyed) {
            this.selectedUnit = null;
        }
    }
}


/**
 * 게임 내 모든 유닛의 상태 업데이트(이동, 전투, 조직력 등)를 담당합니다. (대대 중심 로직)
 * @param {UnitManager} unitManager - 유닛 관리자 인스턴스
 * @param {number} scaledDeltaTime - 게임 속도가 적용된 프레임 간 시간 간격 (초)
 */
function updateUnits(unitManager, scaledDeltaTime) {
    const topLevelUnits = unitManager.topLevelUnits;

    // --- 1. 상태 초기화 및 모든 전투 부대 목록 생성 ---
    const allBattalions = [];
    topLevelUnits.forEach(unit => {
        unit.isInCombat = false;
        unit.isEnemyDetected = false; // 적 발견 상태도 매 프레임 초기화
        unit.tracers = []; // 예광탄 효과 초기화
        unit.updateVisuals(scaledDeltaTime); // 데미지 텍스트 등 시각 효과 업데이트

        const battalions = unit.getAllBattalions();
        battalions.forEach(b => {
            if (b.isDestroyed) return;
            b.isBeingTargeted = false;
            b.battalionTarget = null; // 매 턴 목표 초기화
            b.getAllCompanies().forEach(c => {
                c.isBeingTargeted = false;
                c.companyTarget = null; // 중대 목표도 초기화
            });
            allBattalions.push(b);
        })
    });

    // --- 2. 대대 단위 목표 탐색 ---
    for (const myBattalion of allBattalions) {
        let closestEnemyBattalion = null;
        let minDistance = myBattalion.engagementRange;

        for (const enemyBattalion of allBattalions) {
            // 외교 관계를 확인하여 적인지 판단합니다.
            if (!myBattalion.nation.isEnemyWith(enemyBattalion.nation.id)) continue;
            const distance = Math.hypot(myBattalion.x - enemyBattalion.x, myBattalion.y - enemyBattalion.y);
            if (distance < minDistance) {
                minDistance = distance;
                closestEnemyBattalion = enemyBattalion;
            }
        }
        myBattalion.battalionTarget = closestEnemyBattalion;

        // 3. 중대 단위 목표 할당
        if (myBattalion.battalionTarget) {
            // 전투 가능한 아군 중대만 필터링합니다. (파괴, 후퇴, 재정비 중인 중대 제외)
            const myCombatReadyCompanies = myBattalion.getAllCompanies().filter(c => !c.isDestroyed && !c.isRetreating && !c.isRefitting);
            const enemyCompanies = myBattalion.battalionTarget.getAllCompanies().filter(c => !c.isDestroyed);

            if (myCombatReadyCompanies.length === 0 || enemyCompanies.length === 0) continue;

            // 각 중대에 공격할 적 중대를 할당합니다. (1대1 매칭)
            // 이제 재정비 중인 중대는 companyTarget을 할당받지 않습니다.
            myCombatReadyCompanies.forEach((myCompany, index) => {
                // 적 중대가 더 적을 경우, 마지막 적 중대를 여러 아군 중대가 공격합니다.
                const targetIndex = Math.min(index, enemyCompanies.length - 1);
                myCompany.companyTarget = enemyCompanies[targetIndex];
            });
        }
    }

    // --- 4. 공격 및 피해 계산 ---
    const engagedBattalions = new Set(); // 이번 턴에 공격을 수행한 대대를 기록

    for (const myBattalion of allBattalions) {
        const enemyBattalion = myBattalion.battalionTarget;
        if (!enemyBattalion) {
            myBattalion.isInCombat = false;
            continue;
        }

        // 대대 및 그 상위 부대를 전투 상태로 설정합니다.
        myBattalion.getTopLevelParent().isInCombat = true;
        myBattalion.isInCombat = true;
        enemyBattalion.getTopLevelParent().isInCombat = true;
        enemyBattalion.isInCombat = true;

        // 휘하 중대들도 전투 상태로 설정
        // 단, 재정비(isRefitting) 중인 중대는 전투 상태에서 제외합니다.
        myBattalion.getAllCompanies().forEach(c => {
            // 재정비 중이 아니며, 후퇴 중도 아닌 중대만 전투 상태로 설정합니다.
            // 이렇게 하면 재정비 중인 중대가 노란색으로 깜빡이는 문제를 해결합니다.
            if (!c.isRefitting && !c.isRetreating) c.isInCombat = true;
        });
        // 적 부대도 재정비/후퇴 중이 아닌 중대만 전투 상태로 설정합니다.
        enemyBattalion.getAllCompanies().forEach(c => {
            if (!c.isRefitting && !c.isRetreating) c.isInCombat = true;
        });


        // 적 대대가 공격받고 있음을 표시
        enemyBattalion.isBeingTargeted = true; // UI 표시용
        // 적 중대들이 공격받고 있음을 표시
        enemyBattalion.getAllCompanies().forEach(c => c.isBeingTargeted = true);

        // --- 대대 단위 로직 (전술 변경, 공격 턴) ---
        // 한 프레임에 대대별로 한 번만 실행되도록 합니다.
        if (!engagedBattalions.has(myBattalion)) {
            // 전술 변경 로직 (3초마다)
            myBattalion.tacticChangeProgress += scaledDeltaTime;
            if (myBattalion.tacticChangeProgress >= myBattalion.tacticChangeCooldown) {
                myBattalion.tacticChangeProgress = 0;
                const tacticKeys = Object.keys(TACTICS);
                const randomTacticKey = tacticKeys[Math.floor(Math.random() * tacticKeys.length)];
                myBattalion.tactic = TACTICS[randomTacticKey];
            }
            // 전투 시작 시 첫 전술을 즉시 선택
            if (!myBattalion.tactic) {
                const tacticKeys = Object.keys(TACTICS);
                const randomTacticKey = tacticKeys[Math.floor(Math.random() * tacticKeys.length)];
                myBattalion.tactic = TACTICS[randomTacticKey];
            }

            // 공격 턴 계산
            myBattalion.attackProgress += scaledDeltaTime;
            if (myBattalion.attackProgress >= myBattalion.attackCooldown) {
                myBattalion.attackProgress = 0; // 턴 초기화

                // 이 대대에 속한 모든 중대가 각자의 목표를 공격합니다. (본부 중대 제외)
                const combatCompanies = myBattalion.getAllCompanies().filter(comp => 
                    comp !== myBattalion.hqCompany && !comp.isDestroyed && !comp.isRetreating && !comp.isRefitting
                );
                combatCompanies.forEach(c => {
                    // isDestroyed는 위에서 필터링 했으므로 목표 유무만 확인
                    if (!c.companyTarget) return;

                    const target = c.companyTarget;
                    const distToTarget = Math.hypot(c.x - target.x, c.y - target.y);

                    // 1. 전투 효율성 계산 (거리에 따라 0~1)
                    // 최적 거리에서 100%, 최적 거리의 2배 또는 0 거리에서 0%가 됩니다.
                    const range = UNIT_TYPE_EFFECTIVENESS_RANGE[c.type] || { optimal: 100 };
                    const optimalDistance = range.optimal;
                    const distanceDifference = Math.abs(distToTarget - optimalDistance);
                    c.combatEffectiveness = Math.max(0, 1 - (distanceDifference / optimalDistance));

                    // 2. 유효 공격력 계산 (방어자의 기갑화율에 따라 대인/대물 공격력 조합)
                    const defenderHardness = target.hardness;
                    const companyBaseAttack = c.softAttack * (1 - defenderHardness) + c.hardAttack * defenderHardness;
                    const effectiveAttack = companyBaseAttack * c.combatEffectiveness;

                    // 3. 대대의 현재 전술에 따른 공격력 보너스/페널티 적용
                    const tacticAttackModifier = myBattalion.tactic ? myBattalion.tactic.attackModifier : 1.0;
                    const finalAttack = effectiveAttack * tacticAttackModifier;

                    // 4. 최종 공격력 계산 (관통 및 방어력에 의한 피해 '경감' 적용)
                    // 4-1. 대물 공격력 vs 단위 방어력: 대물 공격이 얼마나 효과적으로 피해를 주는지 계산합니다.
                    // 대물 공격력이 단위 방어력보다 낮을 경우, 비율에 따라 대물 피해량이 감소합니다.
                    const hardAttackPenetrationRatio = target.unitDefense > 0 ? Math.min(1, c.hardAttack / target.unitDefense) : 1;
                    
                    // 4-2. 관통 결과를 적용한 유효 공격력 재계산
                    const softPart = c.softAttack * (1 - defenderHardness);
                    const hardPart = c.hardAttack * defenderHardness * hardAttackPenetrationRatio;
                    const attackAfterArmor = (softPart + hardPart) * c.combatEffectiveness * tacticAttackModifier;

                    // 4-3. 화력과 조직 방어력 비교를 통한 '공격 효율성' 계산
                    // 화력이 조직 방어력보다 낮으면, 그 비율만큼 최종 피해량이 감소합니다.
                    // 이는 공격이 얼마나 효과적으로 적의 방어망을 뚫는지를 나타냅니다.
                    const attackEffectiveness = target.organizationDefense > 0 
                        ? Math.min(1, c.firepower / target.organizationDefense) 
                        : 1;

                    const totalAttackPower = attackAfterArmor * attackEffectiveness;

                    // 5. 계산된 피해를 적 '중대'에 직접 적용합니다.
                    // 단위 방어력에 의한 최종 피해 감소는 takeDamage 내부에서 처리됩니다.
                    target.takeDamage(totalAttackPower, { x: c.x, y: c.y });
                });
            }
            engagedBattalions.add(myBattalion);
        }

        // --- 시각 효과 (매 프레임) ---
        const myBattalionTopLevel = myBattalion.getTopLevelParent();
        
        // 중대 간의 얇은 예광탄 (연출)
        myBattalion.getAllCompanies().forEach(c => {
            if (c.companyTarget && c.combatEffectiveness > 0.1) {
                myBattalionTopLevel.tracers.push({ from: c, to: c.companyTarget, life: 0.3, type: 'company' });
            }
        });

        // 대대 간의 굵은 전투선
        const isFrontal = enemyBattalion.battalionTarget === myBattalion;
        myBattalionTopLevel.tracers.push({
            from: myBattalion,
            to: enemyBattalion,
            life: 0.5,
            type: isFrontal ? 'frontal' : 'flank'
        });

        // 첫 번째 정면 전투를 중계 대상으로 설정
        if (isFrontal && !unitManager.broadcastedBattle) {
            unitManager.broadcastedBattle = { unitA: myBattalion, unitB: enemyBattalion };
        }

        // 전투 중 방향 전환
        if (!myBattalion.playerDestination) {
            myBattalion.direction = Math.atan2(enemyBattalion.y - myBattalion.y, enemyBattalion.x - myBattalion.x);
        }
    }

    // 전투가 끝난 부대의 상태를 초기화합니다.
    allBattalions.forEach(battalion => { // 이제 allBattalions는 이미 Set과 유사하게 고유한 대대 목록입니다.
        // 대대가 이번 턴에 공격할 목표가 없었다면, 전투가 끝난 것으로 간주합니다.
        if (!battalion.battalionTarget) {
            // 대대의 전투 상태를 해제합니다.
            battalion.isInCombat = false;
            battalion.tactic = null;
            battalion.tacticChangeProgress = 0;
            battalion.attackProgress = 0;

            // 휘하의 모든 중대들의 전투 상태도 함께 해제합니다.
            // 이것이 누락되어 중대들이 계속 전투 상태에 머무는 문제가 있었습니다.
            battalion.getAllCompanies().forEach(c => {
                c.isInCombat = false;
            });
        }
    });

    // --- 5. 조직력 회복 및 최종 업데이트 ---
    for (const unit of topLevelUnits) {
        // --- 조직력 회복 로직 ---
        // 모든 중대의 조직력을 회복시킵니다.
        const allCompanies = unit.getAllCompanies();
        for (const company of allCompanies) { // `_organization`에 직접 접근하는 것은 클래스 설계상 좋지 않지만, 현재 구조를 유지하며 수정합니다.
            if (company.organization < company.maxOrganization && !company.isDestroyed) {
                // 전투 중이 아니고, 공격받고 있지도 않을 때만 조직력이 회복됩니다.
                // 재정비 중인 부대는 대대가 공격받는 것과 무관하게, 자기 자신이 직접 공격받지 않으면 조직력을 회복해야 합니다.
                // 따라서 isBeingTargeted는 중대 자신이 공격받을 때만 true가 되어야 합니다. (현재 로직은 대대 단위로 설정됨)
                let recoveryRate = 0;
                // 재정비 중인 중대는 isInCombat이 항상 false이므로, isBeingTargeted만 확인하면 됩니다.
                if (!company.isInCombat && !company.isBeingTargeted) { // isBeingTargeted는 이제 중대 단위로 관리되어야 정확합니다.
                    recoveryRate = company.organizationRecoveryRate;
                }

                company._organization = Math.min(company.maxOrganization, company._organization + recoveryRate * scaledDeltaTime);
            }
        }
    }

    // --- 중대 단위 isBeingTargeted 플래그 설정 ---
    // 모든 공격이 끝난 후, 어떤 중대가 실제로 공격받았는지(companyTarget으로 지정되었는지) 다시 확인합니다.
    allBattalions.forEach(battalion => {
        battalion.getAllCompanies().forEach(company => {
            // 다른 중대가 나를 companyTarget으로 삼고 있는지 확인합니다.
            const isTargeted = allBattalions.some(b => b.getAllCompanies().some(c => c.companyTarget === company));
            company.isBeingTargeted = isTargeted;
        });
    });
    // --- 이동 및 진형 업데이트 ---
    // 1단계: 모든 유닛의 이동을 먼저 처리합니다.
    topLevelUnits.forEach(unit => processUnitMovement(unit, scaledDeltaTime));
    // 2단계: 이동이 완료된 위치를 기준으로 모든 유닛의 진형을 업데이트합니다.
    topLevelUnits.forEach(unit => processFormationUpdate(unit));

    // --- 6. 파괴된 부대 정리 (가장 중요) ---
    // 파괴된 유닛을 정리하고, 상위 유닛의 파괴 여부를 결정합니다.
    processDestruction(topLevelUnits);
}

/**
 * 유닛과 그 하위 유닛들의 이동 로직(updateMovement)을 재귀적으로 처리합니다.
 * @param {Unit} unit 
 * @param {number} scaledDeltaTime 
 */
function processUnitMovement(unit, scaledDeltaTime) {
    if (unit.isDestroyed) return;
    unit.updateMovement(scaledDeltaTime);
    unit.subUnits.forEach(subUnit => processUnitMovement(subUnit, scaledDeltaTime));
}

/**
 * 유닛과 그 하위 유닛들의 진형 로직(updateCombatSubUnitPositions)을 재귀적으로 처리합니다.
 * @param {Unit} unit 
 */
function processFormationUpdate(unit) {
    if (unit.isDestroyed) return;
    if (unit instanceof SymbolUnit) {
        unit.updateCombatSubUnitPositions();
    }
    unit.subUnits.forEach(subUnit => processFormationUpdate(subUnit)); // 파괴된 하위 유닛은 내부적으로 무시됨
}

/**
 * 파괴된 유닛을 정리하고, 상위 유닛의 파괴 여부를 결정합니다.
 * @param {Unit[]} units - 처리할 유닛 목록 (주로 topLevelUnits)
 */
function processDestruction(units) {
    units.forEach(u => {
        // 1. 하위 유닛부터 재귀적으로 정리합니다.
        if (u.subUnits.length > 0) {
            processDestruction(u.subUnits);
            // 2. 파괴된 하위 유닛을 배열에서 제거합니다.
            u.subUnits = u.subUnits.filter(sub => !sub.isDestroyed);
        }

        // 3. 하위 유닛이 모두 사라진 상위 유닛(사단 등)을 파괴 처리합니다.
        // (대대는 내구력 기반으로 takeDamage에서 이미 파괴 처리됨)
        if (u instanceof SymbolUnit && u.subUnits.length === 0 && u.echelon !== 'BATTALION') {
            u.isDestroyed = true;
        }
    });
}