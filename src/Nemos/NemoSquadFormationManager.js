// NemoSquadFormationManager.js

export class NemoSquadFormationManager {
    constructor(squad) {
        this.squad = squad; // Reference to the parent squad
        this.formationPositions = new Map(); // 네모 ID별 진형 위치
        this.tactics = 'default'; // 스쿼드의 전술 상태
        this.formationWidth = this.squad.cellSize * 5; // 진형의 기본 너비
        this.lineAssignments = new Map(); // 네모 ID별 라인 할당

        this.lastFormationCheckTime = 0; // 마지막으로 진형을 재계산한 시간
        this.formationCheckInterval = 1000; // 진형 재계산 간격 (ms)

        this.assignFormationLines();
    }

    update() {
        this.updateFormation();

        // 주기적으로 진형을 재할당하여 유닛 손실 등에 대응합니다.
        // 전투 중(isEngaging)이 아닐 때만 진형을 재정비합니다.
        const now = Date.now();
        if (!this.squad.isEngaging && now - this.lastFormationCheckTime > this.formationCheckInterval) {
            this.reassignFormationLines();
        }
    }

    reassignFormationLines() {
        this.assignFormationLines();
        this.lastFormationCheckTime = Date.now();
    }

    assignFormationLines() {
        this.lineAssignments.clear();
        const { leader } = this.squad;
        if (!leader) return;

        if (this.tactics === 'default') {
            const line1 = [];
            const line2 = [];
            const line3 = [];
            const remainingNemos = [];

            // 1. 리더는 3선에 배치
            line3.push(leader);

            // 2. 나머지 유닛 분류
            this.squad.nemos.forEach(nemo => {
                if (nemo !== leader) {
                    remainingNemos.push(nemo);
                }
            });

            // 3. 나머지 유닛을 3:1 비율로 1열과 2열에 배치
            for (let i = 0; i < remainingNemos.length; i++) {
                if (i % 4 < 3) { // 0, 1, 2는 1열
                    line1.push(remainingNemos[i]);
                } else { // 3은 2열
                    line2.push(remainingNemos[i]);
                }
            }

            // 4. 최종 할당
            line1.forEach(n => { n.formationLine = 1; this.lineAssignments.set(n.id, 1); });
            line2.forEach(n => { n.formationLine = 2; this.lineAssignments.set(n.id, 2); });
            line3.forEach(n => { n.formationLine = 3; this.lineAssignments.set(n.id, 3); });
        }
    }

    updateFormation() {

        const { leader } = this.squad;
        if (!leader) return;

        const direction = this.squad.primaryDirection; // 스쿼드의 주 방향을 사용
        const perpendicular = direction + Math.PI / 2; // 대형의 좌우 방향
        let spacing = this.squad.cellSize * 1.2; // 유닛 간 기본 간격
        const lineDepth = this.squad.cellSize * 2; // 라인 간 깊이

        // 스쿼드의 현재 중심점을 기준으로 진형을 계산합니다.
        // 이동 중일 때는 가상 중심점을, 정지 시에는 리더의 위치를 사용합니다.
        const squadCenter = this.squad.squadDestination
            ? { x: this.squad.currentPos.x, y: this.squad.currentPos.y }
            : { x: leader.x, y: leader.y };

        this.formationPositions.clear(); // 매번 위치를 새로 계산
    
        const lines = { 1: [], 2: [], 3: [] };
        this.squad.nemos.forEach(n => {
            if (lines[n.formationLine]) {
                lines[n.formationLine].push(n);
            }
        });
    
        Object.keys(lines).forEach(lineNumber => {
            const lineNemos = lines[lineNumber];
            const lineCount = lineNemos.length;
            if (lineCount === 0) return;
    
            // 진형 너비에 맞춰 유닛 간 간격 동적 조절
            if (lineCount > 1) {
                spacing = this.formationWidth / (lineCount - 1);
            } else {
                spacing = 0;
            }
            // 3선에 있는 리더를 기준으로 라인 오프셋 계산
            // 1선은 전방, 2선은 중간, 3선은 기준 위치
            const leaderLine = 3;
            const lineOffset = (parseInt(lineNumber) - leaderLine) * -lineDepth;
            const lineCenterX = squadCenter.x + Math.cos(direction) * lineOffset;
            const lineCenterY = squadCenter.y + Math.sin(direction) * lineOffset;
    
            lineNemos.forEach((nemo, index) => {
                const posOffset = (index - (lineCount - 1) / 2) * spacing;
                let x = lineCenterX + Math.cos(perpendicular) * posOffset;
                let y = lineCenterY + Math.sin(perpendicular) * posOffset;
                // 대기 중 진형 유지는 그리드에 맞추지 않아 더 부드럽게 보입니다.
                this.formationPositions.set(nemo.id, { x, y });
            });
        });
    }

    calculateDestinationFormation(center, direction) {
        let leaderPoint = null;
        const otherPoints = [];

        const perpendicular = direction + Math.PI / 2;
        let spacing = this.squad.cellSize * 1.2;
        const lineDepth = this.squad.cellSize * 2;

        const lines = { 1: [], 2: [], 3: [] };
        this.squad.nemos.forEach(n => {
            if (lines[n.formationLine]) {
                lines[n.formationLine].push(n);
            }
        });

        Object.keys(lines).forEach(lineNumber => {
            const lineNemos = lines[lineNumber];
            const lineCount = lineNemos.length;
            if (lineCount === 0) return;

            if (lineCount > 1) {
                spacing = this.formationWidth / (lineCount - 1);
            } else {
                spacing = 0;
            }

            // 목표 지점(center)을 기준으로 라인 오프셋 계산
            // 3선이 기준이 되도록 조정
            const leaderLine = 3;
            const lineOffset = (parseInt(lineNumber) - leaderLine) * -lineDepth;
            const lineCenterX = center.x + Math.cos(direction) * lineOffset;
            const lineCenterY = center.y + Math.sin(direction) * lineOffset;

            lineNemos.forEach((nemo, i) => {
                const posOffset = (i - (lineCount - 1) / 2) * spacing;
                let x = lineCenterX + Math.cos(perpendicular) * posOffset;
                let y = lineCenterY + Math.sin(perpendicular) * posOffset;

                const grid = this.squad.cellSize / 4;
                x = Math.round(x / grid) * grid;
                y = Math.round(y / grid) * grid;

                if (nemo === this.squad.leader) {
                    leaderPoint = { x, y };
                } else {
                    otherPoints.push({ x, y });
                }
            });
        });

        // 리더의 목적지와 나머지 유닛들의 목적지를 분리하여 반환합니다.
        return { leaderPoint, otherPoints };
    }
}