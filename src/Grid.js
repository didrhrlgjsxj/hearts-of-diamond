// Grid.js

class Grid {
    constructor(cellSize, width, height) {
        this.cellSize = cellSize; // 셀 크기 설정
        // 전체 그리드 영역을 맵 전체 크기로 설정
        this.gridWidth = Math.ceil(width / this.cellSize);
        this.gridHeight = Math.ceil(height / this.cellSize);

        // 그리드를 한 번만 그려 두기 위한 오프스크린 캔버스 생성
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.gridWidth * this.cellSize;
        this.canvas.height = this.gridHeight * this.cellSize;
        const gctx = this.canvas.getContext('2d');
        gctx.strokeStyle = 'green';
        gctx.lineWidth = 1;
        gctx.beginPath();
        for (let x = 0; x <= this.gridWidth; x++) {
            gctx.moveTo(x * this.cellSize, 0);
            gctx.lineTo(x * this.cellSize, this.canvas.height);
        }
        for (let y = 0; y <= this.gridHeight; y++) {
            gctx.moveTo(0, y * this.cellSize);
            gctx.lineTo(this.canvas.width, y * this.cellSize);
        }
        gctx.stroke();
    }

    snap(x, y) {
        const sx = Math.round(x / this.cellSize) * this.cellSize;
        const sy = Math.round(y / this.cellSize) * this.cellSize;
        return { x: sx, y: sy };
    }

    draw(ctx) {
        ctx.drawImage(this.canvas, 0, 0);
    }

    // 주변 엔티티 찾기 (예시로만 구현)
    static getNearbyEntities(x, y) {
        // 실제 구현 시, 그리드 내에 있는 객체들을 반환하도록 구현
        return [];
    }
}

export default Grid;
