const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 게임 월드 설정 ---
const topLevelUnits = []; // 최상위 부대들을 관리하는 배열
let selectedUnit = null;   // 현재 선택된 유닛
const camera = new Camera(canvas); // 카메라 인스턴스 생성

let mouseX = 0;
let mouseY = 0;
let lastTime = 0; // deltaTime 계산을 위한 마지막 시간

// UI 인스턴스를 저장할 변수
let gameUI;


function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

canvas.addEventListener('click', (e) => {
    // 마우스 클릭 위치를 월드 좌표로 변환
    const worldCoords = camera.screenToWorld(mouseX, mouseY);

    let clickedUnit = null;
    // 최상위 부대부터 순회하며 클릭된 유닛을 찾음
    for (const unit of topLevelUnits) {
        clickedUnit = unit.getUnitAt(worldCoords.x, worldCoords.y);
        if (clickedUnit) break;
    }

    // 이전에 선택된 유닛의 선택 상태를 해제
    if (selectedUnit) {
        selectedUnit.setSelected(false);
    }
    // 새로 클릭된 유닛을 선택 상태로 만듦
    selectedUnit = clickedUnit;
    if (selectedUnit) {
        selectedUnit.setSelected(true);
    }

    // 부대 구성 UI를 업데이트합니다.
    gameUI.updateCompositionPanel(selectedUnit);
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // 오른쪽 클릭 메뉴가 뜨는 것을 방지

    if (selectedUnit) {
        const worldCoords = camera.screenToWorld(mouseX, mouseY);
        selectedUnit.moveTo(worldCoords.x, worldCoords.y);
    }
});

