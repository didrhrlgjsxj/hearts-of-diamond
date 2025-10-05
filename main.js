const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 게임 월드 설정 ---
const topLevelUnits = []; // 최상위 부대들을 관리하는 배열
let selectedUnit = null;   // 현재 선택된 유닛
const camera = new Camera(canvas); // 카메라 인스턴스 생성

// --- 유닛 생성 및 추가 ---
// 블루팀 군단 생성
const blueCorps = new Corps("I Corps", 400, 300, 'blue');
topLevelUnits.push(blueCorps);

// 레드팀 군단 생성
const redCorps = new Corps("II Corps", 600, 500, 'red');
topLevelUnits.push(redCorps);

// --- 증강 예시 ---
// 첫 번째 사단의 첫 번째 여단 증강
blueCorps.subUnits[0].subUnits[0].reinforce(3);
// 두 번째 사단의 두 번째 여단 증강
blueCorps.subUnits[1].subUnits[1].reinforce(2);

let mouseX = 0;
let mouseY = 0;

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

function update() {
    camera.update(mouseX, mouseY);
}

function draw() {
    ctx.save();
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

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
