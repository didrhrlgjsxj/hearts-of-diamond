/**
 * 게임 월드를 비추는 카메라를 관리하는 클래스입니다.
 * 이동, 줌, 좌표 변환 기능을 담당합니다.
 */
export class Camera {
    /**
     * @param {HTMLCanvasElement} canvas 카메라가 상호작용할 캔버스 요소
     */
    constructor(canvas) {
        this.layerManager = null; // LayerManager 참조를 저장할 속성
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
     * LayerManager에 대한 참조를 설정하고 이벤트 리스너를 등록합니다.
     * @param {LayerManager} layerManager
     */
    initialize(layerManager) {
        this.layerManager = layerManager;
        this._addEventListeners();
    }

    /**
     * 카메라 제어를 위한 이벤트 리스너를 등록합니다.
     */
    _addEventListeners() {
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (!this.layerManager) return;

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // 1. 줌 하기 전 월드 좌표 기록
            const worldPosBeforeZoom = this.layerManager.screenToWorld(mouseX, mouseY);

            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = this.zoom * zoomFactor;
            // 줌 레벨을 최소 0.2, 최대 4.0으로 확장하여 더 넓은 범위의 줌을 지원합니다.
            this.zoom = Math.max(0.2, Math.min(newZoom, 4.0));

            // 2. LayerManager의 finalScale을 즉시 업데이트
            this.layerManager.update();

            // 3. 줌 한 후 월드 좌표 기록
            const worldPosAfterZoom = this.layerManager.screenToWorld(mouseX, mouseY);

            // 4. 월드 좌표 차이만큼 카메라 위치 보정
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
        let moveAmount = this.moveSpeed * deltaTime;

        // 3단계 전술 뷰에서는 좌표계가 확대되므로, 카메라 이동 속도를 보정합니다.
        if (this.layerManager && this.layerManager.currentRenderLayer === 3) {
            // LayerManager에 정의된 TACTICAL_SPACE_SCALE 값으로 나눕니다.
            const TACTICAL_SPACE_SCALE = 20.0; 
            moveAmount /= TACTICAL_SPACE_SCALE;
        }
        
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