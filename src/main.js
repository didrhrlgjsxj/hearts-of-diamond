import { Camera } from './camera.js';
import { GameUI } from '../ui.js';
import { cleanupDestroyedUnits, updateUnits } from './Armies/unitLogic.js';
import Grid from './Grid.js';
import { Squad, SquadManager } from './Nemos/NemoSquadManager.js';
import MoveIndicator from './Nemos/MoveIndicator.js';
import { MineralPatch, Storage } from './Resource.js';
import { TeamManagers } from './TeamManager.js';
import Nemo, { Worker } from './Nemos/Nemo.js';
import { CommandUnit } from './Armies/unitEchelons.js';
import { deathEffects, gatherEffects } from './effects.js';


const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Armies 시스템 변수 ---
const topLevelUnits = []; // 최상위 부대들을 관리하는 배열
let selectedUnit = null;   // 현재 선택된 유닛

// --- Nemos 시스템 변수 ---
const nemos = [];
const workers = [];
let selectedNemos = [];
let selectedSquads = [];
let selectedWorkers = [];
const mineralPatches = [];
const mineralPieces = [];
const storages = [];
const moveIndicators = [];
let ghostWorker = null;
let ghostBuilding = null;
let pendingBuildWorker = null;
let pendingBuildType = null;
let attackKey = false;
let mineKey = false;

// --- 공통 시스템 변수 ---
const camera = new Camera(canvas); // 카메라 인스턴스 생성
let mouseX = 0;
let mouseY = 0;
let lastTime = 0; // deltaTime 계산을 위한 마지막 시간

// 부대 고유 번호 생성을 위한 전역 카운터
export const unitCounters = {
    'Division': 1,
    'Brigade': 1,
    'Regiment': 1,
    'Battalion': 1,
    'Company': 1,
};

// UI 인스턴스를 저장할 변수
let gameUI;

// 배경 이미지 설정
const background = new Image();
background.src = "Background.webp"; // 배경 이미지 경로;
const backgroundWidth = 4800; // 배경 너비 (1600 * 3)
const backgroundHeight = 3600; // 배경 높이 (1200 * 3)

// 그리드 및 스쿼드 매니저
const mainGrid = new Grid(40, backgroundWidth, backgroundHeight);
const squadManager = new SquadManager(mainGrid.cellSize);

// 자원 초기화
TeamManagers.blue.minerals = 0;
mineralPatches.push(new MineralPatch(...Object.values(mainGrid.snap(320, 320))));
mineralPatches.push(new MineralPatch(...Object.values(mainGrid.snap(480, 280))));
mineralPatches.push(new MineralPatch(...Object.values(mainGrid.snap(720, 360))));
mineralPatches.push(new MineralPatch(...Object.values(mainGrid.snap(920, 200))));
 
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

// --- 입력 처리 (Event Listeners) ---

canvas.addEventListener('click', (e) => {
    // Armies 유닛 선택 로직
    const worldCoords = camera.screenToWorld(mouseX, mouseY);

    let clickedUnit = null;
    // 최상위 부대부터 순회하며 클릭된 유닛을 찾음
    for (let i = topLevelUnits.length - 1; i >= 0; i--) {
        const unit = topLevelUnits[i];
        clickedUnit = unit.getUnitAt(worldCoords.x, worldCoords.y);
        if (clickedUnit) break;
    }

    // 이전에 선택된 유닛의 선택 상태를 해제
    if (selectedUnit) {
        selectedUnit.setSelected(false);
    }

    // 새로 클릭된 유닛을 선택 상태로 만듦
    selectedUnit = clickedUnit;
    if (selectedUnit) {
        selectedUnit.setSelected(true);
    }

    // 선택된 유닛이 변경되었으므로 UI를 업데이트합니다.
    gameUI.updateCompositionPanel(selectedUnit);
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault(); // 오른쪽 클릭 메뉴가 뜨는 것을 방지

    if (selectedUnit) {
        const worldCoords = camera.screenToWorld(mouseX, mouseY);
        // Shift 키를 누르고 우클릭하면 후퇴, 아니면 일반 이동
        // if (e.shiftKey) {
        //     selectedUnit.retreatTo(worldCoords.x, worldCoords.y);
        // } else {
        //     selectedUnit.moveTo(worldCoords.x, worldCoords.y, topLevelUnits);
        // }
    }
});

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key in camera.keys) {
        camera.keys[key] = true;
    }
    if (key === 'a') {
        attackKey = true;
        e.preventDefault();
    }
    if (key === 'm') {
        mineKey = true;
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key in camera.keys) {
        camera.keys[key] = false;
    }
    if (key === 'a') {
        attackKey = false;
        e.preventDefault();
    }
    if (key === 'm') {
        mineKey = false;
        e.preventDefault();
    }
    if (key === 'x') {
        const newSquad = squadManager.mergeSelectedSquads();
        if (newSquad) {
            selectedNemos.forEach(n => n.selected = false);
            selectedSquads.forEach(s => s.selected = false);
            selectedNemos = [];
            selectedSquads = [newSquad];
        }
        e.preventDefault();
    }
});

