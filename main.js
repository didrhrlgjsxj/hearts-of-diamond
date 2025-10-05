const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- 유닛 생성 예시 ---
// 최상위 부대인 군단을 생성합니다.
const firstCorps = new Corps("I Corps", 400, 400);

// 군단 아래에 사단들을 추가합니다.
const firstDivision = new Division("1st Division", 300, 300);
const secondDivision = new Division("2nd Division", 500, 500);
firstCorps.addUnit(firstDivision);
firstCorps.addUnit(secondDivision);

// 1사단 아래에 여단을 추가합니다.
const firstBrigade = new Brigade("1st Brigade", 250, 250);
firstDivision.addUnit(firstBrigade);

// 1여단을 3레벨 증강합니다.
// 기본 인원 972 + (972 * 1/6 * 3) = 972 + 486 = 1458
firstBrigade.reinforce(3);

let mouseX = 0;
let mouseY = 0;
let camera = { x: 0, y: 0, zoom: 1 };
const edgeSize = 30; // pixels from edge to start moving
const moveSpeed = 5; // camera move speed

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    camera.zoom *= zoomFactor;
    camera.zoom = Math.max(0.5, Math.min(camera.zoom, 5));
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

function update() {
    if (mouseX < edgeSize) {
        camera.x -= moveSpeed / camera.zoom;
    } else if (mouseX > canvas.width - edgeSize) {
        camera.x += moveSpeed / camera.zoom;
    }
    if (mouseY < edgeSize) {
        camera.y -= moveSpeed / camera.zoom;
    } else if (mouseY > canvas.height - edgeSize) {
        camera.y += moveSpeed / camera.zoom;
    }
}

function draw() {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 잔상 문제를 해결하기 위해 캔버스 전체를 지웁니다.
    ctx.translate(-camera.x * camera.zoom, -camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);

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

    // 생성된 최상위 부대를 그립니다. 하위 부대들도 재귀적으로 그려집니다.
    firstCorps.draw(ctx);

    ctx.restore();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
