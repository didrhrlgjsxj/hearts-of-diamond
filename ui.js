import { DIVISION_TEMPLATES } from './src/Armies/division_templates.js';
import { CommandUnit } from './src/Armies/unitEchelons.js';
import Nemo from './src/Nemos/Nemo.js';
import { NemoPlatoon, NemoSquad } from './src/Nemos/NemoSquadManager.js';

// main.js에서 생성될 ghostSquad를 위한 전역 변수 선언
window.ghostSquad = null;

/**
 * 게임의 사용자 인터페이스(UI)를 관리하는 클래스입니다.
 */
export class GameUI {
    /**
     * @param {Camera} camera
     * @param {Unit[]} topLevelUnits
     * @param {Nemo[]} nemos
     * @param {Worker[]} workers
     * @param {NemoPlatoonManager} platoonManager
     */
    constructor(camera, topLevelUnits, nemos, workers, platoonManager) {
        this.camera = camera;
        this.topLevelUnits = topLevelUnits;
        this.nemos = nemos;
        this.platoonManager = platoonManager;
        this.workers = workers; // Nemo 소환에 필요
        this.createControlPanel();


        // 부대 구성 정보 패널 생성
        this.compositionPanel = document.createElement('div');
        this.compositionPanel.id = 'composition-panel';
        document.body.appendChild(this.compositionPanel);
        this.updateCompositionPanel(null); // 처음에는 숨김
    }

    /**
     * 유닛 소환을 위한 컨트롤 패널 UI를 생성합니다.
     */
    createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'control-panel';

        // 진형 리셋 버튼 (처음에는 숨김)
        this.resetFormationButton = document.createElement('button');
        this.resetFormationButton.id = 'reset-formation-button';
        this.resetFormationButton.textContent = '기본 진형으로 복귀';

        // 팀 선택
        const teamSelect = this.createSelect('team-select', '팀 선택:', {
            blue: '블루',
            red: '레드'
        });

        // 유닛 타입 선택
        const templateOptions = {};
        Object.keys(DIVISION_TEMPLATES).forEach(key => {
            templateOptions[key] = DIVISION_TEMPLATES[key].name;
        });
        const unitTypeSelect = this.createSelect('unit-type-select', '부대 설계:', templateOptions);

        // 소환 버튼
        const spawnButton = document.createElement('button');
        spawnButton.textContent = '소환';
        spawnButton.onclick = () => this.spawnArmyUnit();

        // Nemo 소환 버튼들
        const spawnRedNemoUnitBtn = document.createElement('button');
        spawnRedNemoUnitBtn.textContent = 'Nemo Red Unit';
        spawnRedNemoUnitBtn.onclick = () => this.spawnNemoSquad('A', 'red');

        const spawnBlueNemoUnitBtn = document.createElement('button');
        spawnBlueNemoUnitBtn.textContent = 'Nemo Blue Unit';
        spawnBlueNemoUnitBtn.onclick = () => this.spawnNemoSquad('A', 'blue');

        // 시간 제어 버튼
        const timeControlContainer = document.createElement('div');
        timeControlContainer.style.marginTop = '15px';
        timeControlContainer.innerHTML = '<h3>시간 제어</h3>';

        const pauseBtn = this.createTimeControlButton('일시정지', 0);
        const play1xBtn = this.createTimeControlButton('1x', 1);
        const play2xBtn = this.createTimeControlButton('2x', 2);
        const play3xBtn = this.createTimeControlButton('3x', 3);

        play1xBtn.classList.add('active'); // 기본값으로 1배속 활성화

        timeControlContainer.append(pauseBtn, play1xBtn, play2xBtn, play3xBtn);