let isSelecting = false;
let selectionStart = null;
let selectionRect = null;
let rightClickDragStarted = false;
let moveRect = null;

canvas.addEventListener("mousedown", (e) => {
    const pos = camera.screenToWorld(e.clientX, e.clientY);
    const selectedAnyNemo = selectedNemos.length > 0 || selectedSquads.length > 0 || selectedWorkers.length > 0;

    if (e.button === 0) { // 좌클릭
        if (attackKey && selectedAnyNemo) {
            // issueAttackMove([], pos); // TODO: Implement
            return;
        }
        if (window.ghostSquad) {
            const squadNemos = [];
            window.ghostSquad.nemos.forEach(ghostNemo => {
                ghostNemo.ghost = false;
                squadNemos.push(ghostNemo);
                nemos.push(ghostNemo);
            });

            const newSquad = new Squad(squadNemos, window.ghostSquad.team, mainGrid.cellSize);
            squadNemos.forEach(n => n.squad = newSquad);
            squadManager.squads.push(newSquad);

            window.ghostSquad = null;
        } else {
            isSelecting = true;
            selectionStart = pos;
            selectionRect = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y };
        }
    }

    if (e.button === 2) { // 우클릭
        e.preventDefault();
        if (selectedUnit) { // Armies 유닛 이동
            if (e.shiftKey) {
                selectedUnit.retreatTo(pos.x, pos.y);
            } else {
                selectedUnit.moveTo(pos.x, pos.y, topLevelUnits);
            }
        } else if (selectedAnyNemo) { // Nemos 유닛 이동/공격
            rightClickDragStarted = true;
            moveRect = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y };
        }
    }
});

canvas.addEventListener("mousemove", (e) => {
    const pos = camera.screenToWorld(e.clientX, e.clientY);
    if (isSelecting && selectionRect) {
        selectionRect.x2 = pos.x;
        selectionRect.y2 = pos.y;
    }
    if (rightClickDragStarted && moveRect) {
        moveRect.x2 = pos.x;
        moveRect.y2 = pos.y;
    }
    if (window.ghostSquad) {
        let dx = 0;
        let dy = 0;
        if (window.ghostSquad.leader) {
            dx = pos.x - window.ghostSquad.leader.x;
            dy = pos.y - window.ghostSquad.leader.y;
        }
        window.ghostSquad.nemos.forEach(n => {
            n.x += dx;
            n.y += dy;
        });
        window.ghostSquad.update();
    }
});

