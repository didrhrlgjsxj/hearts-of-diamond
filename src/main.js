const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 게임 월드 설정 ---
let mapGrid; // 맵 데이터 관리 인스턴스
const topLevelUnits = []; // 최상위 부대들을 관리하는 배열
let selectedUnit = null;   // 현재 선택된 유닛
const camera = new Camera(canvas); // 카메라 인스턴스 생성

let mouseX = 0;
let mouseY = 0;
let lastTime = 0; // deltaTime 계산을 위한 마지막 시간

// 부대 고유 번호 생성을 위한 전역 카운터
const unitCounters = {
    'Division': 1,
    'Brigade': 1,
    'Regiment': 1,
    'Battalion': 1,
    'Company': 1,
};


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
    for (let i = topLevelUnits.length - 1; i >= 0; i--) {
        const unit = topLevelUnits[i];
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

    // 선택된 유닛이 변경되었으므로 UI를 업데이트합니다.
    gameUI.updateCompositionPanel(selectedUnit);
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // 오른쪽 클릭 메뉴가 뜨는 것을 방지

    if (selectedUnit) {
        const worldCoords = camera.screenToWorld(mouseX, mouseY);
        // Shift 키를 누르고 우클릭하면 후퇴, 아니면 일반 이동
        if (e.shiftKey) {
            selectedUnit.retreatTo(worldCoords.x, worldCoords.y);
        } else {
            selectedUnit.moveTo(worldCoords.x, worldCoords.y, topLevelUnits);
        }
    }
});

function update(currentTime) {
    if (!lastTime) {
        lastTime = currentTime;
    }
    const deltaTime = (currentTime - lastTime) / 1000; // 초 단위로 변환
    lastTime = currentTime;

    camera.update(deltaTime);
    
    // --- 유닛 로직 업데이트 ---
    // unitLogic.js에 위임하여 모든 유닛의 상태(전투, 이동, 조직력 등)를 업데이트합니다.
    updateUnits(topLevelUnits, deltaTime);

    // --- 파괴된 유닛 제거 ---
    const cleanupResult = cleanupDestroyedUnits(topLevelUnits, selectedUnit);
    // topLevelUnits 배열을 직접 수정하는 대신, 필터링된 새 배열을 할당합니다.
    // 이렇게 하면 참조 문제를 피하고 더 안전하게 상태를 관리할 수 있습니다.
    // topLevelUnits = cleanupResult.remainingUnits; // 이 방식은 전역 변수 참조 문제 발생 가능
    
    // 원래 배열의 내용을 변경하여 전역 참조를 유지합니다.
    topLevelUnits.length = 0;
    Array.prototype.push.apply(topLevelUnits, cleanupResult.remainingUnits);
    
    selectedUnit = cleanupResult.newSelectedUnit;

    // 선택된 유닛이 파괴되었다면 UI를 업데이트합니다.
    if (selectedUnit !== cleanupResult.newSelectedUnit) {
        gameUI.updateCompositionPanel(selectedUnit);
    }
}

function draw() {
    ctx.save();
    ctx.canvas.deltaTime = (performance.now() - lastTime) / 1000; // draw에서도 deltaTime 사용 가능하도록
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 잔상 문제를 해결하기 위해 캔버스 전체를 지웁니다.
    camera.applyTransform(ctx); // 카메라 변환 적용

    // --- 맵 렌더링 최적화 ---
    // 카메라에 보이는 영역의 타일만 그리도록 계산합니다.
    const view = camera.getViewport();
    const startCol = Math.floor(view.left / mapGrid.tileSize);
    const endCol = Math.ceil(view.right / mapGrid.tileSize);
    const startRow = Math.floor(view.top / mapGrid.tileSize);
    const endRow = Math.ceil(view.bottom / mapGrid.tileSize);

    for (let y = startRow; y < endRow; y++) {
        for (let x = startCol; x < endCol; x++) {
            if (x < 0 || x >= mapGrid.width || y < 0 || y >= mapGrid.height) continue;

            const tileX = x * mapGrid.tileSize;
            const tileY = y * mapGrid.tileSize;

            // 기본 타일 색상 설정
            ctx.fillStyle = '#ccc';
            ctx.strokeStyle = '#999';

            // 기본 타일 그리기
            ctx.fillRect(tileX, tileY, mapGrid.tileSize, mapGrid.tileSize);

            // 국가 영토 색상 칠하기
            const owner = mapGrid.grid[x][y];
            if (owner) {
                ctx.fillStyle = owner.color;
                ctx.fillRect(tileX, tileY, mapGrid.tileSize, mapGrid.tileSize);

                // 수도 타일인지 확인하고 별 아이콘 그리기
                if (owner.capital.x === x && owner.capital.y === y) {
                    drawStar(ctx, tileX + mapGrid.tileSize / 2, tileY + mapGrid.tileSize / 2, 5, 15, 7);
                }
            }

            // 타일 테두리 그리기
            ctx.strokeRect(x * mapGrid.tileSize, y * mapGrid.tileSize, mapGrid.tileSize, mapGrid.tileSize);
        }
    }

    // 모든 최상위 부대를 그립니다.
    for (const unit of topLevelUnits) {
        unit.draw(ctx);
    }

    ctx.restore();
}

/**
 * 카메라의 현재 뷰포트(보이는 영역)를 월드 좌표 기준으로 반환합니다.
 * @returns {{left: number, right: number, top: number, bottom: number}}
 */
Camera.prototype.getViewport = function() {
    const { width, height } = this.canvas;
    const left = this.x;
    const top = this.y;
    const right = this.x + width / this.zoom;
    const bottom = this.y + height / this.zoom;
    return { left, right, top, bottom };
};


/**
 * 지정된 위치에 별 모양을 그립니다.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} cx 별의 중심 X 좌표
 * @param {number} cy 별의 중심 Y 좌표
 * @param {number} spikes 별의 뾰족한 부분 개수
 * @param {number} outerRadius 바깥쪽 반지름
 * @param {number} innerRadius 안쪽 반지름
 */
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'gold';
    ctx.stroke();
    ctx.fillStyle = 'yellow';
    ctx.fill();
}

function loop(currentTime) {
    update(currentTime);
    draw();
    requestAnimationFrame(loop);
}

// 맵 초기화
mapGrid = new MapGrid();
// UI 초기화
gameUI = new GameUI(camera, topLevelUnits);
loop();
