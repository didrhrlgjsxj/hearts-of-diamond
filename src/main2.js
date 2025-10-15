// main.js 와의 통합 이후 정보의 보존을 위해 더미로 남겨두는 구 Nemos전용 main파일입니다.

import Nemo from './Nemos/Nemo.js';  // Nemo.js에서 Nemo 클래스를 가져옵니다.
import Grid from './Grid.js';
import { SquadManager, Squad } from './Nemos/NemoSquadManager.js';
import MoveIndicator from './Nemos/MoveIndicator.js';
import { MineralPatch, MineralPiece, Storage } from './Resource.js';
import { Worker } from './Nemos/Nemo.js';
import { TeamManagers } from './TeamManager.js';


// Canvas 및 Context 설정
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const blueUnitBtn = document.getElementById("spawnBlueUnitBtn");
const blueArmyBtn = document.getElementById("spawnBlueArmyBtn");
const redUnitBtn = document.getElementById("spawnRedUnitBtn");
const redArmyBtn = document.getElementById("spawnRedArmyBtn");
const workerABtn = document.getElementById("spawnWorkerABtn");
const workerBBtn = document.getElementById("spawnWorkerBBtn");
const mineralSpan = document.getElementById("blueMinerals");
const commandPanel = document.getElementById("commandPanel");
const unitInfoDiv = document.getElementById("unitInfo");
const commandButtonsDiv = document.getElementById("commandButtons");
const buildMenu = document.getElementById("buildMenu");

// 배경 이미지 설정
const background = new Image();
background.src = "Background.webp"; // 배경 이미지 경로
const backgroundWidth = 4800; // 배경 너비 (1600 * 3)
const backgroundHeight = 3600; // 배경 높이 (1200 * 3)


// Nemo 보다 약간 작은 크기의 그리드를 생성
const mainGrid = new Grid(40, backgroundWidth, backgroundHeight);
const squadManager = new SquadManager(mainGrid.cellSize);

// 자원 및 작업자 관련 변수
TeamManagers.blue.minerals = 0;
const mineralPatches = [
    new MineralPatch(...Object.values(mainGrid.snap(320, 320))),
    new MineralPatch(...Object.values(mainGrid.snap(480, 280))),
    new MineralPatch(...Object.values(mainGrid.snap(720, 360))),
    new MineralPatch(...Object.values(mainGrid.snap(920, 200)))
];
const mineralPieces = [];
const storages = [];
const workers = [];


// 카메라 변수 및 이동 속도
let cameraX = 0;
let cameraY = 0;
const cameraSpeed = 5; // 카메라 이동 속도

// 확대/축소(scale) 변수 (기본값 1 = 100%)
let scale = 1.0;

// 마우스 위치 추적
let mouseX = 0;
let mouseY = 0;

canvas.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
});

// 마우스 휠 이벤트로 카메라 확대/축소 처리
canvas.addEventListener("wheel", (event) => {
    event.preventDefault(); // 기본 스크롤 동작 방지
    const zoomSpeed = 0.001; // 확대/축소 속도 (원하는 값으로 조정)
    // 현재 화면 중앙의 월드 좌표를 기록
    const prevScale = scale;
    const centerX = cameraX + canvas.width / 2 / prevScale;
    const centerY = cameraY + canvas.height / 2 / prevScale;

    // 휠 위로 돌리면 (deltaY < 0) 확대, 아래면 (deltaY > 0) 축소
    scale += -event.deltaY * zoomSpeed;
    // 확대/축소 배율의 최소, 최대 한계값 설정 (예: 0.5배 ~ 3.0배)
    scale = Math.max(0.5, Math.min(scale, 3.0));

    // 새로운 스케일에 맞춰 카메라 위치 조정 (화면 중앙을 기준으로 확대/축소)
    cameraX = centerX - canvas.width / 2 / scale;
    cameraY = centerY - canvas.height / 2 / scale;
    cameraX = Math.max(0, Math.min(backgroundWidth - canvas.width / scale, cameraX));
    cameraY = Math.max(0, Math.min(backgroundHeight - canvas.height / scale, cameraY));
});