canvas.addEventListener("mouseup", (e) => {
    const pos = camera.screenToWorld(e.clientX, e.clientY);

    if (isSelecting && e.button === 0) {
        isSelecting = false;
        selectionRect.x2 = pos.x;
        selectionRect.y2 = pos.y;
        const dragWidth = Math.abs(selectionRect.x2 - selectionRect.x1);
        const dragHeight = Math.abs(selectionRect.y2 - selectionRect.y1);

        if (dragWidth < 5 && dragHeight < 5) { // 클릭으로 간주
            // Nemos 클릭 선택 로직 (기존 Armies 선택 로직은 유지)
            // 여기서는 Nemos 선택 로직만 추가하고, Armies 선택은 기존 click 핸들러에서 처리
        } else { // 드래그 선택
            const minX = Math.min(selectionRect.x1, selectionRect.x2);
            const maxX = Math.max(selectionRect.x1, selectionRect.x2);
            const minY = Math.min(selectionRect.y1, selectionRect.y2);
            const maxY = Math.max(selectionRect.y1, selectionRect.y2);

            if (!e.shiftKey) {
                selectedNemos.forEach(n => (n.selected = false));
                selectedWorkers.forEach(w => (w.selected = false));
                selectedSquads.forEach(s => (s.selected = false));
                selectedNemos = [];
                selectedWorkers = [];
                selectedSquads = [];
            }

            const selectedInSquads = new Set();
            squadManager.squads.forEach(squad => {
                const b = squad.bounds;
                if (b.x >= minX && b.x + b.w <= maxX && b.y >= minY && b.y + b.h <= maxY) {
                    squad.selected = true;
                    if (!selectedSquads.includes(squad)) selectedSquads.push(squad);
                    squad.nemos.forEach(n => selectedInSquads.add(n.id));
                }
            });

            nemos.forEach(nemo => {
                if (!selectedInSquads.has(nemo.id) && nemo.x >= minX && nemo.x <= maxX && nemo.y >= minY && nemo.y <= maxY) {
                    nemo.selected = true;
                    if (!selectedNemos.includes(nemo)) selectedNemos.push(nemo);
                }
            });
        }
        selectionRect = null;
    }

    if (rightClickDragStarted && e.button === 2) {
        rightClickDragStarted = false;
        moveRect.x2 = pos.x;
        moveRect.y2 = pos.y;
        const dragW = Math.abs(moveRect.x2 - moveRect.x1);
        const dragH = Math.abs(moveRect.y2 - moveRect.y1);

        if (dragW < 5 && dragH < 5) {
            handleNemoRightClick(pos);
        } else if (selectedSquads.length > 0) {
            const startPos = { x: moveRect.x1, y: moveRect.y1 };
            const endPos = { x: moveRect.x2, y: moveRect.y2 };
            const centerPos = { x: (startPos.x + endPos.x) / 2, y: (startPos.y + endPos.y) / 2 };
            selectedSquads.forEach(squad => squad.setFormationShape(startPos, endPos, centerPos));
            moveIndicators.push(new MoveIndicator(centerPos.x, centerPos.y, 40, 20, 'yellow'));
        }
        moveRect = null;
    }
});

function handleNemoRightClick(pos) {
    const hasCombatUnits = selectedNemos.length > 0 || selectedSquads.length > 0;
    if (hasCombatUnits) {
        if (selectedSquads.length > 0) {
            selectedSquads.forEach(squad => squad.setDestination(pos));
            moveIndicators.push(new MoveIndicator(pos.x, pos.y, 40, 20, 'yellow'));
        }

        const individualNemos = selectedNemos.filter(n => !n.squad);
        if (individualNemos.length > 0) {
            const currentCenter = individualNemos.reduce((acc, n) => ({ x: acc.x + n.x, y: acc.y + n.y }), { x: 0, y: 0 });
            currentCenter.x /= individualNemos.length;
            currentCenter.y /= individualNemos.length;
            individualNemos.forEach(n => {
                const destX = pos.x + (n.x - currentCenter.x);
                const destY = pos.y + (n.y - currentCenter.y);
                n.setDestination(destX, destY);
            });
            if (selectedSquads.length === 0) {
                moveIndicators.push(new MoveIndicator(pos.x, pos.y, 40, 20, 'yellow'));
            }
        }
    }
}

