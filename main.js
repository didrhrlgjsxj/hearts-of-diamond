const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 게임 월드 설정 ---
const topLevelUnits = []; // 최상위 부대들을 관리하는 배열
let selectedUnit = null;   // 현재 선택된 유닛
const camera = new Camera(canvas); // 카메라 인스턴스 생성

let mouseX = 0;
let mouseY = 0;
let lastTime = 0; // deltaTime 계산을 위한 마지막 시간


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
    topLevelUnits.forEach(unit => unit.isInCombat = false);

    // 각 유닛이 범위 내의 적을 찾아 공격합니다.
    for (const unit of topLevelUnits) {
        // 병력이 0 이하면 행동 불가
        // 시각 효과는 계속 업데이트
        unit.updateVisuals(deltaTime);

        if (unit.currentStrength <= 0) continue;

        const enemy = unit.findEnemyInRange(topLevelUnits);
        if (enemy) {
            unit.attack(enemy);
            enemy.isInCombat = true; // 공격받는 대상도 전투 상태로 변경
        }

        // --- 이동 로직 ---
        if (unit.destination) {
            unit.updateMovement(deltaTime);
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
new GameUI(camera, topLevelUnits);
loop();
