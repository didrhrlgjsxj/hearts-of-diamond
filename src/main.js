const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
    mapGrid.setProvinceOwner(blueCapitalProvinceId, blueNation);

    const redCapitalProvinceId = mapGrid.provinceManager.provinceGrid[15][15];
    const redNation = new Nation('red', "레드 왕국", 'rgba(255, 0, 0, 0.3)', redCapitalProvinceId);
    mapGrid.setProvinceOwner(redCapitalProvinceId, redNation);

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
    const newSelectedUnit = unitManager.selectUnitAt(worldCoords.x, worldCoords.y);

    // 선택된 유닛이 변경되었으므로 UI를 업데이트합니다.
    gameUI.updateCompositionPanel(newSelectedUnit);
    gameUI.updateStatsPanel(newSelectedUnit);
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // 오른쪽 클릭 메뉴가 뜨는 것을 방지

    const worldCoords = camera.screenToWorld(mouseX, mouseY);
    unitManager.orderSelectedUnitTo(worldCoords.x, worldCoords.y, e.shiftKey);
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
    ctx.canvas.deltaTime = (performance.now() - lastTime) / 1000; // draw에서도 deltaTime 사용 가능하도록
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 잔상 문제를 해결하기 위해 캔버스 전체를 지웁니다.
    camera.applyTransform(ctx); // 카메라 변환 적용

    // --- 시간 UI 업데이트 ---
    const days = Math.floor(gameTime.totalHours / 24);
    timeText.textContent = `Day ${days + 1}, ${gameTime.totalHours % 24}:00`;

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

            const provinceId = mapGrid.provinceManager.provinceGrid[x][y];
            const province = mapGrid.provinceManager.provinces.get(provinceId);

            // 국가 영토 색상 칠하기
            if (province && province.owner) {
                ctx.fillStyle = province.owner.color;
                ctx.fillRect(tileX, tileY, mapGrid.tileSize, mapGrid.tileSize);

                // 수도 타일인지 확인하고 별 아이콘 그리기
                if (province.owner.capitalProvinceId === provinceId) {
                    const centerX = province.center.x * mapGrid.tileSize + mapGrid.tileSize / 2;
                    const centerY = province.center.y * mapGrid.tileSize + mapGrid.tileSize / 2;
                    drawStar(ctx, centerX, centerY, 5, 15, 7, province.owner.color.replace('0.3', '1.0'));
                }
            }

            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;

            // 위쪽 타일과 프로빈스가 다른 경우, 위쪽 경계선을 굵게 그립니다.
            if (y === 0 || mapGrid.provinceManager.provinceGrid[x][y-1] !== provinceId) {
                ctx.beginPath();
                ctx.moveTo(tileX, tileY);
                ctx.lineTo(tileX + mapGrid.tileSize, tileY);
                ctx.stroke();
            }
            // 왼쪽 타일과 프로빈스가 다른 경우, 왼쪽 경계선을 굵게 그립니다.
            if (x === 0 || mapGrid.provinceManager.provinceGrid[x-1][y] !== provinceId) {
                ctx.beginPath();
                ctx.moveTo(tileX, tileY);
                ctx.lineTo(tileX, tileY + mapGrid.tileSize);
                ctx.stroke();
            }
        }
    }

    // --- 프로빈스 ID 번호 그리기 (디버깅용) ---
    // 모든 프로빈스를 순회하며, 중심점이 화면에 보이는 프로빈스의 ID만 그립니다.
    mapGrid.provinceManager.provinces.forEach(province => {
        const centerX = province.center.x * mapGrid.tileSize + mapGrid.tileSize / 2;
        const centerY = province.center.y * mapGrid.tileSize + mapGrid.tileSize / 2;
        // 월드 좌표인 프로빈스 중심이 화면에 보이는지 확인합니다.
        if (centerX > view.left && centerX < view.right && centerY > view.top && centerY < view.bottom) {
            ctx.fillStyle = 'black';
            ctx.font = '14px sans-serif';
            ctx.fillText(province.id, centerX, centerY);
        }
    });

    // 모든 최상위 부대를 그립니다.
    unitManager.draw(ctx);

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
