/**
 * 게임 내 모든 유닛의 상태 업데이트(이동, 전투, 조직력 등)를 담당합니다.
 * @param {Unit[]} topLevelUnits - 게임 월드의 모든 최상위 유닛 목록
 * @param {number} deltaTime - 프레임 간 시간 간격 (초)
 */
function updateUnits(topLevelUnits, deltaTime) {

    // --- 1. 상태 초기화 및 모든 전투 부대 목록 생성 ---
    const allCombatSubUnits = [];
    topLevelUnits.forEach(unit => {
        unit.isInCombat = false;
        unit.isEnemyDetected = false; // 적 발견 상태도 매 프레임 초기화
        unit.tracers = []; // 예광탄 효과 초기화
        unit.updateVisuals(deltaTime); // 데미지 텍스트 등 시각 효과 업데이트
        unit.getAllCompanies().forEach(c => {
            c.isBeingTargeted = false; // 중대별 피격 상태 초기화
        });

        // 모든 전투 가능 부대를 하나의 배열로 모읍니다.
        if (unit.currentStrength > 0) {
            allCombatSubUnits.push(...unit.combatSubUnits);
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
            attacker.currentTarget = null;
            attacker.attackProgress = 0; // 공격 대상이 없으면 초기화
            return;
        }

        attacker.currentTarget = target;
        target.isBeingTargeted = true;
        const attackerTopLevel = attacker.getTopLevelParent();
        const targetTopLevel = target.getTopLevelParent();

        attackerTopLevel.isInCombat = true;
        targetTopLevel.isInCombat = true;

        // 공격 턴 계산
        attacker.attackProgress += deltaTime;
        if (attacker.attackProgress >= attacker.attackCooldown) {
            attacker.attackProgress = 0; // 턴 초기화

            const defender = targetTopLevel;
            const defenderHardness = defender.hardness;
            const effectiveAttack = attacker.totalSoftAttack * (1 - defenderHardness) + attacker.totalHardAttack * defenderHardness;
            const strDamage = Math.max(0, effectiveAttack - defender.totalArmor) * 0.1;
            const orgDamage = attacker.totalFirepower * 1.5;

            targetTopLevel.takeDamage(orgDamage, strDamage, { x: attacker.x, y: attacker.y });
        }

        // 전투 시각 효과 (예광탄)
        const isFrontal = target.currentTarget === attacker;
        attackerTopLevel.tracers.push({
            from: attacker,
            to: target,
            life: 0.5,
            type: isFrontal ? 'frontal' : 'flank'
        });

        // 전투 중 방향 전환
        if (!attackerTopLevel.destination) {
            attackerTopLevel.direction = Math.atan2(target.y - attackerTopLevel.y, target.x - attackerTopLevel.x);
        }
    });

    // --- 4. 조직력 회복 및 최종 업데이트 ---
    for (const unit of topLevelUnits) {
        // --- 조직력 회복 로직 ---
        if (unit.organization < unit.maxOrganization) {
            const recoveryRate = unit.isInCombat ? unit.organizationRecoveryRateInCombat : unit.organizationRecoveryRate;
            unit.organization = Math.min(unit.maxOrganization, unit.organization + recoveryRate * deltaTime);
        }
    }

    // --- 이동 및 진형 업데이트 ---
    // 1단계: 모든 유닛의 이동을 먼저 처리합니다.
    topLevelUnits.forEach(unit => processUnitMovement(unit, deltaTime));
    // 2단계: 이동이 완료된 위치를 기준으로 모든 유닛의 진형을 업데이트합니다.
    topLevelUnits.forEach(unit => processFormationUpdate(unit));
}

/**
 * 유닛과 그 하위 유닛들의 이동 로직(updateMovement)을 재귀적으로 처리합니다.
 * @param {Unit} unit 
 * @param {number} deltaTime 
 */
function processUnitMovement(unit, deltaTime) {
    if (unit.updateMovement) {
        unit.updateMovement(deltaTime);
    }
    unit.subUnits.forEach(subUnit => processUnitMovement(subUnit, deltaTime));
}

/**
 * 유닛과 그 하위 유닛들의 진형 로직(updateCombatSubUnitPositions)을 재귀적으로 처리합니다.
 * @param {Unit} unit 
 */
function processFormationUpdate(unit) {
    if (unit instanceof CommandUnit) {
        unit.updateCombatSubUnitPositions();
    }
    unit.subUnits.forEach(subUnit => processFormationUpdate(subUnit));
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