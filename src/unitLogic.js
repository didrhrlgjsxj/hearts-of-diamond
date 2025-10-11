/**
 * 게임 내 모든 유닛의 상태 업데이트(이동, 전투, 조직력 등)를 담당합니다.
 * @param {Unit[]} topLevelUnits - 게임 월드의 모든 최상위 유닛 목록
 * @param {number} deltaTime - 프레임 간 시간 간격 (초)
 */
function updateUnits(topLevelUnits, deltaTime) {

    // --- 1. 상태 초기화 및 기본 업데이트 ---
    topLevelUnits.forEach(unit => {
        unit.isInCombat = false;
        unit.isEnemyDetected = false; // 적 발견 상태도 매 프레임 초기화
        unit.tracers = []; // 예광탄 효과 초기화
        unit.updateVisuals(deltaTime); // 데미지 텍스트 등 시각 효과 업데이트
    });

    // --- 2. 유닛별 행동 처리 (탐지, 전투, 이동) ---
    for (const attackerUnit of topLevelUnits) {
        if (attackerUnit.currentStrength <= 0) continue;

        let closestEnemyTopLevel = null;
        let minTopLevelDistance = Infinity;

        // --- 최적화: 적 탐색 로직 통합 ---
        // 모든 적 유닛을 한 번만 순회하여 거리 계산 후, 필요한 모든 로직(탐지, 방향, 전투 대상)을 처리합니다.
        for (const targetUnit of topLevelUnits) {
            if (targetUnit.team === attackerUnit.team || targetUnit.currentStrength <= 0) continue;

            const distance = Math.hypot(attackerUnit.x - targetUnit.x, attackerUnit.y - targetUnit.y);

            // 1. 적 탐지 로직
            if (distance < attackerUnit.detectionRange) {
                attackerUnit.isEnemyDetected = true;
            }

            // 2. 가장 가까운 적 부대(최상위) 찾기 (진형 방향 결정용)
            if (distance < minTopLevelDistance) {
                minTopLevelDistance = distance;
                closestEnemyTopLevel = targetUnit;
            }
        }

        // --- 진형 방향 결정 ---
        if (closestEnemyTopLevel && (attackerUnit.isInCombat || !attackerUnit.destination)) {
            attackerUnit.direction = Math.atan2(closestEnemyTopLevel.y - attackerUnit.y, closestEnemyTopLevel.x - attackerUnit.x);
        }

        // --- 전투 로직 (개별 전투 부대 단위) ---
        for (const combatSubUnit of attackerUnit.combatSubUnits) {
            // 각 전투 중대에 대해 가장 가까운 적 전투 중대를 찾습니다.
            const { unit: closestEnemySubUnit } = findClosestEnemySubUnit(combatSubUnit, topLevelUnits);

            if (closestEnemySubUnit) {
                const targetTopLevelUnit = closestEnemySubUnit.getTopLevelParent();
                const attacker = combatSubUnit;
                const defender = targetTopLevelUnit;

                const piercingDamage = Math.max(0, attacker.hardAttack - defender.totalArmor);
                const nonPiercingDamage = attacker.softAttack * Math.max(0.1, 1 - (defender.totalArmor / 10));
                const strDamage = (piercingDamage + nonPiercingDamage) * 0.2;
                const orgDamage = attacker.firepower * 1.5;

                targetTopLevelUnit.takeDamage(orgDamage, strDamage, { x: combatSubUnit.x, y: combatSubUnit.y });

                attackerUnit.isInCombat = true;
                targetTopLevelUnit.isInCombat = true;

                attackerUnit.tracers.push({
                    from: combatSubUnit,
                    to: closestEnemySubUnit,
                    life: 0.5,
                });
            }
        }

        // --- 이동 로직 ---
        // 상위 부대(여단/대대)의 이동 로직을 먼저 업데이트합니다.
        // 이 안에서 본부(HQ) 이동 및 진형 위치 재계산이 일어납니다.
        if (attackerUnit instanceof Brigade || attackerUnit instanceof Battalion) {
            attackerUnit.updateMovement(deltaTime);
            // 전투 중이 아닐 때만 진형을 유지하도록 위치를 업데이트합니다.
            if (!attackerUnit.isInCombat) {
                attackerUnit.updateCombatSubUnitPositions();
            }
        }

        // 모든 유닛의 이동을 업데이트합니다.
        // 1. 독립 부대(중대 등)의 이동을 처리합니다.
        if (!(attackerUnit instanceof Brigade || attackerUnit instanceof Battalion)) {
            attackerUnit.updateMovement(deltaTime);
        }
        // 2. 모든 전투 부대(중대)의 이동을 처리합니다.
        attackerUnit.combatSubUnits.forEach(subUnit => subUnit.updateMovement(deltaTime));
        // 3. 지휘 부대의 본부(HQ) 중대의 이동을 처리합니다.
        if (attackerUnit.hqUnit) attackerUnit.hqUnit.updateMovement(deltaTime);

        // --- 조직력 회복 로직 ---
        if (!attackerUnit.isInCombat && attackerUnit.organization < attackerUnit.maxOrganization) {
            attackerUnit.organization = Math.min(attackerUnit.maxOrganization, attackerUnit.organization + attackerUnit.organizationRecoveryRate * deltaTime);
        }
    }
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
        if (enemyTopLevelUnit.team === friendlySubUnit.team || enemyTopLevelUnit.currentStrength <= 0) continue;

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
 * 파괴된 유닛(병력이 0 이하)을 게임 월드에서 제거합니다.
 * @param {Unit[]} topLevelUnits - 게임 월드의 모든 최상위 유닛 목록
 * @param {Unit | null} selectedUnit - 현재 선택된 유닛
 * @returns {{ remainingUnits: Unit[], newSelectedUnit: Unit | null }} - 제거 후 남은 유닛 목록과 새로운 선택 유닛
 */
function cleanupDestroyedUnits(topLevelUnits, selectedUnit) {
    const remainingUnits = [];
    let newSelectedUnit = selectedUnit;

    for (const unit of topLevelUnits) {
        if (unit.currentStrength > 0) {
            remainingUnits.push(unit);
        } else {
            // 파괴된 유닛이 선택된 유닛이라면, 선택을 해제합니다.
            if (newSelectedUnit === unit) {
                newSelectedUnit = null;
            }
        }
    }
    return { remainingUnits, newSelectedUnit };
}