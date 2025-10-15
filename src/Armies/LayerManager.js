import Nemo from '../Nemos/Nemo.js';
import { Squad } from '../Nemos/NemoSquadManager.js';

const ZOOM_THRESHOLDS = {
    LEVEL_2: 0.8, // 이 줌 레벨보다 커지면 2단계 레이어
    LEVEL_3: 1.5, // 이 줌 레벨보다 커지면 3단계 레이어
};

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
        this.wasOnLayer3 = false;
    }

    update() {
        // 현재 줌 레벨에 따라 렌더링 레이어를 결정합니다.
        if (this.camera.zoom >= ZOOM_THRESHOLDS.LEVEL_3) {
            this.currentRenderLayer = 3;
        } else if (this.camera.zoom >= ZOOM_THRESHOLDS.LEVEL_2) {
            this.currentRenderLayer = 2;
        } else {
            this.currentRenderLayer = 1;
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

    draw(ctx) {
        if (this.currentRenderLayer === 3) {
            // 3단계: 중대와 네모를 함께 렌더링
            const viewRect = {
                x: this.camera.x,
                y: this.camera.y,
                w: this.canvas.width / this.camera.zoom,
                h: this.canvas.height / this.camera.zoom,
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
                                    const offsetX = (Math.random() - 0.5) * 150;
                                    const offsetY = (Math.random() - 0.5) * 150;
                                    const newNemo = new Nemo(company.x + offsetX, company.y + offsetY, company.team, ["attack"], "unit", "sqaudio", "ranged", false);
                                    squadNemos.push(newNemo);
                                    this.nemos.push(newNemo);
                                }
                                const newSquad = new Squad(squadNemos, company.team, this.squadManager.cellSize);
                                squadNemos.forEach(n => n.squad = newSquad);
                                this.squadManager.squads.push(newSquad);
                            }
                            company.nemosSpawned = true;
                        }
                        company.draw(ctx);
                    }
                });
            });

            // 3단계 레이어일 때만 네모 관련 객체들을 그립니다.
            this.nemos.forEach(nemo => nemo.draw(ctx));
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
            // 1단계: 최상위 부대만 렌더링
            this.topLevelUnits.forEach(unit => unit.draw(ctx));
        }
    }
}