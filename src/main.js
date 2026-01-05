const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const mapCanvas = document.getElementById('mapCanvas');
const mapCtx = mapCanvas.getContext('2d');

const unitCanvas = document.getElementById('unitCanvas');
const unitCtx = unitCanvas.getContext('2d');

// --- 게임 월드 설정 ---
let mapGrid; // 맵 데이터 관리 인스턴스
const nations = new Map(); // 국가 인스턴스 관리
let unitManager; // 유닛 관리자 인스턴스
const camera = new Camera(canvas); // 카메라 인스턴스 생성

// --- 게임 시간 및 생산 주기 설정 ---
const GAME_SPEED_MULTIPLIERS = {
    1: 0.5, // 1배속 (느리게)
    2: 1.0, // 2배속 (기본 속도)
    3: 2.0, // 3배속 (빠르게)
    4: 4.0, // 4배속 (매우 빠르게)
};
let gameSpeed = 2; // 기본 게임 속도: 2배속
const PRODUCTION_TICKS = 3; // 생산 계산을 분산할 주기(틱)의 수
let lastHour = -1; // 마지막으로 생산이 처리된 시간
let gameTime = {
    totalHours: 0,
    timeAccumulator: 0, // 시간 경과를 누적하는 변수
};

let mouseX = 0;
let mouseY = 0;
let lastTime = 0; // deltaTime 계산을 위한 마지막 시간

// --- 시간 표시 UI 요소 ---
const timeDisplay = document.createElement('div');
timeDisplay.id = 'time-display';
const timeText = document.createElement('span'); // 시간 텍스트만 담을 요소
timeText.id = 'time-text';

// UI 인스턴스를 저장할 변수 및 초기화
let gameUI;
let selectedProvince = null; // 현재 선택된 프로빈스를 저장할 변수

let lastCameraState = { x: 0, y: 0, zoom: 1, width: 0, height: 0 }; // 맵 재그리기 판단용
let gridPattern = null; // 그리드 패턴 캐싱용

// 드래그 이동 명령을 위한 변수
let isRightDragging = false;
let rightDragStart = null; // {x, y} 월드 좌표
let currentMouseWorld = { x: 0, y: 0 }; // 드래그 중 현재 마우스 월드 좌표


/**
 * 게임 속도를 설정합니다.
 * @param {number} speed - 1, 2, 3, 4 중 하나의 값
 */
function setGameSpeed(speed) {
    gameSpeed = speed;
}

// --- 초기 국가 설정 ---
function initializeNations() {
    // 맵 좌상단 (0,0) 타일이 속한 프로빈스를 블루팀의 수도로 설정합니다.
    const blueCapitalProvinceId = mapGrid.provinceManager.provinceGrid[0][0];
    const blueNation = new Nation('blue', "블루 공화국", 'rgba(0, 128, 255, 0.3)', blueCapitalProvinceId);
    blueNation.type = 'PLAYER';
    mapGrid.setProvinceOwner(blueCapitalProvinceId, blueNation);

    const redCapitalProvinceId = mapGrid.provinceManager.provinceGrid[15][15];
    const redNation = new Nation('red', "레드 왕국", 'rgba(255, 0, 0, 0.3)', redCapitalProvinceId);
    redNation.type = 'AI';
    mapGrid.setProvinceOwner(redCapitalProvinceId, redNation);

    // 널 상태의 국가 (중립/무정부)
    const nullNation = new Nation('neutral', "중립 지대", 'rgba(128, 128, 128, 0.1)');
    nullNation.type = 'NONE';
    nations.set('neutral', nullNation);

    // 외교 관계 설정 (서로 전쟁 상태)
    blueNation.setRelation('red', 'WAR');
    redNation.setRelation('blue', 'WAR');

    nations.set('blue', blueNation);
    nations.set('red', redNation);
}

/**
 * 게임의 모든 요소를 초기화하는 메인 함수입니다.
 */
