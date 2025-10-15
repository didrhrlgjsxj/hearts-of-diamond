import Nemo from './Nemos/Nemo.js';
import { NemoPlatoon, NemoSquad } from './Nemos/NemoSquadManager.js';
import { CommandUnit } from './Armies/unitEchelons.js';

const ZOOM_THRESHOLDS = { // 카메라의 zoom 값 기준
    LEVEL_2: 0.8,
    LEVEL_3: 1.2, // 3단계 진입 시점을 낮춰 더 빨리 전술 뷰로 전환
};

const LAYER_SCALES = { // 각 레이어별 실제 렌더링 배율
    1: 0.3,  // 1단계 (전략 뷰): 부대 아이콘 위주 (더 넓게 보도록 조정)
    2: 0.8,  // 2단계 (작전 뷰): 대대/중대 아이콘 위주
    3: 1.0,  // 3단계 (전술 뷰): 네모 객체 위주 (이 값은 이제 최종 배율에 직접 사용되지 않음)
};

// 전술 뷰(레이어 3)로 전환될 때 적용될 좌표계 배율
const TACTICAL_SPACE_SCALE = 20.0;

/**
 * 카메라 줌 레벨에 따라 다른 객체를 렌더링하는 레이어 시스템을 관리합니다.
 */
export class LayerManager {
    constructor(camera, canvas, topLevelUnits, nemos, squadManager) {
        this.camera = camera;
        this.canvas = canvas;
        this.topLevelUnits = topLevelUnits;
        this.nemos = nemos;
        this.platoonManager = squadManager;

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
        this.finalScale = this.worldScale * this.camera.zoom;

        // 3단계 레이어에서 벗어났는지 확인하고 네모 객체를 정리합니다.
        if (this.wasOnLayer3 && this.currentRenderLayer !== 3) {
            console.error(`[LayerManager] 줌 아웃 감지! 모든 네모를 정리합니다. (이전 레이어: 3, 현재 레이어: ${this.currentRenderLayer})`);
            this.nemos.length = 0;
            this.platoonManager.platoons.length = 0;
            // 중대의 nemosSpawned 플래그도 리셋
            this.topLevelUnits.forEach(unit => {
                unit.getAllCompanies().forEach(c => c.nemosSpawned = false);
            });
        }
        this.wasOnLayer3 = (this.currentRenderLayer === 3);

        // 3단계 레이어에 있고, 화면에 보이는 중대가 있다면 네모를 생성합니다.
        if (this.currentRenderLayer === 3) {
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

                    if (isVisible && !company.nemosSpawned) {
                        console.log(`${company.name}이(가) 화면에 보여 하위 편제를 바탕으로 네모를 생성합니다.`);
                        
                        // 1. 중대 휘하의 모든 분대를 순회하며 Nemo 아바타를 실제 객체로 생성합니다.
                        company.getAllSquads().forEach((squad, squadIndex) => {
                            for (let i = 0; i < squad.nemoAvatars.length; i++) {
                                const tacticalX = company.x * TACTICAL_SPACE_SCALE;
                                const tacticalY = company.y * TACTICAL_SPACE_SCALE;
                                const offsetX = (Math.random() - 0.5) * 400;
                                const offsetY = (Math.random() - 0.5) * 400;
                                const newNemo = new Nemo(tacticalX + offsetX, tacticalY + offsetY, company.team, ["attack"], "unit", "sqaudio", "ranged", false);
                                
                                squad.nemoAvatars[i] = newNemo; // 미리 만들어둔 공간에 실제 Nemo 객체 할당
                                this.nemos.push(newNemo); // 전역 Nemo 배열에 추가
                                newNemo.squad = squad.nemoSquad; // Nemo가 자신의 NemoSquad를 알도록 설정
                            }
                        });

                        // 2. 이 중대에 소속된 모든 NemoSquad를 담을 새로운 NemoPlatoon을 생성합니다.
                        const nemoSquadsForCompany = company.getAllSquads().map(s => s.nemoSquad);
                        nemoSquadsForCompany.forEach(ns => {
                            ns.nemos = company.getAllSquads().find(s => s.nemoSquad === ns).nemoAvatars;
                            ns.assignLeader();
                        });

                        const nemoPlatoon = new NemoPlatoon(nemoSquadsForCompany, company.team, company);
                        this.platoonManager.platoons.push(nemoPlatoon);
                        company.nemosSpawned = true;
                    }
                });
            });
        }
    }

    /**
     * 캔버스 컨텍스트에 현재 레이어에 맞는 변환(이동, 스케일)을 적용합니다.
     * @param {CanvasRenderingContext2D} ctx
     */
    applyTransform(ctx) {
        ctx.scale(this.finalScale, this.finalScale);
        const tx = this.currentRenderLayer === 3 ? this.camera.x * TACTICAL_SPACE_SCALE : this.camera.x;
        const ty = this.currentRenderLayer === 3 ? this.camera.y * TACTICAL_SPACE_SCALE : this.camera.y;
        ctx.translate(-tx, -ty);
    }

    draw(ctx) {
        // 그리드를 먼저 그려서 다른 객체들 아래에 위치하도록 합니다.
        this.drawGrid(ctx);

        if (this.currentRenderLayer === 3) {
            // 3단계: 중대 아이콘과 네모를 함께 렌더링
            this.topLevelUnits.forEach(unit => {
                unit.getAllCompanies().forEach(company => {
                    // 레이어 3에서는 중대 아이콘을 반투명하게 그립니다.
                    ctx.save();
                    ctx.globalAlpha = 0.2;
                    company.draw(ctx); // 중대 아이콘은 전략 좌표계 기준
                    ctx.restore();
                });
            });

            // 3단계 레이어일 때만 네모 관련 객체들을 그립니다.
            this.nemos.forEach(nemo => nemo.draw(ctx, TACTICAL_SPACE_SCALE));
            this.platoonManager.draw(ctx);

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

    /**
     * 현재 레이어에 맞춰 그리드를 그립니다.
     * @param {CanvasRenderingContext2D} ctx 
     */
    drawGrid(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.lineWidth = 1 / this.finalScale;

        let view, cellSize, startX, endX, startY, endY;

        if (this.currentRenderLayer === 3) {
            // 3단계 뷰: 전술 좌표계에 맞춰 그리드를 그립니다.
            view = {
                x: this.camera.x * TACTICAL_SPACE_SCALE,
                y: this.camera.y * TACTICAL_SPACE_SCALE,
                w: this.canvas.width / this.finalScale,
                h: this.canvas.height / this.finalScale,
            };
            cellSize = 40 * TACTICAL_SPACE_SCALE; // 그리드 셀 크기도 확대
        } else {
            // 1, 2단계 뷰: 전략 좌표계에 맞춰 그립니다.
            view = {
                x: this.camera.x,
                y: this.camera.y,
                w: this.canvas.width / this.finalScale,
                h: this.canvas.height / this.finalScale,
            };
            cellSize = 40; // 기본 그리드 셀 크기
        }

        startX = Math.floor(view.x / cellSize) * cellSize;
        endX = Math.ceil((view.x + view.w) / cellSize) * cellSize;
        startY = Math.floor(view.y / cellSize) * cellSize;
        endY = Math.ceil((view.y + view.h) / cellSize) * cellSize;

        ctx.beginPath();
        for (let x = startX; x < endX; x += cellSize) { ctx.moveTo(x, startY); ctx.lineTo(x, endY); }
        for (let y = startY; y < endY; y += cellSize) { ctx.moveTo(startX, y); ctx.lineTo(endX, y); }
        ctx.stroke();
        ctx.restore();
    }
}