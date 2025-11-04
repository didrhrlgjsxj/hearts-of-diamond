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
        this.createControlPanel();


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
     * 생산 관리를 위한 컨트롤 패널 UI를 생성합니다.
     */
    createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'control-panel';

        // --- 기존 유닛 관련 UI ---
        this.resetFormationButton = document.createElement('button');
        this.resetFormationButton.id = 'reset-formation-button';
        this.resetFormationButton.textContent = '기본 진형으로 복귀';

        // --- 새로운 생산 관련 UI ---
        const productionHeader = document.createElement('h3');
        productionHeader.textContent = '생산 관리';

        // 국가 선택
        const teamSelect = this.createSelect('team-select', '국가 선택:', {
            blue: '블루 공화국',
            red: '레드 왕국'
        });

        // 생산할 장비 선택
        const equipmentOptions = {};
        Object.keys(EQUIPMENT_TYPES).forEach(key => {
            equipmentOptions[key] = EQUIPMENT_TYPES[key].name;
        });
        const equipmentSelect = this.createSelect('equipment-select', '장비 선택:', equipmentOptions);

        // 할당할 공장 수 입력
        const factoryInputLabel = document.createElement('label');
        factoryInputLabel.htmlFor = 'factory-input';
        factoryInputLabel.textContent = '할당 공장 수:';
        const factoryInput = document.createElement('input');
        factoryInput.type = 'number';
        factoryInput.id = 'factory-input';
        factoryInput.value = '5';
        factoryInput.min = '1';

        // 생산 라인 추가 버튼
        const addLineButton = document.createElement('button');
        addLineButton.textContent = '생산 라인 추가';
        addLineButton.onclick = () => this.addProductionLine();

        panel.append(this.resetFormationButton, productionHeader, teamSelect.label, teamSelect.select, equipmentSelect.label, equipmentSelect.select, factoryInputLabel, factoryInput, addLineButton);
        document.body.appendChild(panel);
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