// 카메라 이동 로직 (마우스가 캔버스 가장자리에 있을 때 이동)
function updateCamera() {
    const edgeMargin = 10; // 화면 가장자리 감지 범위

    if (mouseX < edgeMargin) {
        cameraX -= cameraSpeed; // 왼쪽으로 이동
    }
    if (mouseX > canvas.width - edgeMargin) {
        cameraX += cameraSpeed; // 오른쪽으로 이동
    }
    if (mouseY < edgeMargin) {
        cameraY -= cameraSpeed; // 위로 이동
    }
    if (mouseY > canvas.height - edgeMargin) {
        cameraY += cameraSpeed; // 아래로 이동
    }

    // 카메라가 배경을 벗어나지 않도록 제한 (확대/축소 고려)
    const maxX = backgroundWidth - canvas.width / scale;
    const maxY = backgroundHeight - canvas.height / scale;
    cameraX = Math.max(0, Math.min(maxX, cameraX));
    cameraY = Math.max(0, Math.min(maxY, cameraY));
}

// Nemo 관련 코드

// 임시 배치용 네모
let ghostNemo = null;
// 임시 배치용 스쿼드
let ghostSquad = null;
// 임시 배치용 작업자
let ghostWorker = null;
// 임시 배치용 건물
let ghostBuilding = null;

const nemos = [];
let selectedNemos = [];
let selectedSquads = [];
let selectedWorkers = [];
let isSelecting = false;
let selectionStart = null;
let selectionRect = null;
let isMoveDragging = false;
let moveRect = null;
const moveIndicators = [];
const deathEffects = [];
const gatherEffects = [];
let pendingBuildWorker = null;
let pendingBuildType = null;
let attackKey = false; // 'A' 키가 눌린 상태 여부
let mineKey = false; // 'M' 키 또는 Mine 버튼 활성화 여부

window.addEventListener('keydown', (e) => {
    if (e.key === 'a' || e.key === 'A') {
        attackKey = true;
        e.preventDefault();
    }
    if (e.key === 'm' || e.key === 'M') {
        mineKey = true;
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'a' || e.key === 'A') {
        attackKey = false;
        e.preventDefault();
    }
    if (e.key === 'm' || e.key === 'M') {
        mineKey = false;
        e.preventDefault();
    }
    if (e.key === 'x' || e.key === 'X') {
        const newSquad = squadManager.mergeSelectedSquads();
        if (newSquad) {
            // 기존 선택을 모두 해제하고 새로 생성된 스쿼드만 선택합니다.
            selectedNemos.forEach(n => n.selected = false);
            selectedSquads.forEach(s => s.selected = false);
            selectedNemos = [];
            selectedSquads = [newSquad];
        }
        e.preventDefault();
    }
    if (e.key === 'g' || e.key === 'G') {
        const pos = worldMouse();
        handleRightClick(pos);
        e.preventDefault();
    }
});

function getAllSelectedNemos() {
    const set = new Set(selectedNemos);
    selectedSquads.forEach(s => s.nemos.forEach(n => set.add(n)));
    return Array.from(set);
}

// 명령 패널의 이전 상태를 기록하여 매 프레임 DOM을 다시 만들지 않도록 함
let lastButtonType = null;
let lastInfoText = '';

function updateCommandPanel() {
    const anySelection = selectedNemos.length || selectedWorkers.length || selectedSquads.length;
    if (!anySelection) {
        commandPanel.style.display = 'none';
        buildMenu.style.display = 'none';
        lastButtonType = null;
        lastInfoText = '';
        return;
    }
    commandPanel.style.display = 'block';
    const unit = selectedNemos[0] || selectedWorkers[0] || null;
    if (!unit) return;

    let info = `HP: ${Math.round(unit.hp || 0)}`;
    if (unit.shieldMaxHp) info += ` / Shield: ${Math.round(unit.shieldHp)}`;
    if (info !== lastInfoText) {
        unitInfoDiv.textContent = info;
        lastInfoText = info;
    }

    let buttonType = null;
    if (unit instanceof Worker && unit.type === 'B') {
        buttonType = 'build';
    } else if (unit instanceof Worker && unit.type === 'A') {
        buttonType = 'mine';
    } else if (unit.platforms) {
        buttonType = 'attack';
    }

    if (buttonType !== lastButtonType) {
        commandButtonsDiv.innerHTML = '';
        if (buttonType === 'build') {
            const btn = document.createElement('button');
            btn.textContent = 'Build';
            btn.onclick = () => {
                buildMenu.style.display = buildMenu.style.display === 'none' ? 'block' : 'none';
            };
            commandButtonsDiv.appendChild(btn);
        } else if (buttonType === 'mine') {
            const btn = document.createElement('button');
            btn.textContent = 'Mine';
            btn.onclick = () => {
                mineKey = true;
            };
            commandButtonsDiv.appendChild(btn);
        } else if (buttonType === 'attack') {
            const atkBtn = document.createElement('button');
            atkBtn.textContent = 'Attack Move';
            atkBtn.onclick = () => { attackKey = true; };
            commandButtonsDiv.appendChild(atkBtn);
        }
        lastButtonType = buttonType;
    }
}
//blueUnitNemo

