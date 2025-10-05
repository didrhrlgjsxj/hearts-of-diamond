/**
 * 게임 월드를 비추는 카메라를 관리하는 클래스입니다.
 * 이동, 줌, 좌표 변환 기능을 담당합니다.
 */
class Camera {
    /**
     * @param {HTMLCanvasElement} canvas 카메라가 상호작용할 캔버스 요소
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.edgeSize = 30; // 화면 가장자리 스크롤 감지 영역
        this.moveSpeed = 5; // 카메라 이동 속도

        this._addEventListeners();
    }

    /**
     * 카메라 제어를 위한 이벤트 리스너를 등록합니다.
     */
    _addEventListeners() {
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom *= zoomFactor;
            // 줌 레벨을 최소 0.5, 최대 5로 제한합니다.
            this.zoom = Math.max(0.5, Math.min(this.zoom, 5));
        });
    }

    /**
     * 마우스 위치에 따라 카메라를 이동시킵니다 (화면 가장자리 스크롤).
     * @param {number} mouseX 현재 마우스의 X 좌표
     * @param {number} mouseY 현재 마우스의 Y 좌표
     */
    update(mouseX, mouseY) {
        if (mouseX < this.edgeSize) this.x -= this.moveSpeed / this.zoom;
        else if (mouseX > this.canvas.width - this.edgeSize) this.x += this.moveSpeed / this.zoom;

        if (mouseY < this.edgeSize) this.y -= this.moveSpeed / this.zoom;
        else if (mouseY > this.canvas.height - this.edgeSize) this.y += this.moveSpeed / this.zoom;
    }

    /**
     * 캔버스 컨텍스트에 카메라의 변환(이동, 줌)을 적용합니다.
     * @param {CanvasRenderingContext2D} ctx
     */
    applyTransform(ctx) {
        ctx.translate(-this.x * this.zoom, -this.y * this.zoom);
        ctx.scale(this.zoom, this.zoom);
    }

    /**
     * 화면 좌표를 월드 좌표로 변환합니다.
     * @param {number} screenX 화면 X 좌표
     * @param {number} screenY 화면 Y 좌표
     * @returns {{x: number, y: number}} 월드 좌표
     */
    screenToWorld(screenX, screenY) {
        return {
            x: (screenX / this.zoom) + this.x,
            y: (screenY / this.zoom) + this.y,
        };
    }
}