async function initializeGame() {
    // 1. 맵 초기화
    mapGrid = new MapGrid();

    // 2. 국가 초기화
    initializeNations();

    // 3. 부대 템플릿 JSON 데이터 로드 (가장 중요)
    await loadUnitTemplates();

    // 4. 유닛 관리자 초기화
    unitManager = new UnitManager();

    // 5. UI 초기화 (템플릿 및 유닛 관리자 로드 후)
    gameUI = new GameUI(camera, nations, unitManager);
    document.body.appendChild(timeDisplay);
    timeDisplay.appendChild(timeText);
    gameUI.createTimeControls(); // 시간 제어 UI 생성

    // 6. 게임 루프 시작
    requestAnimationFrame(loop);
}

// --- 게임 시작 ---
initializeGame();
// -----------------


function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    mapCanvas.width = window.innerWidth;
    mapCanvas.height = window.innerHeight;
    unitCanvas.width = window.innerWidth;
    unitCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    currentMouseWorld = camera.screenToWorld(mouseX, mouseY); // 마우스 월드 좌표 갱신
});

canvas.addEventListener('click', (e) => {
    // 마우스 클릭 위치를 월드 좌표로 변환
    const worldCoords = camera.screenToWorld(mouseX, mouseY);

    // 1. 유닛 선택 시도
    const newSelectedUnit = unitManager.selectUnitAt(worldCoords.x, worldCoords.y);

    if (newSelectedUnit) {
        // 유닛이 선택되면, 유닛 정보 UI를 업데이트하고 프로빈스 정보 UI는 숨깁니다.
        gameUI.updateCompositionPanel(newSelectedUnit);
        gameUI.updateStatsPanel(newSelectedUnit);
        gameUI.updateProvinceInfoPanel(null);
        selectedProvince = null; // 유닛 선택 시 프로빈스 선택 해제
    } else {
        // 유닛이 선택되지 않으면, 프로빈스 정보를 표시합니다. (Hexagon)
        const hex = pixelToHex(worldCoords.x, worldCoords.y);
        const provinceId = mapGrid.provinceManager.provinceGrid[hex.col]?.[hex.row];
        const clickedProvince = mapGrid.provinceManager.provinces.get(provinceId);

        // 이미 선택된 프로빈스를 다시 클릭하면 선택 해제합니다.
        if (selectedProvince && clickedProvince && selectedProvince.id === clickedProvince.id) {
            selectedProvince = null;
            gameUI.updateProvinceInfoPanel(null);
        } else {
            // 새로운 프로빈스를 선택합니다.
            selectedProvince = clickedProvince;
            gameUI.updateProvinceInfoPanel(clickedProvince);
        }
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) { // 우클릭
        const worldCoords = camera.screenToWorld(mouseX, mouseY);
        // 유닛이 선택된 상태일 때만 드래그 로직 시작
        if (unitManager.selectedUnit) {
            isRightDragging = true;
            rightDragStart = worldCoords;
        }
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (e.button === 2 && isRightDragging) { // 우클릭 해제
        const worldCoords = camera.screenToWorld(mouseX, mouseY);
        const dx = worldCoords.x - rightDragStart.x;
        const dy = worldCoords.y - rightDragStart.y;
        const dist = Math.hypot(dx, dy);
        
        let targetDirection = null;
        if (dist > 20) { // 일정 거리 이상 드래그했을 때만 방향 설정
            targetDirection = Math.atan2(dy, dx);
        }

        // 드래그 시작 지점으로 이동 명령 (클릭 지점이 이동 목표, 드래그는 방향 지시)
        unitManager.orderSelectedUnitTo(rightDragStart.x, rightDragStart.y, e.shiftKey, targetDirection);
        
        isRightDragging = false;
        rightDragStart = null;
    }
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // 오른쪽 클릭 메뉴가 뜨는 것을 방지
});

function update(currentTime) {
    if (!lastTime) {
        lastTime = currentTime;
    }
    const deltaTime = (currentTime - lastTime) / 1000; // 초 단위로 변환
    lastTime = currentTime;

    // 게임 속도에 따라 조정된 deltaTime을 계산합니다.
    const gameSpeedMultiplier = GAME_SPEED_MULTIPLIERS[gameSpeed];
    const scaledDeltaTime = deltaTime * gameSpeedMultiplier;

    // --- 게임 시간 업데이트 ---
    gameTime.timeAccumulator += scaledDeltaTime;
    gameTime.totalHours = Math.floor(gameTime.timeAccumulator);

    // 매 게임 시간(hour)이 바뀔 때마다 생산 및 경제 업데이트를 처리합니다.
    if (gameTime.totalHours > lastHour) {
        const hoursPassed = gameTime.totalHours - lastHour;

        // --- 일간 업데이트 (자정마다) ---
        if (Math.floor(lastHour / 24) < Math.floor(gameTime.totalHours / 24)) {
            nations.forEach((nation) => {
                nation.economy.updateDailyEconomy();
                nation.updateDailyAI();
            });
        }

        // --- 시간당 생산 업데이트 ---
        nations.forEach((nation) => {
            const currentTick = gameTime.totalHours % PRODUCTION_TICKS;
            nation.economy.updateHourlyProduction(currentTick, hoursPassed);
        });
        lastHour = gameTime.totalHours;
    }

    camera.update(deltaTime);
    
    // --- 유닛 로직 업데이트 ---
    unitManager.update(scaledDeltaTime);

    // 전투 중계 UI 업데이트
    gameUI.updateBattlePanel(unitManager.broadcastedBattle);
    
    gameUI.updateProductionPanel();

    // 선택된 유닛이 파괴되었다면 UI를 업데이트합니다.
    if (gameUI.selectedUnit !== unitManager.selectedUnit) {
        gameUI.updateCompositionPanel(unitManager.selectedUnit);
    }
}

function draw() {
    ctx.save();
    mapCtx.save();

    ctx.canvas.deltaTime = (performance.now() - lastTime) / 1000; // draw에서도 deltaTime 사용 가능하도록
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 잔상 문제를 해결하기 위해 캔버스 전체를 지웁니다.
    camera.applyTransform(ctx); // 카메라 변환 적용

    // --- 맵 렌더링 최적화 (레이어링) ---
    // 카메라 상태가 변경되었을 때만 맵 캔버스를 다시 그립니다.
    const currentCameraState = { x: camera.x, y: camera.y, zoom: camera.zoom, width: canvas.width, height: canvas.height };
    const cameraChanged = JSON.stringify(currentCameraState) !== JSON.stringify(lastCameraState);

    if (cameraChanged) {
        drawMapLayer();
        lastCameraState = currentCameraState;
    }

    // --- 시간 UI 업데이트 ---
    const days = Math.floor(gameTime.totalHours / 24);
    timeText.textContent = `Day ${days + 1}, ${gameTime.totalHours % 24}:00`;

    // --- 선택된 프로빈스 강조 및 동적 요소 그리기 ---
    // 맵 타일은 mapCanvas에 그려지지만, 선택 효과(깜빡임)는 gameCanvas에 매 프레임 그립니다.
    const view = camera.getViewport();
    
    /* 맵 타일 그리기 로직은 drawMapLayer로 이동됨 */
    
    // --- 프로빈스 ID 번호 그리기 (디버깅용) ---
    // ID 텍스트는 맵과 함께 움직이므로 mapCanvas에 그릴 수도 있지만, 
    // 디버깅 정보는 보통 최상위에 그리는 것이 좋으므로 gameCanvas에 유지합니다.
    /* (생략 가능: 성능을 위해 주석 처리하거나 필요시 유지) */
    /*
    mapGrid.provinceManager.provinces.forEach(province => {
        // ... 기존 ID 그리기 로직 ...
    });
    */

    // --- 선택된 프로빈스 강조 표시 ---
    if (selectedProvince) {
        // 시간에 따라 투명도가 0.3 ~ 1.0 사이에서 부드럽게 변하도록 설정
        const blinkAlpha = (Math.sin(Date.now() / 150) + 1) / 2 * 0.7 + 0.3;
        ctx.strokeStyle = `rgba(255, 255, 0, ${blinkAlpha})`; // 깜빡이는 노란색
        ctx.lineWidth = 4; // 강조를 위해 두꺼운 선 사용
        ctx.lineJoin = 'round';

        // 선택된 프로빈스의 모든 타일을 순회하며 외곽선을 그립니다.
        // Hexagon grid optimization: calculate visible range in hex coords
        // Approximate range
        const startCol = Math.floor(view.left / HEX_WIDTH) - 1;
        const endCol = Math.ceil(view.right / HEX_WIDTH) + 1;
        const startRow = Math.floor(view.top / HEX_VERT_SPACING) - 1;
        const endRow = Math.ceil(view.bottom / HEX_VERT_SPACING) + 1;

        selectedProvince.tiles.forEach(tile => {
            // tile.x is col, tile.y is row
            // 화면 밖 타일은 그리지 않습니다.
            if (tile.x < startCol || tile.x > endCol || tile.y < startRow || tile.y > endRow) return;

            const center = hexToPixel(tile.x, tile.y);
            const neighbors = getHexNeighbors(tile.x, tile.y);

            // Check all 6 neighbors
            // If neighbor is different province, draw the shared edge
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const n = neighbors[i];
                // Check boundary or different province
                if (n.col < 0 || n.col >= mapGrid.width || n.row < 0 || n.row >= mapGrid.height ||
                    mapGrid.provinceManager.provinceGrid[n.col][n.row] !== selectedProvince.id) {
                    
                    // Draw edge i
                    // Edge i connects corner i and corner (i+1)%6
                    const c1 = getHexCorner(center, i);
                    const c2 = getHexCorner(center, (i + 1) % 6);
                    ctx.moveTo(c1.x, c1.y);
                    ctx.lineTo(c2.x, c2.y);
                }
            }
            ctx.stroke();
        });
    }


    // --- 점령 진행 상황 시각화 ---
    const CAPTURE_TIME = 24; // unitManager.js에 정의된 점령 시간과 동일한 값
    unitManager.captureProgress.forEach((capture, provinceId) => {
        const province = mapGrid.provinceManager.provinces.get(provinceId);
        if (!province) return;

        // province.center is already in pixel coordinates for hex grid
        const centerX = province.center.x;
        const centerY = province.center.y;

        // 프로빈스 중심이 화면에 보일 때만 그립니다.
        if (centerX > view.left && centerX < view.right && centerY > view.top && centerY < view.bottom) {
            const progressRatio = Math.min(1, capture.progress / CAPTURE_TIME);
            const radius = 15;

            // 원형 프로그레스 바 (파이 차트) 그리기
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            // -90도(위쪽)에서 시작하여 진행도만큼 호를 그립니다.
            ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + progressRatio * 2 * Math.PI);
            ctx.closePath();

            // 점령 중인 국가의 색상으로 채웁니다 (더 진하게).
            ctx.fillStyle = capture.nation.color.replace('0.3', '0.7');
            ctx.fill();
        }
    });

    // 유닛 렌더링 (별도 캔버스 사용 및 스로틀링 적용)
    unitManager.draw(unitCtx, camera);

    // --- 이동 명령 드래그 화살표 그리기 ---
    if (isRightDragging && rightDragStart && unitManager.selectedUnit) {
        const screenStart = camera.worldToScreen(rightDragStart.x, rightDragStart.y);
        const screenEnd = camera.worldToScreen(currentMouseWorld.x, currentMouseWorld.y);
        
        ctx.save();
        // 중요: 화살표는 스크린 좌표계로 계산되었으므로, 
        // 현재 적용된 카메라 변환(월드 좌표계)을 잠시 초기화하고 그려야 합니다.
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        ctx.beginPath();
        ctx.moveTo(screenStart.x, screenStart.y);
        ctx.lineTo(screenEnd.x, screenEnd.y);
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        
        // 화살표 머리
        const angle = Math.atan2(screenEnd.y - screenStart.y, screenEnd.x - screenStart.x);
        const headLen = 10;
        ctx.beginPath();
        ctx.moveTo(screenEnd.x, screenEnd.y);
        ctx.lineTo(screenEnd.x - headLen * Math.cos(angle - Math.PI / 6), screenEnd.y - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(screenEnd.x - headLen * Math.cos(angle + Math.PI / 6), screenEnd.y - headLen * Math.sin(angle + Math.PI / 6));
        ctx.lineTo(screenEnd.x, screenEnd.y);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.fill();
        ctx.restore();
    }

    ctx.restore();
    mapCtx.restore();
}