function update(currentTime) {
    if (!lastTime) {
        lastTime = currentTime;
    }
    const deltaTime = (currentTime - lastTime) / 1000; // 초 단위로 변환
    lastTime = currentTime;

    camera.update(deltaTime);
    
    // --- Armies 유닛 로직 업데이트 ---
    // unitLogic.js에 위임하여 모든 유닛의 상태(전투, 이동, 조직력 등)를 업데이트합니다.
    updateUnits(topLevelUnits, deltaTime);

    // --- Nemos 유닛 로직 업데이트 ---
    const allNemoEntities = [...nemos, ...workers];
    nemos.forEach(nemo => nemo.update(allNemoEntities, squadManager));
    workers.forEach(w => w.update(mineralPatches, mineralPieces, storages));
    squadManager.updateSquads(nemos);

    // 이펙트 업데이트
    [moveIndicators, deathEffects, gatherEffects].forEach(effectArray => {
        for (let i = effectArray.length - 1; i >= 0; i--) {
            effectArray[i].update();
            if (effectArray[i].isDone()) {
                effectArray.splice(i, 1);
            }
        }
    });

    // 사망한 네모/워커 제거
    for (let i = nemos.length - 1; i >= 0; i--) {
        if (nemos[i].dead) nemos.splice(i, 1);
    }
    for (let i = workers.length - 1; i >= 0; i--) {
        if (workers[i].dead) workers.splice(i, 1);
    }
    squadManager.squads.forEach(squad => squad.nemos = squad.nemos.filter(n => !n.dead));
    squadManager.squads = squadManager.squads.filter(squad => squad.nemos.length > 0);


    // --- Armies 파괴된 유닛 제거 ---
    const cleanupResult = cleanupDestroyedUnits(topLevelUnits, selectedUnit);
    // topLevelUnits 배열을 직접 수정하는 대신, 필터링된 새 배열을 할당합니다.
    // 이렇게 하면 참조 문제를 피하고 더 안전하게 상태를 관리할 수 있습니다.
    // topLevelUnits = cleanupResult.remainingUnits; // 이 방식은 전역 변수 참조 문제 발생 가능
    
    // 원래 배열의 내용을 변경하여 전역 참조를 유지합니다.
    topLevelUnits.length = 0;
    Array.prototype.push.apply(topLevelUnits, cleanupResult.remainingUnits);
    
    selectedUnit = cleanupResult.newSelectedUnit;

    // 선택된 유닛이 파괴되었다면 UI를 업데이트합니다.
    if (selectedUnit !== cleanupResult.newSelectedUnit) {
        gameUI.updateCompositionPanel(selectedUnit);
    }
}

function draw() {
    ctx.save();
    ctx.canvas.deltaTime = (performance.now() - lastTime) / 1000; // draw에서도 deltaTime 사용 가능하도록
    ctx.clearRect(0, 0, canvas.width, canvas.height); // 잔상 문제를 해결하기 위해 캔버스 전체를 지웁니다.
    camera.applyTransform(ctx); // 카메라 변환 적용

    // 배경 그리기
    ctx.drawImage(background, 0, 0, backgroundWidth, backgroundHeight);
    mainGrid.draw(ctx);

    // Nemos 시스템 객체 그리기
    mineralPatches.forEach(p => p.draw(ctx));
    storages.forEach(s => s.draw(ctx));
    mineralPieces.forEach(p => p.draw(ctx));
    workers.forEach(w => w.draw(ctx));
    nemos.forEach(nemo => nemo.draw(ctx));
    squadManager.draw(ctx);
    moveIndicators.forEach(ind => ind.draw(ctx));
    gatherEffects.forEach(e => e.draw(ctx));
    deathEffects.forEach(e => e.draw(ctx));

    if (window.ghostSquad) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        window.ghostSquad.nemos.forEach(n => n.draw(ctx));
        window.ghostSquad.draw(ctx);
        ctx.restore();
    }

    // Armies 시스템 객체 그리기
    for (const unit of topLevelUnits) {
        unit.draw(ctx);
    }

    // 선택 영역 그리기
    if (selectionRect) {
        ctx.strokeStyle = 'rgba(0,255,0,0.5)';
        ctx.lineWidth = 1;
        const x = Math.min(selectionRect.x1, selectionRect.x2);
        const y = Math.min(selectionRect.y1, selectionRect.y2);
        const w = Math.abs(selectionRect.x2 - selectionRect.x1);
        const h = Math.abs(selectionRect.y2 - selectionRect.y1);
        ctx.strokeRect(x, y, w, h);
    }
    if (moveRect) {
        ctx.strokeStyle = 'rgba(0,0,255,0.5)';
        ctx.lineWidth = 1;
        const x = Math.min(moveRect.x1, moveRect.x2);
        const y = Math.min(moveRect.y1, moveRect.y2);
        const w = Math.abs(moveRect.x2 - moveRect.x1);
        const h = Math.abs(moveRect.y2 - moveRect.y1);
        ctx.strokeRect(x, y, w, h);
    }

    ctx.restore();
}

function loop(currentTime) {
    update(currentTime);
    draw();
    requestAnimationFrame(loop);
}

// UI 초기화
background.onload = () => {
    gameUI = new GameUI(camera, topLevelUnits, nemos, workers, squadManager);
    loop();
};
background.onerror = () => { // 배경 이미지 로드 실패 시에도 게임 시작
    gameUI = new GameUI(camera, topLevelUnits, nemos, workers, squadManager);
    loop();
};