function worldMouse() {
    return {
        x: cameraX + mouseX / scale,
        y: cameraY + mouseY / scale
    };
}

function enemyNemoAt(pos, myTeam) {
    const list = [...nemos, ...workers];
    for (const n of list) {
        if (n.team === myTeam) continue;
        if (pos.x >= n.x - n.size / 2 && pos.x <= n.x + n.size / 2 &&
            pos.y >= n.y - n.size / 2 && pos.y <= n.y + n.size / 2) {
            return n;
        }
    }
    return null;
}

function enemySquadAt(pos, myTeam) {
    for (const sq of squadManager.squads) {
        if (sq.team === myTeam) continue;
        for (const n of sq.nemos) {
            const half = n.size / 2 + 5; // small margin
            if (pos.x >= n.x - half && pos.x <= n.x + half && pos.y >= n.y - half && pos.y <= n.y + half) {
                return sq;
            }
        }
    }
    return null;
}

function issueAttackMove(targets, pos) {
    const list = getAllSelectedNemos();
    list.forEach(n => n.startAttackMove(targets, pos));
    if (pos) moveIndicators.push(new MoveIndicator(pos.x, pos.y));
}

function nemoAt(pos) {
    for (const nemo of nemos) {
        if (
            pos.x >= nemo.x - nemo.size / 2 &&
            pos.x <= nemo.x + nemo.size / 2 &&
            pos.y >= nemo.y - nemo.size / 2 &&
            pos.y <= nemo.y + nemo.size / 2
        ) {
            return nemo;
        }
    }
    return null;
}

function workerAt(pos) {
    for (const w of workers) {
        if (
            pos.x >= w.x - w.size / 2 &&
            pos.x <= w.x + w.size / 2 &&
            pos.y >= w.y - w.size / 2 &&
            pos.y <= w.y + w.size / 2
        ) {
            return w;
        }
    }
    return null;
}

function squadAt(pos) {
    for (const squad of squadManager.squads) {
        const b = squad.bounds;
        if (pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h) {
            return squad;
        }
    }
    return null;
}

function createGhostSquad(squadType, team) {
    ghostWorker = null;
    ghostBuilding = null;

    const { x, y } = worldMouse();
    const squadNemos = [];
    const numUnits = 3;

    for (let i = 0; i < numUnits; i++) {
        // 유닛들을 소환 위치 주변에 약간 흩어지게 배치
        const offsetX = (Math.random() - 0.5) * 80;
        const offsetY = (Math.random() - 0.5) * 80;
        let newNemo;

        if (squadType === 'A') { // A형: unit 3기
            newNemo = new Nemo(x + offsetX, y + offsetY, team, ["attack"], "unit", "sqaudio", "ranged", false);
        } else { // B형: sqaudio 3기
            newNemo = new Nemo(x + offsetX, y + offsetY, team, ["attack", "attack"], "army", "sqaudio", "ranged", true);
        }
        newNemo.ghost = true;
        squadNemos.push(newNemo);
    }

    ghostSquad = new Squad(squadNemos, team, mainGrid.cellSize);
    ghostSquad.squadType = squadType; // 스폰 시 타입을 알기 위해 저장
    squadNemos.forEach(n => n.squad = ghostSquad);
}

/**
 * 마우스 우클릭 또는 'g' 키 입력에 대한 모든 명령을 처리합니다.
 * @param {{x: number, y: number}} pos - 월드 좌표계의 클릭 위치
 */