function update(currentTime) {
    if (!lastTime) {
        lastTime = currentTime;
    }
    const deltaTime = (currentTime - lastTime) / 1000; // 초 단위로 변환
    lastTime = currentTime;

    camera.update(mouseX, mouseY);


    // --- 전투 로직 ---
    // 모든 유닛의 전투 상태를 초기화합니다.
    topLevelUnits.forEach(unit => {
        unit.isInCombat = false;
        unit.isEnemyDetected = false; // 적 발견 상태도 매 프레임 초기화
    });

    // --- 새로운 전투 로직 ---
    // 모든 최상위 유닛에 대해 반복합니다.
    // 예광탄 효과를 위해 모든 유닛의 예광탄 목록을 초기화합니다.
    for (const attackerUnit of topLevelUnits) {
        attackerUnit.tracers = [];

        // 병력이 0 이하면 행동 불가
        attackerUnit.updateVisuals(deltaTime);
        if (attackerUnit.currentStrength <= 0) continue;

        // --- 적 탐지 로직 ---
        // 이 최상위 부대(attackerUnit)가 적을 탐지했는지 여부를 결정합니다.
        let detectedAnyEnemy = false;
        for (const combatSubUnit of attackerUnit.combatSubUnits) {
            if (detectedAnyEnemy) break; // 이미 탐지했으면 더 이상 하위 부대를 확인할 필요 없음

            for (const targetUnit of topLevelUnits) {
                if (targetUnit.team === attackerUnit.team || targetUnit.currentStrength <= 0) continue;
                if (targetUnit.combatSubUnits.length === 0) continue;

                for (const targetCombatSubUnit of targetUnit.combatSubUnits) {
                    const distance = Math.hypot(combatSubUnit.x - targetCombatSubUnit.x, combatSubUnit.y - targetCombatSubUnit.y);
                    if (distance < combatSubUnit.detectionRange) { // combatSubUnit의 인식 범위 사용
                        attackerUnit.isEnemyDetected = true; // 최상위 부대에 적 발견 상태 설정
                        detectedAnyEnemy = true;
                        break; // 이 전투 부대가 적을 탐지했으므로, 더 이상 적 전투 부대를 확인할 필요 없음
                    }
                }
                if (detectedAnyEnemy) break; // 이 최상위 부대가 적을 탐지했으므로, 더 이상 다른 최상위 적 부대를 확인할 필요 없음
            }
        }

        // 각 유닛의 '전투 부대'들이 개별적으로 적을 찾고 공격합니다.
        for (const combatSubUnit of attackerUnit.combatSubUnits) {
            let closestEnemySubUnit = null;
            let minDistance = combatSubUnit.engagementRange;

            // 다른 모든 유닛들을 순회하며 가장 가까운 적 '전투 부대'를 찾습니다.
            for (const targetUnit of topLevelUnits) {
                if (targetUnit.team === attackerUnit.team || targetUnit.currentStrength <= 0) continue;
                if (targetUnit.combatSubUnits.length === 0) continue;
                // 적의 '전투 부대' 중 가장 가까운 것을 찾습니다.
                const closestTargetSubUnit = targetUnit.getClosestCombatSubUnit(combatSubUnit.x, combatSubUnit.y);
                if (closestTargetSubUnit) {
                    const distance = Math.hypot(combatSubUnit.x - closestTargetSubUnit.x, combatSubUnit.y - closestTargetSubUnit.y);
    
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestEnemySubUnit = closestTargetSubUnit;
                    }
                }
            }

            // 사거리 내에 적을 찾았다면 공격합니다.
            if (closestEnemySubUnit) {
                const targetTopLevelUnit = closestEnemySubUnit.getTopLevelParent();

                // --- 새로운 피해 계산 로직 ---
                const attacker = combatSubUnit;
                const defender = targetTopLevelUnit;

                // 병력 피해(Strength Damage) 계산
                // - 장갑 관통 데미지: 대물 공격력이 장갑보다 높을 때 효과적
                const piercingDamage = Math.max(0, attacker.hardAttack - defender.totalArmor);
                // - 대인 데미지: 장갑에 의해 크게 감소
                const nonPiercingDamage = attacker.softAttack * Math.max(0.1, 1 - (defender.totalArmor / 10)); // 장갑 10이면 0% 데미지, 최소 10% 보장
                const strDamage = (piercingDamage + nonPiercingDamage) * 0.2; // 전체적인 병력 피해량 조절

                // 조직력 피해(Organization Damage) 계산
                // - 화력(firepower)에 기반하여 계산
                const orgDamage = attacker.firepower * 1.5; // 화력 기반 조직력 피해량 조절

                targetTopLevelUnit.takeDamage(orgDamage, strDamage, { x: combatSubUnit.x, y: combatSubUnit.y });

                // 공격자와 피격자 모두 전투 상태로 변경
                attackerUnit.isInCombat = true;
                targetTopLevelUnit.isInCombat = true;

                // 예광탄 효과를 생성합니다.
                attackerUnit.tracers.push({
                    from: combatSubUnit,
                    to: closestEnemySubUnit,
                    life: 0.5, // 0.5초 동안 표시
                });
            }
        }

        // --- 이동 로직 ---
        if (attackerUnit.destination) {
            attackerUnit.updateMovement(deltaTime);
            attackerUnit.updateCombatSubUnitPositions(); // 이동 시 하위 부대 진형 유지
        }

        // --- 조직력 회복 로직 ---
        if (!attackerUnit.isInCombat && attackerUnit.organization < attackerUnit.maxOrganization) {
            attackerUnit.organization = Math.min(attackerUnit.maxOrganization, attackerUnit.organization + attackerUnit.organizationRecoveryRate * deltaTime);
        }
    }

    // --- 부대 제거 로직 ---
    // 병력이 0이 된 부대를 배열에서 제거합니다.
    // 배열을 역순으로 순회해야 삭제 시 인덱스 문제가 발생하지 않습니다.
    for (let i = topLevelUnits.length - 1; i >= 0; i--) {
        const unit = topLevelUnits[i];
        if (unit.currentStrength <= 0) {
            // 파괴된 유닛이 선택된 유닛이라면, 선택을 해제합니다.
            if (selectedUnit === unit) {
                selectedUnit = null;
            }
            topLevelUnits.splice(i, 1);
        }
    }
}

function draw() {
    ctx.save();
    ctx.canvas.deltaTime = (performance.now() - lastTime) / 1000; // draw에서도 deltaTime 사용 가능하도록
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 잔상 문제를 해결하기 위해 캔버스 전체를 지웁니다.
    camera.applyTransform(ctx); // 카메라 변환 적용

    const tileSize = 50;
    const mapWidth = 20;
    const mapHeight = 20;

    ctx.fillStyle = '#ccc';
    ctx.strokeStyle = '#999';
    for (let y = 0; y < mapHeight; y++) {
        for (let x = 0; x < mapWidth; x++) {
            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
        }
    }

    // 모든 최상위 부대를 그립니다.
    for (const unit of topLevelUnits) {
        unit.draw(ctx);
    }

    ctx.restore();
}

function loop(currentTime) {
    update(currentTime);
    draw();
    requestAnimationFrame(loop);
}

// UI 초기화
gameUI = new GameUI(camera, topLevelUnits);
loop();
