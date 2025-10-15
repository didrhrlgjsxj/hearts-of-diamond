/**
 * 게임 월드를 비추는 카메라를 관리하는 클래스입니다.
 * 이동, 줌, 좌표 변환 기능을 담당합니다.
 */
export class Camera {
    /**
     * @param {HTMLCanvasElement} canvas 카메라가 상호작용할 캔버스 요소
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.edgeSize = 30; // 화면 가장자리 스크롤 감지 영역
        this.moveSpeed = 1000; // 카메라 이동 속도 (월드 유닛/초)
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
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = this.zoom * zoomFactor;
            // 줌 레벨을 최소 0.5, 최대 2.5로 제한합니다.
            this.zoom = Math.max(0.5, Math.min(newZoom, 2.5));
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
        // 월드 좌표 기준 이동량. 줌 레벨과 무관하게 동일한 속도로 이동합니다.
        const moveAmount = this.moveSpeed * deltaTime;
        
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
     * 화면 좌표를 월드 좌표로 변환합니다.
     * @param {number} screenX 화면 X 좌표
     * @param {number} screenY 화면 Y 좌표
     * @returns {{x: number, y: number}} 월드 좌표
     */
    screenToWorld(screenX, screenY) {
        return {
            x: screenX + this.x,
            y: screenY + this.y,
        };
    }
}