function handleRightClick(pos) {
    const selectedUnits = getAllSelectedNemos();
    const hasCombatUnits = selectedUnits.length > 0 || selectedSquads.length > 0;
    const hasWorkers = selectedWorkers.length > 0;

    if (!hasCombatUnits && !hasWorkers) return;

    const team = hasCombatUnits ? (selectedUnits[0]?.team || selectedSquads[0]?.team) : selectedWorkers[0].team;

    // 1. 적 유닛/스쿼드 공격 (전투 유닛이 선택된 경우에만)
    if (hasCombatUnits) {
        const enemyN = enemyNemoAt(pos, team);
        if (enemyN) {
            issueAttackMove([enemyN], { x: enemyN.x, y: enemyN.y });
            return;
        }
        const enemyS = enemySquadAt(pos, team);
        if (enemyS) {
            if (selectedSquads.length > 0) {
                selectedSquads.forEach(s => s.setAttackMoveTarget(enemyS));
            } else { // 개별 유닛으로 스쿼드 공격
                issueAttackMove(enemyS.nemos, { x: enemyS.bounds.x + enemyS.bounds.w / 2, y: enemyS.bounds.y + enemyS.bounds.h / 2 });
            }
            return;
        }
    }

    // 2. 스쿼드 이동 명령
    if (selectedSquads.length > 0) {
        selectedSquads.forEach(squad => squad.setDestination(pos));
        moveIndicators.push(new MoveIndicator(pos.x, pos.y, 40, 20, 'yellow'));
    }

    // 3. 개별 유닛 이동 명령 (스쿼드에 속하지 않은 유닛들)
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
        if (selectedSquads.length === 0) { // 스쿼드 이동 표시와 중복 방지
            moveIndicators.push(new MoveIndicator(pos.x, pos.y, 40, 20, 'yellow'));
        }
    }

    // 4. 작업자 이동 명령
    if (hasWorkers) {
        selectedWorkers.forEach(w => w.manualTarget = pos);
        if (!hasCombatUnits) { // 전투 유닛 이동 표시와 중복 방지
            moveIndicators.push(new MoveIndicator(pos.x, pos.y, 40, 20, 'green'));
        }
    }
}


redUnitBtn.addEventListener("click", () => createGhostSquad("A", "red"));
redArmyBtn.addEventListener("click", () => createGhostSquad("B", "red"));
blueUnitBtn.addEventListener("click", () => createGhostSquad("A", "blue"));
blueArmyBtn.addEventListener("click", () => createGhostSquad("B", "blue"));

function createWorkerGhost(type) {
    ghostNemo = null; // 다른 고스트 객체 비활성화
    ghostBuilding = null;
    ghostSquad = null;
    const { x, y } = worldMouse();
    ghostWorker = new Worker(x, y, type);
    ghostWorker.ghost = true;
}

workerABtn.addEventListener("click", () => createWorkerGhost('A'));
workerBBtn.addEventListener("click", () => createWorkerGhost('B'));
document.querySelectorAll('.buildBtn').forEach(btn => {
    btn.addEventListener('click', () => {
        ghostNemo = null; // 다른 고스트 객체 비활성화
        ghostSquad = null;
        ghostWorker = null;
        const type = btn.getAttribute('data-type');
        const { x, y } = worldMouse();
        const pos = mainGrid.snap(x, y);
        ghostBuilding = new Storage(pos.x, pos.y, true);
        buildMenu.style.display = 'none';
        if (selectedWorkers[0]) {
            pendingBuildWorker = selectedWorkers[0];
            pendingBuildType = type;
        }
        buildMenu.style.display = 'none';
        pendingBuildWorker = selectedWorkers.find(w => w.type === 'B') || null;
    });
});

let selectionStartedWithSelection = false;

canvas.addEventListener("mousedown", (e) => {
    const pos = worldMouse();
    const selectedAny = selectedNemos.length > 0 || selectedSquads.length > 0;

    if (e.button === 0) {
        if (attackKey && selectedAny) {
            issueAttackMove([], pos);
            return;
        }
        if (mineKey && selectedWorkers.some(w => w.type === 'A')) {
            let patch = null;
            for (const p of mineralPatches) {
                if (Math.hypot(p.x - pos.x, p.y - pos.y) <= p.radius) { patch = p; break; }
            }
            if (patch) {
                selectedWorkers.forEach(w => { if (w.type === 'A') w.toggleAutoMine(patch); });
            }
            mineKey = false;
            return;
        }
        if (ghostWorker) {
            ghostWorker.ghost = false;
            workers.push(ghostWorker);
            ghostWorker = null;
        } else if (ghostBuilding && pendingBuildWorker) {
            const buildPos = { x: ghostBuilding.x, y: ghostBuilding.y };
            const type = pendingBuildType || 'storage';
            pendingBuildWorker.startBuilding(type, buildPos);
            ghostBuilding = null;
            pendingBuildWorker = null;
            pendingBuildType = null;
        } else if (ghostSquad) {
            const squadNemos = [];
            ghostSquad.nemos.forEach(ghostNemo => {
                ghostNemo.ghost = false;
                squadNemos.push(ghostNemo);
                nemos.push(ghostNemo);
            });

            const newSquad = new Squad(squadNemos, ghostSquad.team, mainGrid.cellSize);
            squadNemos.forEach(n => n.squad = newSquad);
            squadManager.squads.push(newSquad);

            ghostSquad = null;
        } else {
            isSelecting = true;
            selectionStart = pos;
            selectionRect = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y };
        }
    }
    if (e.button === 2) {
        rightClickDragStarted = true;
        moveRect = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y };
        e.preventDefault();
    }
});

