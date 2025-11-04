/**
 * 게임의 사용자 인터페이스(UI)를 관리하는 클래스입니다.
 */
class GameUI {
    /**
     * @param {Camera} camera - 게임 카메라 인스턴스
     * @param {Map<string, Nation>} nations - 국가 목록
     */
    constructor(camera, nations) {
        this.camera = camera;
        this.nations = nations;
        this.createMainInterface();


        // 부대 구성 정보 패널 생성
        this.compositionPanel = document.createElement('div');
        this.compositionPanel.id = 'composition-panel';
        document.body.appendChild(this.compositionPanel);
        this.updateCompositionPanel(null); // 처음에는 숨김

        // 생산 정보 패널 생성
        this.productionPanel = document.createElement('div');
        this.productionPanel.id = 'production-panel';
        document.body.appendChild(this.productionPanel);
    }

    /**
     * 메인 UI 컨테이너와 패널 전환 버튼을 생성합니다.
     */
    createMainInterface() {
        const container = document.createElement('div');
        container.id = 'main-ui-container';

        // 패널 전환 버튼 생성
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'panel-toggle-buttons';

        const economyButton = document.createElement('button');
        economyButton.textContent = '경제 관리';
        economyButton.onclick = () => this.switchMainPanel('economy');

        const unitButton = document.createElement('button');
        unitButton.textContent = '부대 디버깅';
        unitButton.onclick = () => this.switchMainPanel('unit-debug');

        buttonContainer.append(economyButton, unitButton);

        // 각 기능 패널 생성
        this.economyPanel = this.createEconomyPanel();
        this.unitDebugPanel = this.createUnitDebugPanel();

        container.append(buttonContainer, this.economyPanel, this.unitDebugPanel);
        document.body.appendChild(container);

        // 초기 활성 패널 설정
        this.switchMainPanel('economy');
    }

    /**
     * 경제 관리 패널을 생성합니다.
     * @returns {HTMLElement}
     */
    createEconomyPanel() {
        const panel = document.createElement('div');
        panel.id = 'economy-panel';
        panel.className = 'main-panel';

        const productionHeader = document.createElement('h3');
        productionHeader.textContent = '생산 관리';

        const teamSelect = this.createSelect('team-select', '국가 선택:', {
            blue: '블루 공화국',
            red: '레드 왕국'
        });

        const equipmentOptions = {};
        Object.keys(EQUIPMENT_TYPES).forEach(key => {
            equipmentOptions[key] = EQUIPMENT_TYPES[key].name;
        });
        const equipmentSelect = this.createSelect('equipment-select', '장비 선택:', equipmentOptions);

        const factoryInputLabel = document.createElement('label');
        factoryInputLabel.htmlFor = 'factory-input';
        factoryInputLabel.textContent = '할당 공장 수:';
        const factoryInput = document.createElement('input');
        factoryInput.type = 'number';
        factoryInput.id = 'factory-input';
        factoryInput.value = '1';
        factoryInput.min = '1';

        const addLineButton = document.createElement('button');
        addLineButton.textContent = '생산 라인 추가';
        addLineButton.onclick = () => this.addProductionLine();

        panel.append(productionHeader, teamSelect.label, teamSelect.select, equipmentSelect.label, equipmentSelect.select, factoryInputLabel, factoryInput, addLineButton);
        return panel;
    }

    /**
     * 부대 디버깅(소환) 패널을 생성합니다.
     * @returns {HTMLElement}
     */
    createUnitDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'unit-debug-panel';
        panel.className = 'main-panel';

        const spawnHeader = document.createElement('h3');
        spawnHeader.textContent = '부대 소환 (디버그)';

        const teamSelect = this.createSelect('unit-team-select', '팀 선택:', { blue: '블루 공화국', red: '레드 왕국' });

        const templateOptions = {};
        Object.keys(DIVISION_TEMPLATES).forEach(key => {
            templateOptions[key] = DIVISION_TEMPLATES[key].name;
        });
        const templateSelect = this.createSelect('template-select', '부대 설계:', templateOptions);

