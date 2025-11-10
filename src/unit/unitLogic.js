/**
 * 게임 내 모든 유닛의 상태 업데이트(이동, 전투, 조직력 등)를 담당합니다.
 * 전역 변수 broadcastedBattle을 설정할 수 있습니다.
 * @param {Unit[]} topLevelUnits - 게임 월드의 모든 최상위 유닛 목록
 * @param {number} scaledDeltaTime - 게임 속도가 적용된 프레임 간 시간 간격 (초)
 */
function updateUnits(topLevelUnits, scaledDeltaTime) {

    // --- 1. 상태 초기화 및 모든 전투 부대 목록 생성 ---
    const allCompanies = []; // 이제 전투의 주체는 '중대'입니다.
    topLevelUnits.forEach(unit => {
        unit.isInCombat = false;
        unit.isEnemyDetected = false; // 적 발견 상태도 매 프레임 초기화
        unit.tracers = []; // 예광탄 효과 초기화
        unit.updateVisuals(scaledDeltaTime); // 데미지 텍스트 등 시각 효과 업데이트
        // isBeingTargeted는 이제 중대 단위로 관리되므로 여기서는 초기화하지 않습니다.
        unit.getAllBattalions().forEach(b => b.isBeingTargeted = false); // 대대별 피격 상태 초기화 (UI 표시용)

        // 모든 전투 가능 부대를 하나의 배열로 모읍니다.
        // 파괴되지 않은 모든 대대를 순회하며 그 안의 중대를 추출합니다.
        unit.getAllBattalions().forEach(battalion => {
            if (!battalion.isDestroyed) {
                battalion.getAllCompanies().forEach(company => {
                    if (!company.isDestroyed) {
                        company.isBeingTargeted = false; // 중대별 피격 상태 초기화
                        allCompanies.push(company);
                    }
                });
            }
        });
    });

    console.log(`[디버그] updateUnits 시작. 전투 가능 중대 수: ${allCompanies.length}`);

    // --- 2. 목표 탐색 ---
    for (const myCompany of allCompanies) {
        // 일반적인 목표 탐색: 가장 가까운 적을 찾습니다.
        let closestEnemyCompany = null;
        let minDistance = myCompany.engagementRange;

        for (const enemyCompany of allCompanies) {
            if (enemyCompany.team === myCompany.team) {
                continue;
            }

            const distance = Math.hypot(myCompany.x - enemyCompany.x, myCompany.y - enemyCompany.y);
            // console.log(`[디버그] 탐색 중: ${myCompany.name} -> ${enemyCompany.name} | 거리: ${distance.toFixed(1)}, 교전범위: ${minDistance}`);
            if (distance < minDistance) {
                minDistance = distance;
                closestEnemyCompany = enemyCompany;
            }
        }
        // 목표가 변경되었거나 새로 설정되었을 때만 로그를 출력합니다.
        if (myCompany.companyTarget !== closestEnemyCompany) {
            myCompany.companyTarget = closestEnemyCompany; // 각 중대의 목표를 설정
            if (closestEnemyCompany) {
                console.log(`[목표 지정] ${myCompany.name}(팀:${myCompany.team}) -> ${closestEnemyCompany.name}(팀:${closestEnemyCompany.team}) | 거리: ${minDistance.toFixed(1)}`);
            }
        }
    }

    // --- 3. 공격 및 피해 계산 ---
    const engagedBattalions = new Set(); // 이번 턴에 공격을 수행한 대대를 기록

    for (const myCompany of allCompanies) {
        const enemyCompany = myCompany.companyTarget;
        if (!enemyCompany) {
            myCompany.isInCombat = false;
            continue;
        }

        // 공격자와 방어자의 최상위 부모(대대)를 찾습니다.
        const myBattalion = myCompany.parent; // 중대의 부모는 대대입니다.
        const enemyBattalion = enemyCompany.parent;

        if (!myBattalion || !enemyBattalion) continue;
        
        // 대대 및 그 상위 부대, 그리고 중대 자체를 전투 상태로 설정합니다.
        myBattalion.getTopLevelParent().isInCombat = true;
        myBattalion.isInCombat = true;
        myCompany.isInCombat = true;
        enemyBattalion.getTopLevelParent().isInCombat = true;
        enemyBattalion.isInCombat = true;
        enemyCompany.isInCombat = true;

        // 중대가 공격받고 있음을 표시
        enemyCompany.isBeingTargeted = true;
        enemyBattalion.isBeingTargeted = true; // UI 표시용

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
                const combatCompanies = myBattalion.getAllCompanies().filter(comp => comp !== myBattalion.hqCompany);
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

                    // 4. 최종 공격력 및 화력 피해 계산
                    // 최종 공격력은 방어자의 장갑 수치에 의해 감소됩니다.
                    const totalAttackPower = Math.max(0, finalAttack - target.armor);
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
        if (myCompany.companyTarget && myCompany.combatEffectiveness > 0.1) {
            myBattalionTopLevel.tracers.push({ from: myCompany, to: myCompany.companyTarget, life: 0.3, type: 'company' });
        }

        // 대대 간의 굵은 전투선
        // 적 대대(enemyBattalion)의 중대들 중 하나라도 우리 대대(myBattalion)의 중대를 목표로 하고 있는지 확인합니다.
        const isFrontal = enemyBattalion.getAllCompanies().some(enemyComp => {
            return enemyComp.companyTarget && enemyComp.companyTarget.parent === myBattalion; // 중대의 부모는 대대
        });
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
    const allBattalions = new Set(allCompanies.map(c => c.parent).filter(b => b));
    allBattalions.forEach(battalion => {
        // 휘하 중대 중 하나라도 전투 중이면 대대는 전투 중 상태를 유지
        const isAnyCompanyInCombat = battalion.getAllCompanies().some(c => c.isInCombat);
        if (!isAnyCompanyInCombat) {
            battalion.isInCombat = false;
            battalion.tactic = null;
            battalion.tacticChangeProgress = 0;
            battalion.attackProgress = 0;
        }
    });

    // --- 4. 조직력 회복 및 최종 업데이트 ---
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

    // 1. 각 최상위 부대 내에서 파괴된 하위 부대(대대, 중대 등)를 제거합니다.
    function filterDestroyed(units) {
        units.forEach(u => {
            if (u.subUnits.length > 0) {
                u.subUnits = u.subUnits.filter(sub => !sub.isDestroyed);
                filterDestroyed(u.subUnits);
            }
        });
    }
    filterDestroyed(topLevelUnits);

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