/**
 * 맵(타일, 국경)을 mapCanvas에 그립니다.
 * 이 함수는 카메라가 이동할 때만 호출됩니다.
 */
function drawMapLayer() {
    mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
    mapCtx.save();
    camera.applyTransform(mapCtx);

    const view = camera.getViewport();
    const startCol = Math.floor(view.left / HEX_WIDTH) - 1;
    const endCol = Math.ceil(view.right / HEX_WIDTH) + 1;
    const startRow = Math.floor(view.top / HEX_VERT_SPACING) - 1;
    const endRow = Math.ceil(view.bottom / HEX_VERT_SPACING) + 1;

    // --- 1. 배경 및 그리드 일괄 그리기 (최적화) ---
    const mapPixelWidth = mapGrid.width * HEX_WIDTH;
    const mapPixelHeight = mapGrid.height * HEX_VERT_SPACING;
    
    const drawStartX = Math.max(0, view.left);
    const drawStartY = Math.max(0, view.top);
    const drawEndX = Math.min(mapPixelWidth, view.right);
    const drawEndY = Math.min(mapPixelHeight, view.bottom);

    // 기본 배경색 한 번에 채우기
    mapCtx.fillStyle = '#ccc';
    mapCtx.fillRect(drawStartX, drawStartY, drawEndX - drawStartX, drawEndY - drawStartY);

    // Hex grid lines are drawn per hex below, pattern is harder for hexes

    // --- 2. 프로빈스별 정보 그리기 (색상, 국경) ---
    mapCtx.lineWidth = 1;
    mapCtx.strokeStyle = 'rgba(0,0,0,0.05)'; // 아주 옅은 그리드 선 (거의 안 보이게)

    for (let y = startRow; y < endRow; y++) {
        for (let x = startCol; x < endCol; x++) {
            if (x < 0 || x >= mapGrid.width || y < 0 || y >= mapGrid.height) continue;

            const center = hexToPixel(x, y);
            const provinceId = mapGrid.provinceManager.provinceGrid[x][y];
            const province = mapGrid.provinceManager.provinces.get(provinceId);

            // Draw Hexagon Path
            mapCtx.beginPath();
            for (let i = 0; i < 6; i++) {
                const corner = getHexCorner(center, i);
                if (i === 0) mapCtx.moveTo(corner.x, corner.y);
                else mapCtx.lineTo(corner.x, corner.y);
            }
            mapCtx.closePath();

            // 국가 영토 색상 칠하기
            if (province && province.owner) {
                mapCtx.fillStyle = province.owner.color;
                mapCtx.fill();

                // 수도 타일인지 확인하고 별 아이콘 그리기
                if (province.owner.capitalProvinceId === provinceId) {
                    // Use province center (pixel coords)
                    drawStar(mapCtx, province.center.x, province.center.y, 5, 15, 7, province.owner.color.replace('0.3', '1.0'));
                }
            }

            // 타일 내부 그리드 선 그리기
            mapCtx.stroke();

            // Draw Province Borders (Thicker lines)
            // Check neighbors to draw borders
            const neighbors = getHexNeighbors(x, y);
            mapCtx.lineWidth = 2.5; // 외곽선을 더 두껍게
            mapCtx.strokeStyle = 'black';
            mapCtx.beginPath();
            for (let i = 0; i < 6; i++) {
                const n = neighbors[i];
                // If neighbor is out of bounds or different province
                if (n.col < 0 || n.col >= mapGrid.width || n.row < 0 || n.row >= mapGrid.height ||
                    mapGrid.provinceManager.provinceGrid[n.col][n.row] !== provinceId) {
                    const c1 = getHexCorner(center, i);
                    const c2 = getHexCorner(center, (i + 1) % 6);
                    mapCtx.moveTo(c1.x, c1.y);
                    mapCtx.lineTo(c2.x, c2.y);
                }
            }
            mapCtx.stroke();
            
            // Reset for next hex fill/grid
            mapCtx.lineWidth = 1;
            mapCtx.strokeStyle = 'rgba(0,0,0,0.05)';
        }
    }
    mapCtx.restore();
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
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color = 'yellow') {
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
    ctx.fillStyle = color;
    ctx.fill();
}

function loop(currentTime) {
    update(currentTime);
    draw();
    requestAnimationFrame(loop);
}
