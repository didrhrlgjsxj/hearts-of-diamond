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
        this.moveSpeed = 300; // 카메라 이동 속도 (픽셀/초)
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
        };
        this._addEventListeners();
    }

    /**
     * 카메라 제어를 위한 이벤트 리스너를 등록합니다.
     */
    _addEventListeners() {
        this.canvas.addEventListener('wheel', (e) => { // 'e' 이벤트 객체를 사용합니다.
            e.preventDefault();

            // 1. 줌 하기 전, 마우스 포인터의 월드 좌표를 기록합니다.
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const worldPosBeforeZoom = this.screenToWorld(mouseX, mouseY);

            // 2. 줌 레벨을 변경합니다.
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom *= zoomFactor;
            this.zoom = Math.max(0.5, Math.min(this.zoom, 5));

            // 3. 줌 한 후, 마우스 포인터가 여전히 같은 월드 좌표를 가리키도록 카메라 위치를 보정합니다.
            const worldPosAfterZoom = this.screenToWorld(mouseX, mouseY);
            this.x += worldPosBeforeZoom.x - worldPosAfterZoom.x;
            this.y += worldPosBeforeZoom.y - worldPosAfterZoom.y;
        });

        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) {
                this.keys[key] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) {
                this.keys[key] = false;
            }
        });
    }

    /**
     * 키 입력 상태에 따라 카메라를 이동시킵니다.
     * @param {number} deltaTime 프레임 간 시간 간격 (초)
     */
    update(deltaTime) {
        // 줌 레벨에 관계없이 화면 이동 속도를 일정하게 유지하기 위해
        // 이동 거리를 현재 줌 레벨로 나눕니다.
        const moveAmount = this.moveSpeed * deltaTime / this.zoom;
        
        if (this.keys.w) {
            this.y -= moveAmount;
        }
        if (this.keys.s) {
            this.y += moveAmount;
        }
        if (this.keys.a) {
            this.x -= moveAmount;
        }
        if (this.keys.d) {
            this.x += moveAmount;
        }
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

    /**
     * 월드 좌표를 화면 좌표로 변환합니다.
     * @param {number} worldX 월드 X 좌표
     * @param {number} worldY 월드 Y 좌표
     * @returns {{x: number, y: number}} 화면 좌표
     */
    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.x) * this.zoom,
            y: (worldY - this.y) * this.zoom,
        };
    }
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