canvas.addEventListener("mousemove", (e) => {
    if (isSelecting && selectionRect) {
        const pos = worldMouse();
        selectionRect.x2 = pos.x;
        selectionRect.y2 = pos.y;
    }
    if (rightClickDragStarted && moveRect) {
        const pos = worldMouse();
        moveRect.x2 = pos.x;
        moveRect.y2 = pos.y;
    }
});

canvas.addEventListener("mouseup", (e) => {
    if (isSelecting && e.button === 0) {
        isSelecting = false;
        const pos = worldMouse();
        selectionRect.x2 = pos.x;
        selectionRect.y2 = pos.y;
        const dragWidth = Math.abs(selectionRect.x2 - selectionRect.x1);
        const dragHeight = Math.abs(selectionRect.y2 - selectionRect.y1);

        // 드래그 거리가 거의 없으면 클릭으로 간주
        if (dragWidth < 5 && dragHeight < 5) {
            const clickedNemo = nemoAt(pos);
            const clickedWorker = workerAt(pos);
            // 네모나 워커가 클릭되지 않았을 때만 스쿼드를 확인합니다.
            const clickedSquad = (!clickedNemo && !clickedWorker) ? squadAt(pos) : null;

            const clickedSomething = clickedNemo || clickedWorker || clickedSquad;

            // 1. 선택 해제 로직: Shift를 누르지 않고 빈 공간을 클릭한 경우
            if (!e.shiftKey && !clickedSomething && !enemyNemoAt(pos) && !enemySquadAt(pos)) {
                selectedNemos.forEach(n => (n.selected = false));
                selectedWorkers.forEach(w => (w.selected = false));
                selectedSquads.forEach(s => (s.selected = false));
                selectedNemos = [];
                selectedWorkers = [];
                selectedSquads = [];
                selectionRect = null;
                return;
            }

            // 2. 선택 로직: 무언가 클릭된 경우
            if (clickedSomething) {
                // Shift를 누르지 않았다면, 기존 선택을 모두 해제합니다.
                if (!e.shiftKey) {
                    selectedNemos.forEach(n => (n.selected = false));
                    selectedWorkers.forEach(w => (w.selected = false));
                    selectedSquads.forEach(s => (s.selected = false));
                    selectedNemos = [];
                    selectedWorkers = [];
                    selectedSquads = [];
                }

                // 클릭된 개체를 선택 목록에 추가/제거(토글)합니다.
                if (clickedNemo) {
                    const index = selectedNemos.indexOf(clickedNemo);
                    if (index > -1 && e.shiftKey) {
                        clickedNemo.selected = false;
                        selectedNemos.splice(index, 1);
                    } else if (index === -1) {
                        clickedNemo.selected = true;
                        selectedNemos.push(clickedNemo);
                    }
                } else if (clickedWorker) {
                    // (워커에 대한 토글 로직도 필요하다면 여기에 추가)
                    clickedWorker.selected = true;
                    if (!selectedWorkers.includes(clickedWorker)) selectedWorkers.push(clickedWorker);
                } else if (clickedSquad) {
                    const index = selectedSquads.indexOf(clickedSquad);
                    if (index > -1 && e.shiftKey) {
                        clickedSquad.selected = false;
                        selectedSquads.splice(index, 1);
                    } else if (index === -1) {
                        clickedSquad.selected = true;
                        selectedSquads.push(clickedSquad);
                    }
                }
            }
        } else { // 드래그 선택 로직
            const minX = Math.min(selectionRect.x1, selectionRect.x2);
            const maxX = Math.max(selectionRect.x1, selectionRect.x2);
            const minY = Math.min(selectionRect.y1, selectionRect.y2);
            const maxY = Math.max(selectionRect.y1, selectionRect.y2);
            // Shift 키를 누르지 않았을 때만 기존 선택을 해제합니다.
            if (!e.shiftKey) {
                selectedNemos.forEach(n => (n.selected = false));
                selectedWorkers.forEach(w => (w.selected = false));
                selectedSquads.forEach(s => (s.selected = false));
                selectedNemos = [];
                selectedWorkers = [];
                selectedSquads = [];
            }
            workers.forEach(w => {
                if (w.x >= minX && w.x <= maxX && w.y >= minY && w.y <= maxY) {
                    w.selected = true;
                    selectedWorkers.push(w);
                }
            });
            // 스쿼드를 먼저 선택하고, 스쿼드에 포함되지 않은 네모를 나중에 선택합니다.
            const selectedInSquads = new Set();
            squadManager.squads.forEach(squad => {
                const b = squad.bounds;
                if (b.x >= minX && b.x + b.w <= maxX && b.y >= minY && b.y + b.h <= maxY) {
                    const hasSelected = squad.nemos.some(n => selectedNemos.includes(n));
                    if (!hasSelected) {
                        squad.selected = true;
                        selectedSquads.push(squad);
                        squad.nemos.forEach(n => selectedInSquads.add(n.id));
                    }
                }
            });
            nemos.forEach(nemo => {
                if (!selectedInSquads.has(nemo.id) && nemo.x >= minX && nemo.x <= maxX && nemo.y >= minY && nemo.y <= maxY) {
                    nemo.selected = true;
                    selectedNemos.push(nemo);
                }
            });
        }

        selectionRect = null;
    }

    if (rightClickDragStarted && e.button === 2) {
        rightClickDragStarted = false;
        const pos = worldMouse();
        moveRect.x2 = pos.x;
        moveRect.y2 = pos.y;
        const dragW = Math.abs(moveRect.x2 - moveRect.x1);
        const dragH = Math.abs(moveRect.y2 - moveRect.y1);

        if (dragW < 5 && dragH < 5) {
            // 드래그 거리가 짧으면 일반 우클릭(이동/공격)으로 처리합니다.
            handleRightClick(pos);
        } else if (selectedSquads.length > 0) {
            // 드래그 거리가 길면 진형 이동으로 처리합니다.
            const startPos = { x: moveRect.x1, y: moveRect.y1 };
            const endPos = { x: moveRect.x2, y: moveRect.y2 };
            const centerPos = { x: (startPos.x + endPos.x) / 2, y: (startPos.y + endPos.y) / 2 };
            selectedSquads.forEach(squad => squad.setFormationShape(startPos, endPos, centerPos));
            moveIndicators.push(new MoveIndicator(centerPos.x, centerPos.y, 40, 20, 'yellow'));
        }
        moveRect = null;
        e.preventDefault();
    }
});

canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});

function resolveCollisions() {
    for (let i = 0; i < nemos.length; i++) {
        for (let j = i + 1; j < nemos.length; j++) {
            const a = nemos[i];
            const b = nemos[j];
            const minDist = (a.size / 2) + (b.size / 2);
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distSq = dx * dx + dy * dy;
            const minDistSq = minDist * minDist;
            if (distSq > 0 && distSq < minDistSq) {
                const dist = Math.sqrt(distSq);
                const overlap = minDist - dist;
                const nx = dx / dist;
                const ny = dy / dist;
                a.x -= nx * overlap / 2;
                a.y -= ny * overlap / 2;
                b.x += nx * overlap / 2;
                b.y += ny * overlap / 2;
            }
        }
    }
}

// 게임 루프
function gameLoop() {
    // 카메라 업데이트 (마우스 위치에 따라 이동)
    updateCamera();

    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    
    // (기존의 배경 그리기 호출은 제거합니다.)


    // Nemo 업데이트 (플랫폼 업데이트 및 Nemo 이동)
    const enemies = [...nemos, ...workers];
    nemos.forEach(nemo => nemo.update(enemies, squadManager));
    resolveCollisions();

    workers.forEach(w => w.update(mineralPatches, mineralPieces, storages));

    // 사망한 네모 제거 및 선택 목록 정리
    for (let i = nemos.length - 1; i >= 0; i--) {
        if (nemos[i].dead) {
            const dead = nemos[i];
            nemos.splice(i, 1);
            const idx = selectedNemos.indexOf(dead);
            if (idx !== -1) selectedNemos.splice(idx, 1);
        }
    }
    for (let i = workers.length - 1; i >= 0; i--) {
        if (workers[i].dead) {
            const dead = workers[i];
            workers.splice(i, 1);
            const idx = selectedWorkers.indexOf(dead);
            if (idx !== -1) selectedWorkers.splice(idx, 1);
        }
    }
    // 죽은 네모가 포함된 스쿼드 정리
    squadManager.squads.forEach(squad => {
        squad.nemos = squad.nemos.filter(n => !n.dead);
    });
    squadManager.squads = squadManager.squads.filter(squad => squad.nemos.length > 0);
    squadManager.updateSquads(nemos);

    // 고스트 네모 및 작업자 위치 갱신
    if (ghostSquad) {
        const { x, y } = worldMouse();
        // squadCenter가 leader 기반으로 변경되었으므로 leader 위치를 중심으로 사용합니다.
        let dx = 0;
        let dy = 0;
        if (ghostSquad.leader) {
            dx = x - ghostSquad.leader.x;
            dy = y - ghostSquad.leader.y;
        }

        ghostSquad.nemos.forEach(n => {
            n.x += dx;
            n.y += dy;
        });
        ghostSquad.update(); // 바운드 및 중심 업데이트
    }
    if (ghostWorker) {
        const { x, y } = worldMouse();
        ghostWorker.x = x;
        ghostWorker.y = y;
    }
    if (ghostBuilding) {
        const { x, y } = worldMouse();
        const snapped = mainGrid.snap(x, y);
        ghostBuilding.x = snapped.x;
        ghostBuilding.y = snapped.y;
    }

    // ★ 카메라 변환 및 확대/축소 적용 ★  
    // ctx.scale(scale, scale)와 ctx.translate(-cameraX, -cameraY)를 통해
    // 모든 드로잉 작업(배경, Nemo 등)이 확대/축소 및 카메라 이동의 영향을 받습니다.
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-cameraX, -cameraY);

    // 배경 그리기 (월드 좌표 기준)
    ctx.drawImage(background, 0, 0, backgroundWidth, backgroundHeight);

    mainGrid.draw(ctx);

    mineralPatches.forEach(p => p.draw(ctx));
    storages.forEach(s => s.draw(ctx));
    mineralPieces.forEach(p => p.draw(ctx));
    workers.forEach(w => w.draw(ctx));

    // Nemo 객체들을 배경 위에 그리기
    nemos.forEach(nemo => nemo.draw(ctx));
    // 그룹 하이라이트를 네모 위에 그려 선택 효과가 잘 보이도록 함
    squadManager.draw(ctx);
    moveIndicators.forEach(ind => {
        ind.update();
        ind.draw(ctx);
    });
    for (let i = moveIndicators.length - 1; i >= 0; i--) {
        if (moveIndicators[i].isDone()) moveIndicators.splice(i, 1);
    }
    gatherEffects.forEach(e => {
        e.update();
        e.draw(ctx);
    });
    for (let i = gatherEffects.length - 1; i >= 0; i--) {
        if (gatherEffects[i].isDone()) gatherEffects.splice(i, 1);
    }
    deathEffects.forEach(e => {
        e.update();
        e.draw(ctx);
    });
    for (let i = deathEffects.length - 1; i >= 0; i--) {
        if (deathEffects[i].isDone()) deathEffects.splice(i, 1);
    }
    if (ghostSquad) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ghostSquad.nemos.forEach(n => n.draw(ctx));
        ghostSquad.draw(ctx);
        ctx.restore();
    }
    if (ghostWorker) ghostWorker.draw(ctx);
    if (ghostBuilding) ghostBuilding.draw(ctx);
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

    if (attackKey) {
        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    if (mineKey) {
        ctx.save();
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    mineralSpan.textContent = TeamManagers.blue.getMinerals();
    updateCommandPanel();
    requestAnimationFrame(gameLoop);
}

// 배경 이미지 로드 완료 후 게임 루프 시작
background.onload = () => {
    gameLoop();
};


export { mainGrid, deathEffects, gatherEffects };
