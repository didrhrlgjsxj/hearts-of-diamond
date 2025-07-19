const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    ctx.restore();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
