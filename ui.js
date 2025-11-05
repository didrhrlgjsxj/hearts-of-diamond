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

        // 전투 정보 패널 생성
        this.battlePanel = document.createElement('div');
        this.battlePanel.id = 'battle-panel';
        document.body.appendChild(this.battlePanel);
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

        const lightFactoryLabel = document.createElement('label');
        lightFactoryLabel.htmlFor = 'light-factory-input';
        lightFactoryLabel.textContent = '할당 경공업 수:';
        const lightFactoryInput = document.createElement('input');
        lightFactoryInput.type = 'number';
        lightFactoryInput.id = 'light-factory-input';
        lightFactoryInput.value = '1';
        lightFactoryInput.min = '0';

        const heavyFactoryLabel = document.createElement('label');
        heavyFactoryLabel.htmlFor = 'heavy-factory-input';
        heavyFactoryLabel.textContent = '할당 중공업 수:';
        const heavyFactoryInput = document.createElement('input');
        heavyFactoryInput.type = 'number';
        heavyFactoryInput.id = 'heavy-factory-input';
        heavyFactoryInput.value = '0';
        heavyFactoryInput.min = '0';

        const addLineButton = document.createElement('button');
        addLineButton.textContent = '생산 라인 추가';
        addLineButton.onclick = () => this.addProductionLine();

        panel.append(productionHeader, teamSelect.label, teamSelect.select, equipmentSelect.label, equipmentSelect.select, 
                     lightFactoryLabel, lightFactoryInput, heavyFactoryLabel, heavyFactoryInput, 
                     addLineButton);
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

    /**
     * 시간 및 속도 제어 UI를 생성합니다.
     */
    createTimeControls() {
        const timeControls = document.createElement('div');
        timeControls.id = 'time-controls';

        const speeds = [1, 2, 3, 4];
        speeds.forEach(speed => {
            const button = document.createElement('button');
            button.textContent = `${speed}x`;
            button.dataset.speed = speed;
            button.onclick = () => {
                setGameSpeed(speed);
                this.updateTimeControls();
            };
            timeControls.appendChild(button);
        });

        // timeDisplay 요소는 main.js에서 생성되므로, 그 안에 컨트롤을 추가합니다.
        const timeDisplayContainer = document.getElementById('time-display');
        if (timeDisplayContainer) {
            timeDisplayContainer.appendChild(timeControls); // 시간 텍스트(span)와 나란히 추가됩니다.
        }

        this.updateTimeControls(); // 초기 활성 버튼 설정
    }

    /**
     * 현재 게임 속도에 맞춰 시간 제어 버튼의 활성 상태를 업데이트합니다.
     */
    updateTimeControls() {
        const buttons = document.querySelectorAll('#time-controls button');
        buttons.forEach(button => {
            if (parseInt(button.dataset.speed, 10) === gameSpeed) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
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
        const assignedLight = parseInt(document.getElementById('light-factory-input').value, 10);
        const assignedHeavy = parseInt(document.getElementById('heavy-factory-input').value, 10);
        const nation = this.nations.get(team);
        const totalFactories = assignedLight + assignedHeavy;

        if (nation && equipmentKey && totalFactories > 0) {
            const success = nation.economy.addProductionLine(equipmentKey, assignedLight, assignedHeavy);
            if (success) {
                console.log(`${nation.name}에 ${EQUIPMENT_TYPES[equipmentKey].name} 생산 라인을 경공업 ${assignedLight}, 중공업 ${assignedHeavy}으로 추가합니다.`);
            }
        } else {
            console.error("국가, 장비를 올바르게 선택하고, 최소 1개 이상의 공장을 할당해주세요.");
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
            const availableFactories = nation.economy.getAvailableFactories();
            html += `<h3>${nation.name} 현황</h3>`;
            html += `<div>총 공장: (경: ${nation.economy.lightIndustry} / 중: ${nation.economy.heavyIndustry})</div>`;
            html += `<div>가용 공장: (경: ${availableFactories.light} / 중: ${availableFactories.heavy})</div>`;
            html += `<div>경제 단위: ${Math.floor(nation.economy.economicUnits)}</div>`;

            // 장비 비축량 표시
            html += `<h4>장비 비축량</h4>`;
            const stockpile = nation.economy.equipmentStockpile;
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
            if (nation.economy.productionLines.length > 0) {
                html += '<ul>';
                nation.economy.productionLines.forEach((line) => {
                    const equipment = EQUIPMENT_TYPES[line.equipmentKey];
                    const progressPercent = (line.progress / equipment.productionCost * 100).toFixed(1);
                    const efficiencyPercent = (line.efficiency * 100).toFixed(1);
                    html += `<li>
                        ${equipment.name} (경: ${line.assignedLightFactories} / 중: ${line.assignedHeavyFactories})<br>
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

    /**
     * 전투 중계 패널의 내용을 업데이트합니다.
     * @param {{unitA: Unit, unitB: Unit} | null} battle 
     */
    updateBattlePanel(battle) {
        if (!battle || battle.unitA.isDestroyed || battle.unitB.isDestroyed) {
            this.battlePanel.style.display = 'none';
            return;
        }

        // 1. 두 부대의 중간 지점(월드 좌표)을 계산
        const midX = (battle.unitA.x + battle.unitB.x) / 2;
        const midY = (battle.unitA.y + battle.unitB.y) / 2;

        // 2. 월드 좌표를 화면 좌표로 변환
        const screenPos = this.camera.worldToScreen(midX, midY);

        // 3. UI 패널의 위치와 내용을 설정
        this.battlePanel.style.display = 'block'; // flex 대신 block으로 변경
        this.battlePanel.style.left = `${screenPos.x}px`;
        this.battlePanel.style.top = `${screenPos.y}px`;
        // 패널의 중앙이 계산된 위치에 오도록 transform을 사용합니다.
        this.battlePanel.style.transform = 'translate(-50%, -50%)';

        this.battlePanel.innerHTML = `
            <div class="battle-indicator"></div>
            <div class="battle-details">
                <div class="battle-unit-display" style="color: ${battle.unitA.team === 'blue' ? '#6495ED' : '#FF6347'};">
                    ${this.getUnitBattleHTML(battle.unitA)}
                </div>
                <div class="battle-unit-display" style="color: ${battle.unitB.team === 'blue' ? '#6495ED' : '#FF6347'}; text-align: right;">
                    ${this.getUnitBattleHTML(battle.unitB)}
                </div>
            </div>
        `;
    }

    /**
     * 전투 중계 패널에 표시될 개별 유닛의 HTML을 생성합니다.
     * @param {Unit} unit 
     * @returns {string}
     */
    getUnitBattleHTML(unit) {
        const orgPercent = (unit.organization / unit.maxOrganization * 100).toFixed(1);
        const strPercent = (unit.currentStrength / unit.baseStrength * 100).toFixed(1);

        // 전술에 따른 공격력 변화를 계산하고 표시 형식 생성
        let softAttackDisplay = unit.softAttack.toFixed(1);
        let hardAttackDisplay = unit.hardAttack.toFixed(1);

        if (unit.tactic && unit.tactic.attackModifier !== 1.0) {
            const modifier = unit.tactic.attackModifier;
            const softAttackChange = unit.softAttack * (modifier - 1);
            const hardAttackChange = unit.hardAttack * (modifier - 1);

            const formatChange = (change) => (change >= 0 ? `+${change.toFixed(1)}` : `${change.toFixed(1)}`);

            softAttackDisplay += ` (${formatChange(softAttackChange)})`;
            hardAttackDisplay += ` (${formatChange(hardAttackChange)})`;
        }

        let tacticInfo = '선택 중...';
        if (unit.tactic) {
            const tactic = unit.tactic;
            let effects = [];

            // 공격력 보너스/페널티
            if (tactic.attackModifier !== 1.0) {
                const modifier = ((tactic.attackModifier - 1) * 100).toFixed(0);
                effects.push(`공격력 ${modifier > 0 ? '+' : ''}${modifier}%`);
            }
            // 조직력 피해 보너스/페널티
            if (tactic.orgDamageModifier !== 1.0) {
                const modifier = ((tactic.orgDamageModifier - 1) * 100).toFixed(0);
                effects.push(`조직력 피해 ${modifier > 0 ? '+' : ''}${modifier}%`);
            }
            tacticInfo = `${tactic.name} <small>(${effects.join(', ')})</small>`;
        }

        return `
            <h4>${unit.name}</h4>
            <div>
                <strong>조직력:</strong> ${Math.floor(unit.organization)} / ${Math.floor(unit.maxOrganization)}
                <progress value="${orgPercent}" max="100" style="width: 100%;"></progress>
            </div>
            <div>
                <strong>내구력:</strong> ${Math.floor(unit.currentStrength)} / ${Math.floor(unit.baseStrength)}
                <progress value="${strPercent}" max="100" style="width: 100%;"></progress>
            </div>
            <p><strong>공격력(소프트/하드):</strong> ${softAttackDisplay} / ${hardAttackDisplay}</p>
            <p><strong>현재 전술:</strong> ${tacticInfo}</p>
        `;
    }
}