        panel.append(this.resetFormationButton, '<h3>Armies 소환</h3>', teamSelect.label, teamSelect.select, unitTypeSelect.label, unitTypeSelect.select, spawnButton);
        panel.append(document.createElement('hr'), '<h3>Nemos 소환</h3>', spawnRedNemoUnitBtn, spawnBlueNemoUnitBtn, timeControlContainer);
        document.body.appendChild(panel);

    }

    createTimeControlButton(text, scale) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'time-control-btn';
        button.onclick = () => window.setTimeScale(scale, button);
        return button;
    }

    createSelect(id, labelText, options) {
        const label = document.createElement('label');
        label.htmlFor = id;
        label.textContent = labelText;

        const select = document.createElement('select');
        select.id = id;
        for (const [value, text] of Object.entries(options)) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = text;
            select.appendChild(option);
        }
        return { label, select };
    }

    spawnArmyUnit() {
        const team = document.getElementById('team-select').value;
        const templateKey = document.getElementById('unit-type-select').value;
        const template = DIVISION_TEMPLATES[templateKey];

        // 카메라 중앙 위치에 유닛을 소환합니다.
        const spawnPos = this.camera.screenToWorld(this.camera.canvas.width / 2, this.camera.canvas.height / 2);

        if (template && template.build) {
            // 최상위 부대는 부모 이름이 없으므로 null을 전달합니다.
            const newUnit = template.build(null, spawnPos.x, spawnPos.y, team);
            if (newUnit) {
                this.topLevelUnits.push(newUnit);
                console.log(`Spawned: ${newUnit.name}`);
            } else {
                console.warn(`Could not spawn unit. The template "${template.name}" is not spawnable as a top-level unit.`);
            }
        }
    }

    /**
     * 화면 중앙에 Nemo 스쿼드를 즉시 소환합니다.
     * @param {string} squadType - 스쿼드 타입 ('A', 'B' 등)
     * @param {string} team - 소환할 팀 ('red' 또는 'blue')
     */
    spawnNemoSquad(squadType, team) {
        const spawnPos = this.camera.screenToWorld(this.camera.canvas.width / 2, this.camera.canvas.height / 2);
        const squadNemos = [];
        const numUnits = 3;

        for (let i = 0; i < numUnits; i++) {
            // 유닛들을 소환 위치 주변에 약간 흩어지게 배치
            const offsetX = (Math.random() - 0.5) * 80;
            const offsetY = (Math.random() - 0.5) * 80;
            let newNemo;

            if (squadType === 'A') { // A형: unit 3기
                newNemo = new Nemo(spawnPos.x + offsetX, spawnPos.y + offsetY, team, ["attack"], "unit", "sqaudio", "ranged", false);
            } else { // B형: sqaudio 3기
                newNemo = new Nemo(spawnPos.x + offsetX, spawnPos.y + offsetY, team, ["attack", "attack"], "army", "sqaudio", "ranged", true);
            }
            squadNemos.push(newNemo);
            this.nemos.push(newNemo); // main.js의 nemos 배열에 추가
        }

        // NemoSquad 인스턴스를 생성하고 NemoPlatoonManager에 등록합니다.
        const newSquad = new NemoSquad(squadNemos, team);
        squadNemos.forEach(n => n.squad = newSquad);
        this.platoonManager.platoons.push(new NemoPlatoon([newSquad], team, null)); // 독립 스쿼드는 parentCompany가 없음

        console.log(`Spawned: Nemo Squad (Type: ${squadType}, Team: ${team})`);
    }

    /**
     * 선택된 유닛의 분대 구성 정보를 UI에 업데이트합니다.
     * @param {Unit | null} unit 선택된 유닛 또는 null
     */
    updateCompositionPanel(unit) {
        if (!unit) {
            this.compositionPanel.innerHTML = '';
            this.compositionPanel.style.display = 'none';
            return;
        }

        // 진형 리셋 버튼 표시 여부 결정
        if (unit instanceof CommandUnit) {
            this.resetFormationButton.style.display = 'block';
            this.resetFormationButton.onclick = () => {
                if (unit.resetFormation) {
                    unit.resetFormation();
                    console.log(`${unit.name}의 진형을 기본값으로 재설정합니다.`);
                }
            };
        } else {
            this.resetFormationButton.style.display = 'none';
        }


        const allCompanies = unit.getAllCompanies();
        const composition = {};

        // 각 중대의 하위 분대 타입을 집계합니다.
        for (const company of allCompanies) {
            const squads = company.getAllSquads();
            squads.forEach(squad => {
                if (!composition[squad.type]) {
                    composition[squad.type] = { active: 0, total: 0 };
                }
                composition[squad.type].total++;
                if (!squad.isDestroyed) {
                    composition[squad.type].active++;
                }
            });
        }
        let html = `<h3>부대 구성</h3>`;
        if (Object.keys(composition).length > 0) {
            html += '<ul>';
            Object.entries(composition).forEach(([type, counts]) => {
                html += `<li>${type}: ${counts.active} / ${counts.total}</li>`;
            });
            html += '</ul>';
        }
        this.compositionPanel.innerHTML = html;
        this.compositionPanel.style.display = 'block';
    }
}