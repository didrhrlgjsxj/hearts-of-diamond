/**
 * 게임 내 모든 유닛의 상태 업데이트(이동, 전투, 조직력 등)를 담당합니다.
 * @param {Unit[]} topLevelUnits - 게임 월드의 모든 최상위 유닛 목록
 * @param {number} scaledDeltaTime - 게임 속도가 적용된 프레임 간 시간 간격 (초)
 */
function updateUnits(topLevelUnits, scaledDeltaTime) {

    // --- 1. 상태 초기화 및 모든 전투 부대 목록 생성 ---
    const allCombatSubUnits = [];
    topLevelUnits.forEach(unit => {
        unit.isInCombat = false;
        unit.isEnemyDetected = false; // 적 발견 상태도 매 프레임 초기화
        unit.tracers = []; // 예광탄 효과 초기화
        unit.updateVisuals(scaledDeltaTime); // 데미지 텍스트 등 시각 효과 업데이트
        unit.getAllBattalions().forEach(b => b.isBeingTargeted = false); // 대대별 피격 상태 초기화

        // 모든 전투 가능 부대를 하나의 배열로 모읍니다.
        if (!unit.isDestroyed) {
            allCombatSubUnits.push(...unit.combatSubUnits); // combatSubUnits는 이미 파괴된 유닛이 제거된 상태
        }
    });

    // --- 2. 목표 탐색 및 전투 상태 설정 ---
    const targetMap = new Map(); // 각 유닛이 누구를 목표로 할지 임시 저장

    for (const subUnit of allCombatSubUnits) {
        // 측면 공격을 받으면, 공격자를 우선 목표로 설정합니다.
        // 조건: 1. 내가 현재 측면 공격 중이고, 2. 다른 누군가가 나를 공격하고 있을 때
        if (subUnit.currentTarget && subUnit.currentTarget.currentTarget !== subUnit && subUnit.isBeingTargeted) {
            // 나를 공격하는 적들 중에서, 내 사거리 안에 있는 가장 가까운 적을 찾습니다.
            const flankersInRange = allCombatSubUnits.filter(u => u.currentTarget === subUnit && Math.hypot(subUnit.x - u.x, subUnit.y - u.y) < subUnit.engagementRange);

            if (flankersInRange.length > 0) {
                const closestFlanker = flankersInRange.reduce((closest, flanker) => {
                    const dist = Math.hypot(subUnit.x - flanker.x, subUnit.y - flanker.y);
                    return dist < closest.dist ? { unit: flanker, dist } : closest;
                }, { unit: null, dist: Infinity }).unit;

                targetMap.set(subUnit, closestFlanker); // 반격 대상을 설정합니다.
                continue; // 우선 목표가 정해졌으므로 일반 목표 탐색을 건너뜁니다.
            }
        }

        // 일반적인 목표 탐색: 가장 가까운 적을 찾습니다.
        let potentialTarget = null;
        let minDistance = subUnit.engagementRange;

        for (const targetSubUnit of allCombatSubUnits) {
            if (targetSubUnit.team === subUnit.team) continue;

            const distance = Math.hypot(subUnit.x - targetSubUnit.x, subUnit.y - targetSubUnit.y);
            if (distance < minDistance) {
                minDistance = distance;
                potentialTarget = targetSubUnit;
            }
        }
        targetMap.set(subUnit, potentialTarget);
    }

    // --- 3. 실제 공격 및 피해 계산 (턴 기반) ---
    targetMap.forEach((target, attacker) => {
        if (!target) {
            attacker.tactic = null; // 전투가 끝나면 전술 해제
            attacker.tacticChangeProgress = 0;
            attacker.currentTarget = null;
            attacker.attackProgress = 0; // 공격 대상이 없으면 초기화
            // 대대의 목표가 없으면 휘하 중대의 목표도 모두 초기화합니다.
            attacker.getAllCompanies().forEach(c => {
                c.companyTarget = null;
            });
            return;
        }

        attacker.currentTarget = target;
        target.isBeingTargeted = true;
        const attackerTopLevel = attacker.getTopLevelParent();
        const targetTopLevel = target.getTopLevelParent();
        
        // 실제 전투 단위인 대대와 그 상위 부대 모두 전투 상태로 설정합니다.
        attackerTopLevel.isInCombat = true;
        attacker.isInCombat = true;
        targetTopLevel.isInCombat = true;
        target.isInCombat = true;

        // 전술 변경 로직 (3초마다)
        attacker.tacticChangeProgress += scaledDeltaTime;
        if (attacker.tacticChangeProgress >= attacker.tacticChangeCooldown) {
            attacker.tacticChangeProgress = 0;
            const tacticKeys = Object.keys(TACTICS);
            const randomTacticKey = tacticKeys[Math.floor(Math.random() * tacticKeys.length)];
            attacker.tactic = TACTICS[randomTacticKey];
        }
        // 전투 시작 시 첫 전술을 즉시 선택
        if (!attacker.tactic) {
            const tacticKeys = Object.keys(TACTICS);
            const randomTacticKey = tacticKeys[Math.floor(Math.random() * tacticKeys.length)];
            attacker.tactic = TACTICS[randomTacticKey];
        }

        // 공격 턴 계산
        attacker.attackProgress += scaledDeltaTime;
        if (attacker.attackProgress >= attacker.attackCooldown) {
            attacker.attackProgress = 0; // 턴 초기화

            // --- 중대별 및 효율성 계산 ---
            let totalEffectivePower = 0;
            const attackerCompanies = attacker.getAllCompanies();
            const targetCompanies = target.getAllCompanies();

            attackerCompanies.forEach(myCompany => {
                // 1. 각 중대의 목표 설정 (가장 가까운 적 중대)
                myCompany.companyTarget = targetCompanies.reduce((closest, enemy) => {
                    if (!closest) return enemy;
                    const dist = Math.hypot(myCompany.x - enemy.x, myCompany.y - enemy.y);
                    const closestDist = Math.hypot(myCompany.x - closest.x, myCompany.y - closest.y);
                    return dist < closestDist ? enemy : closest;
                }, null);

                if (!myCompany.companyTarget) return;

                const distToTarget = Math.hypot(myCompany.x - myCompany.companyTarget.x, myCompany.y - myCompany.companyTarget.y);

                // 3. 전투 효율성 계산 (최적 교전 거리에 따라 0~1)
                // 최적 거리에서 100%, 최적 거리의 2배 또는 0 거리에서 0%가 되도록 계산합니다.
                const range = UNIT_TYPE_EFFECTIVENESS_RANGE[myCompany.type] || { optimal: 100 };
                const optimalDistance = range.optimal;
                const distanceDifference = Math.abs(distToTarget - optimalDistance);
                // 최적 거리에서 벗어난 비율을 계산합니다.
                myCompany.combatEffectiveness = Math.max(0, 1 - (distanceDifference / optimalDistance));

                // 4. 중대의 유효 공격력 계산 (공격력 * 참여도 * 효율성)
                const defenderHardness = myCompany.companyTarget.hardness;
                const companyBaseAttack = myCompany.softAttack * (1 - defenderHardness) + myCompany.hardAttack * defenderHardness;
                totalEffectivePower += companyBaseAttack * myCompany.combatEffectiveness;
            });

            // 5. 대대의 최종 공격력 계산
            const tacticAttackModifier = attacker.tactic ? attacker.tactic.attackModifier : 1.0;
            const effectiveAttack = totalEffectivePower * tacticAttackModifier;
            const totalAttackPower = Math.max(0, effectiveAttack - target.armor);

            // 2. 화력은 조직력에 직접적인 추가 피해를 줍니다.
            const firepowerDamage = attacker.firepower * 1.5;

            target.takeDamage(totalAttackPower, firepowerDamage);
        }

        // --- 시각 효과 ---
        // 대대 간의 굵은 전투선
        const isFrontal = target.currentTarget === attacker;
        attackerTopLevel.tracers.push({
            from: attacker,
            to: target,
            life: 0.5,
            type: isFrontal ? 'frontal' : 'flank'
        });

        // 중대 간의 얇은 예광탄 (쇼 연출)
        attacker.getAllCompanies().forEach(myCompany => {
            // 전투 효율성이 10% 이상일 때만 예광탄을 그립니다.
            if (myCompany.companyTarget && myCompany.combatEffectiveness > 0.1) {
                attackerTopLevel.tracers.push({ from: myCompany, to: myCompany.companyTarget, life: 0.3, type: 'company' });
            }
        });

        // 첫 번째 정면 전투를 중계 대상으로 설정
        if (isFrontal && !broadcastedBattle) {
            broadcastedBattle = { unitA: attacker, unitB: target };
        }

        // 전투 중 방향 전환
        if (!attackerTopLevel.destination) {
            attackerTopLevel.direction = Math.atan2(target.y - attackerTopLevel.y, target.x - attackerTopLevel.x);
        }
    });

    // --- 4. 조직력 회복 및 최종 업데이트 ---
    for (const unit of topLevelUnits) {
        // --- 조직력 회복 로직 ---
        // 모든 대대의 조직력을 회복시킵니다.
        for (const battalion of unit.getAllBattalions()) {
            if (battalion.organization < battalion.maxOrganization) {
                const recoveryRate = battalion.isInCombat ? battalion.organizationRecoveryRateInCombat : battalion.organizationRecoveryRate;
                battalion.organization = Math.min(battalion.maxOrganization, battalion.organization + recoveryRate * scaledDeltaTime);
            }
        }
    }

    // --- 이동 및 진형 업데이트 ---
    // 1단계: 모든 유닛의 이동을 먼저 처리합니다.
    topLevelUnits.forEach(unit => processUnitMovement(unit, scaledDeltaTime));
    // 2단계: 이동이 완료된 위치를 기준으로 모든 유닛의 진형을 업데이트합니다.
    topLevelUnits.forEach(unit => processFormationUpdate(unit));
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
 * 특정 아군 전투 중대(sub-unit)에 가장 가까운 적 전투 중대를 찾습니다.
 * @param {Unit} friendlySubUnit - 대상 아군 전투 중대
 * @param {Unit[]} allTopLevelUnits - 게임 월드의 모든 최상위 유닛 목록
 * @returns {{unit: Unit|null, distance: number}} - 가장 가까운 적 유닛과 그 거리
 */
function findClosestEnemySubUnit(friendlySubUnit, allTopLevelUnits) {
    let closestEnemy = null;
    let minDistance = friendlySubUnit.engagementRange;

    for (const enemyTopLevelUnit of allTopLevelUnits) {
        if (enemyTopLevelUnit.team === friendlySubUnit.team || enemyTopLevelUnit.isDestroyed) continue;

        for (const enemySubUnit of enemyTopLevelUnit.combatSubUnits) {
            const distance = Math.hypot(friendlySubUnit.x - enemySubUnit.x, friendlySubUnit.y - enemySubUnit.y);
            if (distance < minDistance) {
                minDistance = distance;
                closestEnemy = enemySubUnit;
            }
        }
    }
    return { unit: closestEnemy, distance: minDistance };
}

/**
 * 파괴된 최상위 유닛(isDestroyed가 true)을 게임 월드에서 제거합니다.
 * @param {Unit[]} topLevelUnits - 게임 월드의 모든 최상위 유닛 목록
 * @param {Unit | null} selectedUnit - 현재 선택된 유닛
 * @returns {{ remainingUnits: Unit[], newSelectedUnit: Unit | null }} - 제거 후 남은 유닛 목록과 새로운 선택 유닛
 */
function cleanupDestroyedUnits(topLevelUnits, selectedUnit) {
    let newSelectedUnit = selectedUnit;

    // 1. 각 최상위 부대 내에서 파괴된 하위 대대를 제거합니다.
    topLevelUnits.forEach(unit => {
        if (unit instanceof SymbolUnit) {
            unit.subUnits = unit.subUnits.filter(sub => !sub.isDestroyed);
            unit.combatSubUnits = unit.combatSubUnits.filter(sub => !sub.isDestroyed);
        }
    });

    // 2. 최상위 부대 자체가 파괴되었는지 확인하고 목록에서 제거합니다.
    const remainingUnits = topLevelUnits.filter(unit => {
        // 부대가 파괴되었고, 하위 유닛도 모두 없어졌을 때 완전히 제거합니다.
        const isTotallyDestroyed = unit.isDestroyed && unit.subUnits.length === 0;
        if (isTotallyDestroyed && newSelectedUnit === unit) {
            newSelectedUnit = null;
        }
        return !isTotallyDestroyed;
    });

    return { remainingUnits, newSelectedUnit };
}