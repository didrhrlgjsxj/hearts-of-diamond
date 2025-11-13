/**
 * 게임 내 모든 유닛의 상태 업데이트(이동, 전투, 조직력 등)를 담당합니다. (대대 중심 로직)
 * 전역 변수 broadcastedBattle을 설정할 수 있습니다.
 * @param {Unit[]} topLevelUnits - 게임 월드의 모든 최상위 유닛 목록
 * @param {number} scaledDeltaTime - 게임 속도가 적용된 프레임 간 시간 간격 (초)
 */
function updateUnits(topLevelUnits, scaledDeltaTime) {

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
            if (enemyBattalion.team === myBattalion.team) continue;
            const distance = Math.hypot(myBattalion.x - enemyBattalion.x, myBattalion.y - enemyBattalion.y);
            if (distance < minDistance) {
                minDistance = distance;
                closestEnemyBattalion = enemyBattalion;
            }
        }
        myBattalion.battalionTarget = closestEnemyBattalion;

        // 3. 중대 단위 목표 할당
        if (myBattalion.battalionTarget) {
            const myCompanies = myBattalion.getAllCompanies().filter(c => !c.isDestroyed);
            const enemyCompanies = myBattalion.battalionTarget.getAllCompanies().filter(c => !c.isDestroyed);

            if (myCompanies.length === 0 || enemyCompanies.length === 0) continue;

            // 각 중대에 공격할 적 중대를 할당합니다. (1대1 매칭)
            myCompanies.forEach((myCompany, index) => {
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
        myBattalion.getAllCompanies().forEach(c => c.isInCombat = true);
        enemyBattalion.getAllCompanies().forEach(c => c.isInCombat = true);

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
                const combatCompanies = myBattalion.getAllCompanies().filter(comp => comp !== myBattalion.hqCompany && !comp.isDestroyed);
                combatCompanies.forEach(c => {
                    if (c.isDestroyed || !c.companyTarget) return; // 파괴되었거나 목표가 없으면 공격 안함

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

                    // 4. 최종 공격력 계산 (방어력과 장갑에 의한 피해 '경감' 적용)
                    // 조직 방어력은 공격력의 일부를 비율(%)로 경감시킵니다.
                    // 방어력이 100이면 50% 경감, 200이면 66% 경감됩니다. (점감 효과)
                    const damageReductionFromDefense = target.organizationDefense / (target.organizationDefense + 100);
                    const attackAfterDefense = finalAttack * (1 - damageReductionFromDefense);
                    
                    // 장갑 관통 로직:
                    // 대물 공격력이 장갑보다 높으면 관통 성공, 관통 보너스 데미지를 추가합니다.
                    // 관통에 실패해도 대물 공격력의 10%는 최소 피해로 적용됩니다.
                    let penetrationBonus = 0;
                    if (c.hardAttack > target.armor) {
                        penetrationBonus = (c.hardAttack - target.armor) * 0.5; // 관통 성공 시 추가 피해
                    } else {
                        penetrationBonus = c.hardAttack * 0.1; // 관통 실패 시 최소 피해
                    }
                    const totalAttackPower = attackAfterDefense + penetrationBonus;
                    const firepowerDamage = c.firepower * 1.5; // 화력 피해는 중대 개별로

                    // 5. 계산된 피해를 적 '중대'에 직접 적용합니다.
                    target.takeDamage(totalAttackPower, firepowerDamage, { x: c.x, y: c.y });
                });
            }
            engagedBattalions.add(myBattalion);
        }

        // --- 시각 효과 (매 프레임) ---
        const myBattalionTopLevel = myBattalion.getTopLevelParent();
        
        // 중대 간의 얇은 예광탄 (쇼 연출)
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
        if (isFrontal && !broadcastedBattle) {
            broadcastedBattle = { unitA: myBattalion, unitB: enemyBattalion };
        }

        // 전투 중 방향 전환
        if (!myBattalion.playerDestination) {
            myBattalion.direction = Math.atan2(enemyBattalion.y - myBattalion.y, enemyBattalion.x - myBattalion.x);
        }
    }

    // 전투가 끝난 부대의 상태를 초기화합니다.
    allBattalions.forEach(battalion => { // 이제 allBattalions는 이미 Set과 유사하게 고유한 대대 목록입니다.
        // 휘하 중대 중 하나라도 전투 중이면 대대는 전투 중 상태를 유지
        const isAnyCompanyInCombat = battalion.getAllCompanies().some(c => c.isInCombat);
        if (!isAnyCompanyInCombat) {
            battalion.isInCombat = false;
            battalion.tactic = null;
            battalion.tacticChangeProgress = 0;
            battalion.attackProgress = 0;
        }
    });

    // --- 5. 조직력 회복 및 최종 업데이트 ---
    for (const unit of topLevelUnits) {
        // --- 조직력 회복 로직 ---
        // 모든 중대의 조직력을 회복시킵니다.
        for (const company of unit.getAllCompanies()) {
            if (company.organization < company.maxOrganization) {
                const recoveryRate = company.isInCombat ? company.organizationRecoveryRateInCombat : company.organizationRecoveryRate;
                company._organization = Math.min(company.maxOrganization, company._organization + recoveryRate * scaledDeltaTime);
            }
        }
    }

    // --- 이동 및 진형 업데이트 ---
    // 1단계: 모든 유닛의 이동을 먼저 처리합니다.
    topLevelUnits.forEach(unit => processUnitMovement(unit, scaledDeltaTime));
    // 2단계: 이동이 완료된 위치를 기준으로 모든 유닛의 진형을 업데이트합니다.
    topLevelUnits.forEach(unit => processFormationUpdate(unit));

    // --- 6. 파괴된 부대 정리 (가장 중요) ---
    // 이 로직을 updateUnits의 마지막에 두어, 한 프레임 내에서 연쇄적으로 파괴가 처리되도록 합니다.
    function cleanupRecursively(units) {
        units.forEach(u => {
            // 1. 가장 깊은 하위 유닛부터 재귀적으로 정리합니다.
            if (u.subUnits.length > 0) {
                cleanupRecursively(u.subUnits);
                // 재귀 호출 후, 파괴된 하위 유닛을 배열에서 제거합니다.
                u.subUnits = u.subUnits.filter(sub => !sub.isDestroyed);
            }

            // 2. 하위 유닛 정리 후, 현재 유닛이 파괴되어야 하는지 판단합니다.
            if (u instanceof SymbolUnit) {
                // 대대(echelon: BATTALION)는 휘하의 모든 전투 중대(Company)가 사라지면 파괴됩니다.
                // 최상급 부대(사단 등)는 휘하의 모든 대대(SymbolUnit)가 사라지면 파괴됩니다.
                if (u.subUnits.length === 0) {
                    u.isDestroyed = true;
                }
            }
        });
    }
    cleanupRecursively(topLevelUnits);
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
 * 파괴된 최상위 유닛(isDestroyed가 true)을 게임 월드에서 제거합니다.
 * @param {Unit[]} topLevelUnits - 게임 월드의 모든 최상위 유닛 목록
 * @param {Unit | null} selectedUnit - 현재 선택된 유닛
 * @returns {{ remainingUnits: Unit[], newSelectedUnit: Unit | null }} - 제거 후 남은 유닛 목록과 새로운 선택 유닛
 */
function cleanupDestroyedUnits(topLevelUnits, selectedUnit) {
    // 이 함수는 이제 최상위 레벨에서 파괴된 유닛만 제거하는 단순한 역할만 합니다.
    // 복잡한 재귀 로직은 updateUnits 내부로 이동했습니다.
    let newSelectedUnit = selectedUnit;

    const remainingUnits = topLevelUnits.filter(unit => {
        const isTotallyDestroyed = unit.isDestroyed;
        if (isTotallyDestroyed && newSelectedUnit === unit) {
            newSelectedUnit = null;
        }
        return !isTotallyDestroyed;
    });

    return { remainingUnits, newSelectedUnit };
}