// Grid.js

class Grid {
    constructor(cellSize, width, height) {
        this.cellSize = cellSize;
        this.width = width;
        this.height = height;
    }

    snap(x, y) {
        const sx = Math.round(x / this.cellSize) * this.cellSize;
        const sy = Math.round(y / this.cellSize) * this.cellSize;
        return { x: sx, y: sy };
    }

    /**
     * 카메라에 보이는 영역의 그리드만 동적으로 그립니다.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {LayerManager} layerManager 
     */
    draw(ctx, layerManager) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.lineWidth = 1 / layerManager.finalScale; // 최종 스케일에 따라 선 두께 조절

        // 카메라 뷰포트 계산
        const view = {
            x: layerManager.camera.x,
            y: layerManager.camera.y,
            w: layerManager.canvas.width / layerManager.finalScale,
            h: layerManager.canvas.height / layerManager.finalScale,
        };

        const startX = Math.floor(view.x / this.cellSize) * this.cellSize;
        const endX = Math.ceil((view.x + view.w) / this.cellSize) * this.cellSize;
        const startY = Math.floor(view.y / this.cellSize) * this.cellSize;
        const endY = Math.ceil((view.y + view.h) / this.cellSize) * this.cellSize;

        ctx.beginPath();
        for (let x = startX; x < endX; x += this.cellSize) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }
        for (let y = startY; y < endY; y += this.cellSize) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }
        ctx.stroke();
        ctx.restore();
    }

    // 주변 엔티티 찾기 (예시로만 구현)
    static getNearbyEntities(x, y) {
        // 실제 구현 시, 그리드 내에 있는 객체들을 반환하도록 구현
        return [];
    }
}

export default Grid;