        const spawnButton = document.createElement('button');
        spawnButton.textContent = '소환';
        spawnButton.onclick = () => this.spawnUnit();

        this.resetFormationButton = document.createElement('button');
        this.resetFormationButton.id = 'reset-formation-button';
        this.resetFormationButton.textContent = '기본 진형으로 복귀';

        panel.append(spawnHeader, teamSelect.label, teamSelect.select, templateSelect.label, templateSelect.select, spawnButton, this.resetFormationButton);
        return panel;
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

    /**
     * 메인 UI 패널을 전환합니다.
     * @param {'economy' | 'unit-debug'} panelName 
     */
    switchMainPanel(panelName) {
        const buttons = document.querySelectorAll('.panel-toggle-buttons button');
        buttons.forEach(btn => btn.classList.remove('active'));

        this.economyPanel.classList.remove('active');
        this.unitDebugPanel.classList.remove('active');

        if (panelName === 'economy') {
            this.economyPanel.classList.add('active');
            buttons[0].classList.add('active');
        } else if (panelName === 'unit-debug') {
            this.unitDebugPanel.classList.add('active');
            buttons[1].classList.add('active');
        }
    }

    spawnUnit() {
        const team = document.getElementById('unit-team-select').value;
        const templateKey = document.getElementById('template-select').value;
        const template = DIVISION_TEMPLATES[templateKey];

        if (template && template.build) {
            const worldCoords = this.camera.screenToWorld(this.camera.canvas.width / 2, this.camera.canvas.height / 2);
            const newUnit = template.build(template.name, worldCoords.x, worldCoords.y, team);
            if (newUnit) topLevelUnits.push(newUnit);
        }
    }

    addProductionLine() {
        const team = document.getElementById('team-select').value;
        const equipmentKey = document.getElementById('equipment-select').value;
        const assignedFactories = parseInt(document.getElementById('factory-input').value, 10);
        const nation = this.nations.get(team);

        if (nation && equipmentKey && assignedFactories > 0) {
            nation.addProductionLine(equipmentKey, assignedFactories);
            console.log(`${nation.name}에 ${EQUIPMENT_TYPES[equipmentKey].name} 생산 라인을 ${assignedFactories}개 공장으로 추가합니다.`);
        } else {
            console.error("국가, 장비 또는 공장 수를 올바르게 선택해주세요.");
        }
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

    /**
     * 모든 국가의 생산 현황과 장비 비축량을 UI에 업데이트합니다.
     */
    updateProductionPanel() {
        let html = ``;
        this.nations.forEach(nation => {
            html += `<h3>${nation.name} 현황</h3>`;
            html += `<div>(경공업: ${nation.lightIndustry} / 중공업: ${nation.heavyIndustry})</div>`;

            // 장비 비축량 표시
            html += `<h4>장비 비축량</h4>`;
            const stockpile = nation.equipmentStockpile;
            if (Object.keys(stockpile).length > 0) {
                html += '<ul>';
                Object.keys(stockpile).forEach(key => {
                    html += `<li>${EQUIPMENT_TYPES[key].name}: ${stockpile[key]}</li>`;
                });
                html += '</ul>';
            } else {
                html += '<p>비축 장비 없음</p>';
            }

            // 생산 라인 표시
            html += `<h4>생산 라인</h4>`;
            if (nation.productionLines.length > 0) {
                html += '<ul>';
                nation.productionLines.forEach((line) => {
                    const equipment = EQUIPMENT_TYPES[line.equipmentKey];
                    const progressPercent = (line.progress / equipment.productionCost * 100).toFixed(1);
                    const efficiencyPercent = (line.efficiency * 100).toFixed(1);
                    html += `<li>
                        ${equipment.name} (공장: ${line.assignedFactories})<br>
                        <progress value="${progressPercent}" max="100"></progress> ${progressPercent}%<br>
                        <small>효율: ${efficiencyPercent}%</small>
                    </li>`;
                });
                html += '</ul>';
            } else {
                html += '<p>가동중인 생산 라인 없음</p>';
            }
        });
        this.productionPanel.innerHTML = html;
    }
}