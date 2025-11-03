import Nemo from './Nemos/Nemo.js';
import { Squad } from './Nemos/NemoSquadManager.js';
import { CommandUnit } from './Armies/unitEchelons.js';

const ZOOM_THRESHOLDS = { // 카메라의 zoom 값 기준
    LEVEL_2: 0.8,
    LEVEL_3: 1.5,
};

const LAYER_SCALES = { // 각 레이어별 실제 렌더링 배율
    1: 0.4,  // 1단계 (전략 뷰): 부대 아이콘 위주
    2: 0.8,  // 2단계 (작전 뷰): 대대/중대 아이콘 위주
    3: 1.0,  // 3단계 (전술 뷰): 네모 객체 위주 (이 값은 이제 최종 배율에 직접 사용되지 않음)
};

// 전술 뷰(레이어 3)로 전환될 때 적용될 좌표계 배율
const TACTICAL_SPACE_SCALE = 2.0;

/**
 * 카메라 줌 레벨에 따라 다른 객체를 렌더링하는 레이어 시스템을 관리합니다.
 */
export class LayerManager {
    constructor(camera, canvas, topLevelUnits, nemos, squadManager) {
        this.camera = camera;
        this.canvas = canvas;
        this.topLevelUnits = topLevelUnits;
        this.nemos = nemos;
        this.squadManager = squadManager;

        this.currentRenderLayer = 1;
        this.worldScale = LAYER_SCALES[1]; // 현재 레이어의 월드 스케일
        this.finalScale = this.worldScale * this.camera.zoom; // 최종 렌더링 스케일
        this.wasOnLayer3 = false;
    }

    update() {
        // 현재 줌 레벨에 따라 렌더링 레이어를 결정합니다.
        if (this.camera.zoom >= ZOOM_THRESHOLDS.LEVEL_3) {
            this.currentRenderLayer = 3;
            this.worldScale = LAYER_SCALES[3];
        } else if (this.camera.zoom >= ZOOM_THRESHOLDS.LEVEL_2) {
            this.currentRenderLayer = 2;
            this.worldScale = LAYER_SCALES[2];
        } else {
            this.currentRenderLayer = 1;
            this.worldScale = LAYER_SCALES[1];
        }

        // 최종 스케일을 다시 계산합니다.
        if (this.currentRenderLayer === 3) {
            this.finalScale = this.camera.zoom; // 레이어 3에서는 카메라 줌만 사용
        } else {
            this.finalScale = this.worldScale * this.camera.zoom;
        }

        // 3단계 레이어에서 벗어났는지 확인하고 네모 객체를 정리합니다.
        if (this.wasOnLayer3 && this.currentRenderLayer !== 3) {
            console.log("3단계 줌 아웃: 모든 네모 객체를 정리합니다.");
            this.nemos.length = 0;
            this.squadManager.squads.length = 0;
            // 중대의 nemosSpawned 플래그도 리셋
            this.topLevelUnits.forEach(unit => {
                unit.getAllCompanies().forEach(c => c.nemosSpawned = false);
            });
        }
        this.wasOnLayer3 = (this.currentRenderLayer === 3);
    }

    /**
     * 캔버스 컨텍스트에 현재 레이어에 맞는 변환(이동, 스케일)을 적용합니다.
     * @param {CanvasRenderingContext2D} ctx
     */
    applyTransform(ctx) {
        if (this.currentRenderLayer === 3) {
            ctx.scale(this.finalScale, this.finalScale);
            ctx.translate(-this.camera.x * TACTICAL_SPACE_SCALE, -this.camera.y * TACTICAL_SPACE_SCALE);
        } else {
            ctx.scale(this.finalScale, this.finalScale);
            ctx.translate(-this.camera.x, -this.camera.y);
        }
    }

    draw(ctx) {
        if (this.currentRenderLayer === 3) {
            // 3단계: 중대와 네모를 함께 렌더링
            const viewRect = {
                x: this.camera.x,
                y: this.camera.y,
                w: this.canvas.width / this.finalScale,
                h: this.canvas.height / this.finalScale,
            };

            this.topLevelUnits.forEach(unit => {
                unit.getAllCompanies().forEach(company => {
                    const isVisible = company.x > viewRect.x - company.size && company.x < viewRect.x + viewRect.w + company.size &&
                                      company.y > viewRect.y - company.size && company.y < viewRect.y + viewRect.h + company.size;

                    if (isVisible) {
                        if (!company.nemosSpawned) {
                            console.log(`${company.name}이(가) 화면에 보여 네모 스쿼드를 생성합니다.`);
                            const comp = company.nemoSquadComposition;
                            for (let i = 0; i < comp.count; i++) {
                                const squadNemos = [];
                                for (let j = 0; j < 3; j++) {
                                    // 전술 좌표계에 맞게 위치를 스케일링하고 오프셋을 적용합니다.
                                    const tacticalX = company.x * TACTICAL_SPACE_SCALE;
                                    const tacticalY = company.y * TACTICAL_SPACE_SCALE;
                                    const offsetX = (Math.random() - 0.5) * 400; // 전술 공간에서의 오프셋은 더 커야 함
                                    const offsetY = (Math.random() - 0.5) * 400;
                                    const newNemo = new Nemo(tacticalX + offsetX, tacticalY + offsetY, company.team, ["attack"], "unit", "sqaudio", "ranged", false);
                                    squadNemos.push(newNemo);
                                    this.nemos.push(newNemo);
                                }
                                const newSquad = new Squad(squadNemos, company.team, this.squadManager.cellSize);
                                squadNemos.forEach(n => n.squad = newSquad);
                                this.squadManager.squads.push(newSquad);
                            }
                            company.nemosSpawned = true;
                        }
                        // 레이어 3에서는 중대 아이콘을 반투명하게 그립니다.
                        ctx.save();
                        ctx.globalAlpha = 0.2;
                        company.draw(ctx); // 중대 아이콘은 전략 좌표계 기준
                        ctx.restore();
                    }
                });
            });

            // 3단계 레이어일 때만 네모 관련 객체들을 그립니다.
            this.nemos.forEach(nemo => nemo.draw(ctx, TACTICAL_SPACE_SCALE));
            this.squadManager.draw(ctx);

        } else if (this.currentRenderLayer === 2) {
            // 2단계: 대대와 독립 중대만 렌더링
            this.topLevelUnits.forEach(unit => {
                const battalions = unit.getAllBattalions();
                if (battalions.length > 0) {
                    battalions.forEach(battalion => battalion.draw(ctx));
                } else {
                    unit.getAllCompanies().forEach(company => company.draw(ctx));
                }
            });
        } else { // 1단계
            // 1단계: 대대급 이상의 지휘 부대만 렌더링합니다.
            this.topLevelUnits.forEach(unit => {
                // CommandUnit은 대대, 연대, 여단, 사단을 포함합니다.
                if (unit instanceof CommandUnit) {
                    unit.draw(ctx);
                }
            });
        }
    }
}