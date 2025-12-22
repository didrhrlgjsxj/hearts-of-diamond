/**
 * 게임 내 모든 유닛의 생성, 상태 업데이트, 렌더링을 총괄하는 관리자 클래스입니다.
 */
class UnitManager {
    constructor() {
        this.topLevelUnits = []; // 최상위 부대들을 관리하는 배열
        this.selectedUnit = null;   // 현재 선택된 유닛
        // key: provinceId, value: { nation, progress, unitId }
        this.captureProgress = new Map();
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

        // 유닛들의 시각적 오프셋을 업데이트하여 겹침을 방지합니다.
        this.updateUnitVisualOffsets();

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

    /**
     * 같은 그리드에 있는 유닛들을 시각적으로 분산시켜 겹침을 방지합니다.
     */
    updateUnitVisualOffsets() {
        const gridMap = new Map();

        // 재귀적으로 모든 유닛 수집
        const collect = (units) => {
            for (const unit of units) {
                if (unit.isDestroyed) continue;
                
                const key = `${unit.snappedX},${unit.snappedY}`;
                if (!gridMap.has(key)) gridMap.set(key, []);
                gridMap.get(key).push(unit);

                if (unit.subUnits && unit.subUnits.length > 0) {
                    collect(unit.subUnits);
                }
            }
        };
        collect(this.topLevelUnits);

        // 오프셋 계산
        gridMap.forEach(units => {
            const count = units.length;
            if (count <= 1) {
                units[0].visualOffsetX = 0;
                units[0].visualOffsetY = 0;
                return;
            }

            // 원형 배치: 유닛 개수에 따라 반지름 조절 (최대 10px로 제한하여 인접 그리드 침범 방지)
            const radius = Math.min(10, 4 + count); 
            const angleStep = (Math.PI * 2) / count;
            
            units.forEach((u, i) => {
                const angle = i * angleStep;
                u.visualOffsetX = Math.cos(angle) * radius;
                u.visualOffsetY = Math.sin(angle) * radius;
            });
        });
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

    // --- 점령 진행 상황 업데이트 ---
    updateCaptureProgress(unitManager, allBattalions, scaledDeltaTime);

    // --- 2. 대대 단위 목표 탐색 ---
    for (const myBattalion of allBattalions) {
        let closestEnemyBattalion = null;
        // 최적화: 거리 제곱을 사용하여 제곱근 연산 제거
        let minDistanceSq = myBattalion.engagementRange * myBattalion.engagementRange;

        for (const enemyBattalion of allBattalions) {
            // 외교 관계를 확인하여 적인지 판단합니다.
            if (!myBattalion.nation.isEnemyWith(enemyBattalion.nation.id)) continue;
            
            const dx = myBattalion.snappedX - enemyBattalion.snappedX;
            const dy = myBattalion.snappedY - enemyBattalion.snappedY;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDistanceSq) {
                minDistanceSq = distSq;
                closestEnemyBattalion = enemyBattalion;
            }
        }
        myBattalion.battalionTarget = closestEnemyBattalion;

        // 3. 중대 단위 목표 할당
        if (myBattalion.battalionTarget) {
            myBattalion.targetSelectionTimer += scaledDeltaTime;
            const shouldRetarget = myBattalion.targetSelectionTimer >= myBattalion.targetSelectionCooldown;

            if (shouldRetarget) {
                myBattalion.targetSelectionTimer = 0;
                // 다음 주기를 약간 랜덤하게 설정 (1.0 ~ 2.0초)
                myBattalion.targetSelectionCooldown = 1.0 + Math.random();
            }

            // 전투 가능한 아군 중대만 필터링합니다. (파괴, 후퇴, 재정비 중인 중대 제외)
            const myCombatReadyCompanies = myBattalion.getAllCompanies().filter(c => !c.isDestroyed && !c.isRetreating && !c.isRefitting);
            const enemyCompanies = myBattalion.battalionTarget.getAllCompanies().filter(c => !c.isDestroyed);

            if (myCombatReadyCompanies.length === 0 || enemyCompanies.length === 0) continue;

            // 각 중대에 공격할 적 중대를 할당합니다.
            // 이제 재정비 중인 중대는 companyTarget을 할당받지 않습니다.
            myCombatReadyCompanies.forEach((myCompany) => {
                // 타겟이 파괴되었으면 즉시 초기화
                if (myCompany.companyTarget && myCompany.companyTarget.isDestroyed) {
                    myCompany.companyTarget = null;
                }

                // 주기적 재할당(shouldRetarget)이거나 타겟이 없을 경우에만 탐색 수행
                if (shouldRetarget || !myCompany.companyTarget) {
                    // 2순위: 상성 우위 (추후 구현 예정)

                    // 3순위: 가장 가까운 적 중대 (최적화: 거리 제곱 사용)
                    let bestTarget = null;
                    let minDistanceSq = Infinity;

                    for (const enemyCompany of enemyCompanies) {
                        const dx = myCompany.snappedX - enemyCompany.snappedX;
                        const dy = myCompany.snappedY - enemyCompany.snappedY;
                        const distSq = dx * dx + dy * dy;

                        if (distSq < minDistanceSq) {
                            minDistanceSq = distSq;
                            bestTarget = enemyCompany;
                        }
                    }
                    myCompany.companyTarget = bestTarget;
                }
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
                    const distToTarget = Math.hypot(c.snappedX - target.snappedX, c.snappedY - target.snappedY);

                    // 1. 전투 효율성 계산 (거리에 따라 0~1)
                    // 최적 거리에서 100%, 거리가 0일 때 70%의 효율을 가집니다.
                    const range = UNIT_TYPE_EFFECTIVENESS_RANGE[c.type] || { optimal: 100 };
                    const optimalDistance = range.optimal;

                    if (distToTarget <= optimalDistance) {
                        // 거리가 0일 때 0.7, 최적 거리일 때 1.0이 되도록 선형 보간
                        c.combatEffectiveness = 0.7 + (distToTarget / optimalDistance) * 0.3;
                    } else {
                        // 최적 거리보다 멀어질 경우 효율이 감소
                        // 최적 거리의 2배일 때 0.4, 3.5배일 때 0이 되도록 설정
                        const falloff = (distToTarget - optimalDistance) / (optimalDistance * 2.5);
                        c.combatEffectiveness = Math.max(0, 1.0 - falloff);
                    }
                    // 최종 효율성은 0과 1 사이 값으로 제한
                    c.combatEffectiveness = Math.max(0, Math.min(1, c.combatEffectiveness));

                    // 2. 유효 공격력 계산 (방어자의 기갑화율에 따라 대인/대물 공격력 조합)
                    const defenderHardness = target.hardness;
                    const companyBaseAttack = c.softAttack * (1 - defenderHardness) + c.hardAttack * defenderHardness;
                    const effectiveAttack = companyBaseAttack * c.combatEffectiveness;

                    // 3. 대대의 현재 전술에 따른 공격력 보너스/페널티 적용
                    const tactic = myBattalion.tactic || { attackModifier: 1.0, orgDamageModifier: 1.0 };

                    // 4. 최종 피해량 계산 (직접/간접 화력 시스템 적용)

                    // 4-1. 유효 대인/대물 공격력 계산 (기갑화율 적용)
                    const softPart = c.softAttack * (1 - defenderHardness);
                    const hardPart = c.hardAttack * defenderHardness;
                    const baseDamage = (softPart + hardPart) * c.combatEffectiveness * tactic.attackModifier;
                    
                    // 4-2. 조직력 피해량 계수 계산
                    // 간접 화력과 조직 방어력을 비교하여 피해량 계수를 계산합니다.
                    // 화력이 방어력보다 높으면 피해가 증폭되고, 낮으면 감소합니다.
                    const orgDamageMultiplier = target.organizationDefense > 0
                        ? c.indirectFirepower / (c.indirectFirepower + target.organizationDefense) * 2
                        : 2.0; // 방어력이 0이면 최대 피해
                    const totalOrgDamage = baseDamage * orgDamageMultiplier * tactic.orgDamageModifier;

                    // 4-3. 내구력 피해량 계수 계산
                    // 직접 화력과 단위 방어력을 비교하여 피해량 계수를 계산합니다.
                    const strDamageMultiplier = target.unitDefense > 0
                        ? c.directFirepower / (c.directFirepower + target.unitDefense) * 2
                        : 2.0; // 방어력이 0이면 최대 피해
                    const totalStrDamage = baseDamage * strDamageMultiplier;

                    // 5. 계산된 피해를 적 '중대'에 적용합니다. takeDamage를 수정하여 두 종류의 피해를 받도록 합니다.
                    // takeDamage 내부에서 조직력 흡수율에 따라 최종적으로 분배됩니다.
                    // 여기서는 두 피해 유형을 합쳐서 하나의 값으로 전달합니다.
                    const totalAttackPower = totalOrgDamage + totalStrDamage;
                    target.takeDamage(totalAttackPower, { x: c.snappedX, y: c.snappedY });
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
            const angle = Math.atan2(enemyBattalion.snappedY - myBattalion.snappedY, enemyBattalion.snappedX - myBattalion.snappedX);
            myBattalion.direction = angle;
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
    // 이 단계에서 유닛의 현재 프로빈스 ID도 업데이트합니다.
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

    // 유닛의 현재 프로빈스 ID 업데이트
    const tileX = Math.floor(unit.snappedX / TILE_SIZE);
    const tileY = Math.floor(unit.snappedY / TILE_SIZE);
    unit.currentProvinceId = mapGrid.provinceManager.provinceGrid[tileX]?.[tileY] || null;

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

/**
 * 프로빈스 점령 진행 상황을 업데이트하고 점령을 처리합니다.
 * @param {UnitManager} unitManager 
 * @param {Battalion[]} allBattalions 
 * @param {number} scaledDeltaTime 
 */
function updateCaptureProgress(unitManager, allBattalions, scaledDeltaTime) {
    const CAPTURE_TIME = 24; // 점령에 필요한 시간 (게임 시간 기준)
    const provincesWithUnits = new Map(); // key: provinceId, value: Set of nation IDs

    // 1. 모든 대대의 현재 위치를 기반으로 프로빈스별 주둔 국가를 집계합니다.
    allBattalions.forEach(b => {
        if (!b.currentProvinceId) return;
        if (!provincesWithUnits.has(b.currentProvinceId)) {
            provincesWithUnits.set(b.currentProvinceId, new Set());
        }
        provincesWithUnits.get(b.currentProvinceId).add(b.nation.id);
    });

    // 2. 점령을 시도할 수 있는 대대를 찾습니다.
    allBattalions.forEach(battalion => {
        const provinceId = battalion.currentProvinceId;
        if (!provinceId) return;

        const province = mapGrid.provinceManager.provinces.get(provinceId);
        // 이미 우리 땅이거나, 이미 점령이 진행 중인 프로빈스는 건너뜁니다.
        if (province.owner === battalion.nation || unitManager.captureProgress.has(provinceId)) {
            return;
        }

        // 점령 조건 확인
        // 조건 1: 프로빈스에 적이 없는가? (해당 프로빈스에 우리 국가 유닛만 있어야 함)
        const nationsInProvince = provincesWithUnits.get(provinceId);
        const hasEnemies = Array.from(nationsInProvince).some(nationId => nationId !== battalion.nation.id);
        if (hasEnemies) return;

        // 조건 2: 수도로부터 보급선이 연결되어 있는가? (인접한 아군 프로빈스가 있고, 그 프로빈스가 수도와 연결)
        const adjacentProvinces = mapGrid.provinceManager.provinceAdjacency.get(provinceId) || [];
        const isConnected = adjacentProvinces.some(adjId => 
            battalion.nation.territory.has(adjId) && mapGrid.provinceManager.isPathToCapital(adjId, battalion.nation)
        );
        if (!isConnected) return;

        // 모든 조건을 만족하면 점령을 시작합니다.
        console.log(`[${battalion.nation.name}] ${battalion.name}이(가) ${provinceId}번 프로빈스 점령 시작.`);
        unitManager.captureProgress.set(provinceId, {
            nation: battalion.nation,
            progress: 0,
            unitId: battalion.id // 어떤 유닛이 점령을 시작했는지 기록 (선택사항)
        });
    });

    // 3. 진행 중인 모든 점령 상태를 업데이트합니다.
    unitManager.captureProgress.forEach((capture, provinceId) => {
        capture.progress += scaledDeltaTime;

        // 점령군이 사라지거나 적이 나타나면 점령을 중단합니다.
        const nationsInProvince = provincesWithUnits.get(provinceId) || new Set();
        if (!nationsInProvince.has(capture.nation.id) || Array.from(nationsInProvince).some(id => id !== capture.nation.id)) {
            console.log(`${provinceId}번 프로빈스 점령 중단 (점령군 이탈 또는 적 출현)`);
            unitManager.captureProgress.delete(provinceId);
        } else if (capture.progress >= CAPTURE_TIME) {
            const province = mapGrid.provinceManager.provinces.get(provinceId);
            const captureCost = province.tiles.length * 10;
            const nation = capture.nation;

            // 경제 단위를 지불할 수 있는지 확인합니다.
            if (nation.economy.economicUnits >= captureCost) {
                nation.economy.economicUnits -= captureCost;
                //console.log(`[${nation.name}] ${provinceId}번 프로빈스 점령 완료! (비용: ${captureCost} 경제 단위)`);
                mapGrid.setProvinceOwner(provinceId, nation);
                unitManager.captureProgress.delete(provinceId);
            } else {
                // 비용이 부족하면 점령이 실패하고 타이머가 초기화됩니다.
                //console.log(`[${nation.name}] ${provinceId}번 프로빈스 점령 실패. (경제 단위 부족)`);
                unitManager.captureProgress.delete(provinceId);
            }
        }
    });
}