/**
 * 게임의 사용자 인터페이스(UI)를 관리하는 클래스입니다.
 */
class GameUI {
    /**
     * @param {Camera} camera - 게임 카메라 인스턴스
     * @param {Map<string, Nation>} nations - 국가 목록
     * @param {UnitManager} unitManager - 유닛 관리자 인스턴스
     */
    constructor(camera, nations, unitManager) {
        this.camera = camera;
        this.nations = nations;
        this.unitManager = unitManager;
        this.createMainInterface();


        // 부대 구성 정보 패널 생성
        this.compositionPanel = document.createElement('div');
        this.compositionPanel.id = 'composition-panel';
        document.body.appendChild(this.compositionPanel);
        this.updateCompositionPanel(null); // 처음에는 숨김
        this.addUIElementListener(this.compositionPanel);

        // 능력치 정보 패널 생성
        this.statsPanel = document.createElement('div');
        this.statsPanel.id = 'stats-panel';
        document.body.appendChild(this.statsPanel);
        this.updateStatsPanel(null); // 처음에는 숨김

        this.addUIElementListener(this.statsPanel);

        // 생산 정보 패널 생성
        this.productionPanel = document.createElement('div');
        this.productionPanel.id = 'production-panel';
        document.body.appendChild(this.productionPanel);
        this.addUIElementListener(this.productionPanel);

        // 전투 정보 패널 생성
        this.battlePanel = document.createElement('div');
        this.battlePanel.id = 'battle-panel';
        document.body.appendChild(this.battlePanel);
        this.addUIElementListener(this.battlePanel);

        // 프로빈스 정보 패널 생성
        this.provinceInfoPanel = document.createElement('div');
        this.provinceInfoPanel.id = 'province-info-panel';
        document.body.appendChild(this.provinceInfoPanel);
        this.updateProvinceInfoPanel(null); // 처음에는 숨김
        this.addUIElementListener(this.provinceInfoPanel);

        // 부대 설계용 툴팁 생성
        this.battalionTooltip = document.createElement('div');
        this.battalionTooltip.id = 'battalion-tooltip';
        document.body.appendChild(this.battalionTooltip);
        this.addUIElementListener(this.battalionTooltip);
    }

    /**
     * UI 요소에 마우스가 진입했을 때 카메라 키 입력을 초기화하는 리스너를 추가합니다.
     * @param {HTMLElement} element 
     */
    addUIElementListener(element) {
        element.addEventListener('mouseenter', () => {
            // 카메라의 모든 키 입력을 리셋하여 이동을 멈춥니다.
            this.camera.resetKeys();
        });
    }

    /**
     * 메인 UI 컨테이너와 패널 전환 버튼을 생성합니다.
     */
    createMainInterface() {
        const container = document.createElement('div');
        container.id = 'main-ui-container';

        // 패널 전환 버튼 생성
        const buttonContainer = document.createElement('div');
        this.addUIElementListener(buttonContainer);
        buttonContainer.className = 'panel-toggle-buttons';

        const economyButton = document.createElement('button');
        economyButton.textContent = '경제 관리';
        economyButton.onclick = () => this.switchMainPanel('economy');

        const unitButton = document.createElement('button');
        unitButton.textContent = '부대 디버깅';
        unitButton.onclick = () => this.switchMainPanel('unit-debug');

        const designerButton = document.createElement('button');
        designerButton.textContent = '부대 설계';
        designerButton.onclick = () => this.switchMainPanel('unit-designer');

        buttonContainer.append(economyButton, unitButton, designerButton);

        // 각 기능 패널 생성
        this.economyPanel = this.createEconomyPanel();
        this.unitDebugPanel = this.createUnitDebugPanel();
        this.unitDesignerPanel = this.createUnitDesignerPanel();

        container.append(buttonContainer, this.economyPanel, this.unitDebugPanel, this.unitDesignerPanel);
        document.body.appendChild(container);
        this.addUIElementListener(container);

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
        // JSON 데이터를 기반으로 드롭다운 메뉴를 채웁니다.
        if (UNIT_TEMPLATES_JSON) {
            Object.keys(UNIT_TEMPLATES_JSON).forEach(key => {
                const template = UNIT_TEMPLATES_JSON[key];
                // 사단급 이상 최상위 편제만 소환 메뉴에 표시합니다.
                if (template.echelon === 'DIVISION' || template.echelon === 'BRIGADE' || template.echelon === 'REGIMENT') {
                    templateOptions[key] = template.name;
                }
            });
        }
        const templateSelect = this.createSelect('template-select', '부대 설계:', templateOptions);

        const spawnButton = document.createElement('button');
        spawnButton.textContent = '소환';
        spawnButton.onclick = () => this.spawnUnit();

        // 나중에 동적으로 업데이트하기 위해 templateSelect를 this에 저장합니다.
        this.unitTemplateSelect = templateSelect.select;
        // 라벨도 저장해두면 좋습니다.
        this.unitTemplateLabel = templateSelect.label;


        this.resetFormationButton = document.createElement('button');
        this.resetFormationButton.id = 'reset-formation-button';
        this.resetFormationButton.textContent = '기본 진형으로 복귀';

        panel.append(spawnHeader, teamSelect.label, teamSelect.select, templateSelect.label, templateSelect.select, spawnButton, this.resetFormationButton);
        return panel;
    }

    /**
     * 부대 설계 패널을 생성합니다.
     * @returns {HTMLElement}
     */
    createUnitDesignerPanel() {
        const panel = document.createElement('div');
        panel.id = 'unit-designer-panel';
        panel.className = 'main-panel';

        let html = `
            <h3>부대 설계자</h3>
            <div>
                <label for="template-name-input">설계 이름:</label>
                <input type="text" id="template-name-input" placeholder="예: 정예 보병 사단">
            </div>
            <div>
                <label for="template-echelon-select">부대 규모:</label>
                <select id="template-echelon-select">
                    <option value="DIVISION">사단 (XX)</option>
                    <option value="BRIGADE">여단 (X)</option>
                    <option value="REGIMENT">연대 (|||)</option>
                    <option value="BATTALION">대대 (||)</option>
                    <option value="COMPANY">중대 (|)</option>
                    <option value="PLATOON">소대 (•)</option>
                </select>
            </div>
            <div id="hq-unit-container">
                <div class="org-chart-header">
                    <h4>본부 부대</h4>
                    <span id="hq-unit-status">0 / 1</span>
                </div>
                <div id="hq-unit-display">본부를 선택하세요.</div>
                <button id="select-hq-button">본부 선택</button>
            </div>
            <div class="org-chart-container">
                <div class="org-chart-header">
                    <h4>편제 구조</h4>
                    <span id="battalion-count-display">0 / 10</span>
                </div>
                <div class="org-chart">
                    <p>하위 부대를 추가하여 편제를 구성하세요.</p>
                </div>
                <button id="add-subunit-button">하위 부대 추가</button>
            </div>
            <div class="designer-buttons">
                <button id="new-design-button">새 설계</button>
                <button id="load-template-button" class="load-button">설계 불러오기</button>
                <button id="save-template-button">설계 저장</button>
            </div>
        `;
        panel.innerHTML = html;

        // 부대 규모 변경 시 편제 초기화 및 UI 업데이트
        panel.querySelector('#template-echelon-select').onchange = () => {
            // 1. 본부 부대 선택 초기화
            const hqDisplay = document.getElementById('hq-unit-display');
            hqDisplay.textContent = '본부를 선택하세요.';
            delete hqDisplay.dataset.templateKey;

            // 2. 편제 구조 초기화
            const orgChart = document.querySelector('#unit-designer-panel .org-chart');
            orgChart.innerHTML = '<p>하위 부대를 추가하여 편제를 구성하세요.</p>';

            // 3. 카운터 및 제한 업데이트
            this.updateBattalionCountLimit();
        };

        // 이벤트 리스너 연결
        panel.querySelector('#add-subunit-button').onclick = () => this.showSubUnitSelection();
        panel.querySelector('#select-hq-button').onclick = () => this.showHqUnitSelection();
        panel.querySelector('#new-design-button').onclick = () => this.resetDesignerPanel();
        panel.querySelector('#load-template-button').onclick = () => this.showTemplateSelectionForLoad();
        panel.querySelector('#save-template-button').onclick = () => this.saveUnitTemplate();

        // 드래그 앤 드롭 이벤트 리스너 추가
        const orgChart = panel.querySelector('.org-chart');
        orgChart.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('battalion-item')) {
                e.target.classList.add('dragging');
            }
        });

        orgChart.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('battalion-item')) {
                e.target.classList.remove('dragging');
            }
        });

        orgChart.addEventListener('dragover', (e) => {
            e.preventDefault(); // 드롭을 허용하기 위해 기본 동작 방지
            const draggingItem = orgChart.querySelector('.dragging');
            if (!draggingItem) return;

            const afterElement = this._getDragAfterElement(orgChart, e.clientY);
            if (afterElement == null) {
                orgChart.appendChild(draggingItem);
            } else {
                orgChart.insertBefore(draggingItem, afterElement);
            }
        });

        return panel;
    }

    /**
     * 부대 설계 UI의 대대 편제 수 제한과 현재 상태를 업데이트합니다.
     */
    updateBattalionCountLimit() {
        const hqContainer = document.getElementById('hq-unit-container');
        const hqStatus = document.getElementById('hq-unit-status');
        const hqDisplay = document.getElementById('hq-unit-display');
        const echelonSelect = document.getElementById('template-echelon-select');
        const selectedEchelon = echelonSelect.value;
        const countDisplay = document.getElementById('battalion-count-display');
        const orgChart = document.querySelector('#unit-designer-panel .org-chart');

        const limits = {
            'DIVISION': { min: 7, max: 10 },
            'BRIGADE': { min: 4, max: 6 },
            'REGIMENT': { min: 2, max: 3 },
            'BATTALION': { min: 2, max: 5 }, // 대대는 2~5개의 중대로 구성
            'COMPANY': { min: 2, max: 5 },   // 중대는 2~5개의 소대로 구성
            'PLATOON': { min: 2, max: 5 }    // 소대는 2~5개의 분대로 구성
        };

        // 중대 이하 설계 시에는 본부 부대 섹션을 숨깁니다.
        if (['COMPANY', 'PLATOON', 'SQUAD'].includes(selectedEchelon)) {
            hqContainer.style.display = 'none';
        } else {
            hqContainer.style.display = 'block';
        }

        // 본부 부대 상태 업데이트
        const hqSelected = hqDisplay.dataset.templateKey ? 1 : 0;
        hqStatus.textContent = `${hqSelected} / 1`;
        hqStatus.style.color = hqSelected < 1 ? 'red' : 'black';

        // 편제 구조 상태 업데이트
        const limit = limits[selectedEchelon];
        const currentCount = orgChart.querySelectorAll('.battalion-item').length;

        countDisplay.textContent = `${currentCount} / ${limit.max}`;
        countDisplay.dataset.min = limit.min;
        countDisplay.dataset.max = limit.max;

        // 대대 수가 최대치를 초과하면 빨간색으로 표시
        countDisplay.style.color = currentCount > limit.max ? 'red' : 'black';
    }

    /**
     * 부대 설계 UI에 추가할 수 있는 본부 부대 목록을 표시합니다.
     */
    showHqUnitSelection() {
        const existingList = document.getElementById('hq-selection-list');
        if (existingList) {
            existingList.remove();
            return;
        }

        const selectionList = document.createElement('div');
        selectionList.id = 'hq-selection-list';

        const list = document.createElement('ul');

        // 본부 역할에 적합한 유닛(주로 중대급)을 필터링합니다.
        // 여기서는 이름에 'HQ' 또는 '본부'가 포함된 중대를 대상으로 합니다.
        Object.keys(UNIT_TEMPLATES_JSON).forEach(key => {
            const template = UNIT_TEMPLATES_JSON[key];
            if (template.echelon === 'COMPANY' && (template.name.includes('HQ') || template.name.includes('본부'))) {
                const listItem = document.createElement('li');
                listItem.textContent = template.name;
                listItem.dataset.templateKey = key;
                listItem.onclick = () => {
                    this.setHqUnit(key, template.name);
                    selectionList.remove();
                };
                list.appendChild(listItem);
            }
        });

        selectionList.appendChild(list);
        document.getElementById('hq-unit-container').appendChild(selectionList);
    }

    /**
     * 선택된 본부 부대를 UI에 설정합니다.
     * @param {string} templateKey 
     * @param {string} name 
     */
    setHqUnit(templateKey, name) {
        const hqDisplay = document.getElementById('hq-unit-display');
        hqDisplay.textContent = `| ${name}`; // 중대 기호와 함께 표시
        hqDisplay.dataset.templateKey = templateKey;
        this.updateBattalionCountLimit(); // 상태 업데이트
    }

    /**
     * 부대 설계 UI에 추가할 수 있는 하위 부대 목록을 표시합니다.
     */
    showSubUnitSelection() {
        // 기존 목록이 있으면 제거하여 중복 생성을 방지합니다.
        const existingList = document.getElementById('battalion-selection-list');
        if (existingList) {
            existingList.remove();
            return; // 목록이 이미 열려있었다면 닫기만 합니다.
        }

        const selectedEchelon = document.getElementById('template-echelon-select').value;
        let targetEchelon;
        if (['DIVISION', 'BRIGADE', 'REGIMENT'].includes(selectedEchelon)) {
            targetEchelon = 'BATTALION';
        } else if (selectedEchelon === 'BATTALION') {
            targetEchelon = 'COMPANY';
        } else if (selectedEchelon === 'COMPANY') {
            targetEchelon = 'PLATOON';
        } else if (selectedEchelon === 'PLATOON') {
            targetEchelon = 'SQUAD';
        }

        const selectionList = document.createElement('div');
        selectionList.id = 'battalion-selection-list';

        const list = document.createElement('ul');

        // 선택된 규모에 따라 적절한 하위 부대 템플릿을 필터링합니다.
        Object.keys(UNIT_TEMPLATES_JSON).forEach(key => {
            const template = UNIT_TEMPLATES_JSON[key];
            if (template.echelon === targetEchelon) {
                const listItem = document.createElement('li');
                listItem.textContent = template.name;
                listItem.dataset.templateKey = key; // 데이터 속성에 템플릿 키 저장
                listItem.onclick = () => {
                    this.addSubUnitToChart(key, template.name);
                    selectionList.remove(); // 대대를 추가한 후 목록을 닫습니다.
                };
                list.appendChild(listItem);
            }
        });

        selectionList.appendChild(list);
        document.getElementById('unit-designer-panel').querySelector('.org-chart-container').appendChild(selectionList);
    }

    /**
     * 선택된 하위 부대를 편제 구조 차트에 추가합니다.
     * @param {string} templateKey - 추가할 부대의 템플릿 키
     * @param {string} name - 추가할 부대의 이름
     */
    addSubUnitToChart(templateKey, name) {
        const countDisplay = document.getElementById('battalion-count-display');
        const maxCount = parseInt(countDisplay.dataset.max, 10);
        const currentCount = document.querySelectorAll('#unit-designer-panel .org-chart .battalion-item').length;

        if (currentCount >= maxCount) {
            alert(`편제 가능한 최대 하위 부대 수(${maxCount}개)를 초과했습니다.`);
            this.showBattalionSelection(); // 목록을 다시 닫아줍니다.
            return;
        }

        const orgChart = document.getElementById('unit-designer-panel').querySelector('.org-chart');
        
        // "하위 부대를 추가하여..." 텍스트가 있다면 제거합니다.
        const placeholder = orgChart.querySelector('p');
        if (placeholder) placeholder.remove();

        const battalionItem = document.createElement('div');
        battalionItem.className = 'battalion-item';
        battalionItem.title = '클릭하여 제거 / 드래그하여 순서 변경'; // 툴팁 추가
        battalionItem.draggable = true; // 드래그 가능하도록 설정
        battalionItem.dataset.templateKey = templateKey;

        const subUnitTemplate = UNIT_TEMPLATES_JSON[templateKey];
        const echelonSymbols = {
            'BATTALION': '||',
            'COMPANY': '|',
            'PLATOON': '•',
            'SQUAD': 'ø'
        };
        const symbol = echelonSymbols[subUnitTemplate.echelon] || '';


        // 대대 이름 표시
        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${symbol} ${name}`;

        battalionItem.appendChild(nameSpan);

        // 현재 설계 중인 부대 규모를 확인합니다.
        const designingEchelon = document.getElementById('template-echelon-select').value;
        // 대대급 이상 부대를 설계할 때만 역할 선택 메뉴를 추가합니다.
        if (['DIVISION', 'BRIGADE', 'REGIMENT', 'BATTALION'].includes(designingEchelon)) {
            const roleSelect = document.createElement('select');
            roleSelect.className = 'battalion-role-select';
            roleSelect.name = 'subunit-role'; // 브라우저 자동 완성 및 폼 필드 식별을 위한 name 속성 추가
            roleSelect.innerHTML = `
                <option value="FRONTLINE">전위</option>
                <option value="MIDGUARD">중위</option>
                <option value="REARGUARD">후위</option>
            `;
            // 드롭다운 클릭 시 부모의 드래그가 시작되지 않도록 이벤트 전파 중단
            roleSelect.addEventListener('mousedown', (e) => e.stopPropagation());
            battalionItem.appendChild(roleSelect);
        }

        // 이름 부분을 클릭하면 삭제
        nameSpan.onclick = () => {
            battalionItem.remove();
            this.updateBattalionCountLimit(); // 삭제 후 카운트 업데이트
        };

        // 마우스를 올리면 툴팁 표시
        battalionItem.addEventListener('mouseenter', (e) => {
            this.showBattalionTooltip(e, templateKey);
        });
        battalionItem.addEventListener('mouseleave', () => {
            this.battalionTooltip.style.display = 'none';
        });
        battalionItem.addEventListener('mousemove', (e) => {
            this.battalionTooltip.style.left = `${e.clientX + 15}px`;
            this.battalionTooltip.style.top = `${e.clientY + 15}px`;
        });

        orgChart.appendChild(battalionItem);
        this.updateBattalionCountLimit(); // 추가 후 카운트 업데이트
        return battalionItem;
    }

    /**
     * 부대 설계 UI를 초기 상태로 초기화합니다.
     */
    resetDesignerPanel() {
        // 1. 입력 필드 초기화
        document.getElementById('template-name-input').value = '';

        // 2. 부대 규모 드롭다운 초기화
        document.getElementById('template-echelon-select').value = 'DIVISION';

        // 3. 편제 구조 초기화
        const orgChart = document.querySelector('#unit-designer-panel .org-chart');
        orgChart.innerHTML = '<p>하위 부대를 추가하여 편제를 구성하세요.</p>';

        // 4. 대대 수 카운터 업데이트
        this.updateBattalionCountLimit();

        // 5. 본부 부대 선택 초기화
        const hqDisplay = document.getElementById('hq-unit-display');
        hqDisplay.textContent = '본부를 선택하세요.';
        delete hqDisplay.dataset.templateKey;
        this.updateBattalionCountLimit(); // 카운터 재업데이트

        console.log('부대 설계 UI가 초기화되었습니다.');
    }

    /**
     * 부대 설계 UI에 불러올 수 있는 기존 편제 목록을 표시합니다.
     */
    showTemplateSelectionForLoad() {
        // 기존 목록이 있으면 제거
        const existingList = document.getElementById('template-load-selection-list');
        if (existingList) {
            existingList.remove();
            return;
        }

        const selectionList = document.createElement('div');
        selectionList.id = 'template-load-selection-list';

        const list = document.createElement('ul');

        // 최상위 편제(DIVISION, BRIGADE, REGIMENT)만 필터링
        Object.keys(UNIT_TEMPLATES_JSON).forEach(key => {
            const template = UNIT_TEMPLATES_JSON[key];
            if (['DIVISION', 'BRIGADE', 'REGIMENT', 'BATTALION', 'COMPANY', 'PLATOON'].includes(template.echelon)) {
                const listItem = document.createElement('li');
                listItem.textContent = template.name;
                listItem.dataset.templateKey = key;
                listItem.onclick = () => {
                    this.loadTemplateIntoDesigner(key);
                    selectionList.remove();
                };
                list.appendChild(listItem);
            }
        });

        selectionList.appendChild(list);
        document.getElementById('unit-designer-panel').appendChild(selectionList);
    }

    /**
     * 선택된 템플릿을 부대 설계 UI에 불러옵니다.
     * @param {string} templateKey - 불러올 템플릿의 키
     */
    loadTemplateIntoDesigner(templateKey) {
        const template = UNIT_TEMPLATES_JSON[templateKey];
        if (!template) {
            console.error(`Template with key "${templateKey}" not found.`);
            return;
        }

        // 1. UI 컨트롤 값 설정
        document.getElementById('template-name-input').value = template.name;
        document.getElementById('template-echelon-select').value = template.echelon;

        // 2. 기존 편제 차트 초기화
        const orgChart = document.querySelector('#unit-designer-panel .org-chart');
        orgChart.innerHTML = '<p>하위 부대를 추가하여 편제를 구성하세요.</p>';

        // 3. 템플릿의 하위 부대를 차트에 추가
        template.sub_units.forEach(subUnitInfo => {
            for (let i = 0; i < subUnitInfo.count; i++) {
                const subUnitTemplate = UNIT_TEMPLATES_JSON[subUnitInfo.template_key];
                const role = subUnitInfo.role || 'FRONTLINE'; // 역할 정보가 없으면 기본값 사용
                const battalionItem = this.addSubUnitToChart(subUnitInfo.template_key, subUnitTemplate.name);
                const roleSelect = battalionItem?.querySelector('.battalion-role-select');
                if (roleSelect) roleSelect.value = role;
            }
        });

        // 4. 본부 부대 정보 불러오기
        if (template.hq_template_key) {
            const hqTemplate = UNIT_TEMPLATES_JSON[template.hq_template_key];
            if (hqTemplate) this.setHqUnit(template.hq_template_key, hqTemplate.name);
        }

        // 4. 대대 수 제한 및 표시 업데이트
        this.updateBattalionCountLimit();
    }

    /**
     * 대대 템플릿의 능력치 툴팁을 표시합니다.
     * @param {MouseEvent} event - 마우스 이벤트
     * @param {string} templateKey - 대대 템플릿 키
     */
    showBattalionTooltip(event, templateKey) {
        const stats = this._getStatsForTemplate(templateKey);
        if (!stats) return;

        const statsToShow = {
            '직접 화력': stats.directFirepower.toFixed(1),
            '간접 화력': stats.indirectFirepower.toFixed(1),
            '대인 공격': stats.softAttack.toFixed(1),
            '대물 공격': stats.hardAttack.toFixed(1),
            '장갑': stats.armor.toFixed(2),
            '기갑화율': `${(stats.hardness * 100).toFixed(0)}%`,
            '조직 방어': stats.organizationDefense.toFixed(1),
        };

        let html = `<h4>${UNIT_TEMPLATES_JSON[templateKey].name}</h4><ul>`;
        for (const [name, value] of Object.entries(statsToShow)) {
            html += `<li><span>${name}</span><span>${value}</span></li>`;
        }
        html += '</ul>';

        this.battalionTooltip.innerHTML = html;
        this.battalionTooltip.style.display = 'block';
        this.battalionTooltip.style.left = `${event.clientX + 15}px`;
        this.battalionTooltip.style.top = `${event.clientY + 15}px`;
    }

    /**
     * 유닛 인스턴스를 생성하지 않고 템플릿의 능력치를 계산합니다.
     * @param {string} templateKey - 계산할 템플릿의 키
     * @returns {object | null} 계산된 능력치 객체
     * @private
     */
    _getStatsForTemplate(templateKey) {
        const allSquads = this._getAllSquadsForTemplate(templateKey);
        if (!allSquads || allSquads.length === 0) return null;

        return {
            directFirepower: UNIT_STAT_AGGREGATORS.directFirepower(allSquads),
            indirectFirepower: UNIT_STAT_AGGREGATORS.indirectFirepower(allSquads),
            softAttack: UNIT_STAT_AGGREGATORS.softAttack(allSquads),
            hardAttack: UNIT_STAT_AGGREGATORS.hardAttack(allSquads),
            reconnaissance: UNIT_STAT_AGGREGATORS.reconnaissance(allSquads),
            organizationDefense: UNIT_STAT_AGGREGATORS.organizationDefense(allSquads),
            unitDefense: UNIT_STAT_AGGREGATORS.unitDefense(allSquads),
            armor: UNIT_STAT_AGGREGATORS.armor(allSquads),
            hardness: UNIT_STAT_AGGREGATORS.hardness(allSquads),
        };
    }

    /**
     * 템플릿 키를 기반으로 모든 하위 분대 데이터를 재귀적으로 수집합니다.
     * @param {string} templateKey - 탐색을 시작할 템플릿 키
     * @returns {object[]} 분대 능력치 객체의 배열
     * @private
     */
    _getAllSquadsForTemplate(templateKey) {
        const template = UNIT_TEMPLATES_JSON[templateKey];
        if (!template) return [];

        if (template.echelon === 'SQUAD') {
            return [{ ...UNIT_TYPE_STATS[template.type] }];
        }

        let squads = [];
        template.sub_units?.forEach(sub => {
            for (let i = 0; i < sub.count; i++) {
                squads = squads.concat(this._getAllSquadsForTemplate(sub.template_key));
            }
        });
        return squads;
    }

    /**
     * 드래그 중인 마우스 위치를 기준으로 바로 다음에 와야 할 요소를 찾습니다.
     * @param {HTMLElement} container - 드래그가 일어나는 컨테이너
     * @param {number} y - 마우스의 Y 좌표
     * @returns {HTMLElement | null} 드래그 중인 요소가 삽입될 위치의 다음 요소
     * @private
     */
    _getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.battalion-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            // 마우스 위치와 요소 중앙 사이의 거리
            const offset = y - box.top - box.height / 2;
            // 마우스가 요소 위쪽에 있고, 이전에 찾은 요소보다 더 가까울 때
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    /**
     * 부대 설계 UI의 현재 구성을 새로운 템플릿으로 저장합니다.
     */
    saveUnitTemplate() {
        const nameInput = document.getElementById('template-name-input');
        const echelonSelect = document.getElementById('template-echelon-select');
        const countDisplay = document.getElementById('battalion-count-display');
        const orgChart = document.querySelector('#unit-designer-panel .org-chart');

        const templateName = nameInput.value.trim();
        if (!templateName) {
            alert('설계 이름을 입력해주세요.');
            return;
        }

        const battalions = orgChart.querySelectorAll('.battalion-item');
        const minCount = parseInt(countDisplay.dataset.min, 10);
        const maxCount = parseInt(countDisplay.dataset.max, 10);

        if (battalions.length > 0 && battalions.length < minCount) {
            alert(`편제에 최소 ${minCount}개의 하위 부대를 추가해주세요.`);
            return;
        }

        if (battalions.length > maxCount) {
            alert(`편제 가능한 최대 대대 수(${maxCount}개)를 초과했습니다.`);
            return;
        }

        // 중대, 소대급 설계는 하위 부대가 없을 수 있습니다 (분대만으로 구성).
        if (['DIVISION', 'BRIGADE', 'REGIMENT', 'BATTALION', 'COMPANY'].includes(echelonSelect.value) && battalions.length === 0) {
            alert('편제에 하위 부대를 하나 이상 추가해주세요.');
            return;
        }

        // 대대 이상 설계 시 본부 부대 선택 여부 확인
        const hqDisplay = document.getElementById('hq-unit-display');
        const hqTemplateKey = hqDisplay.dataset.templateKey;
        const needsHq = ['DIVISION', 'BRIGADE', 'REGIMENT', 'BATTALION'].includes(echelonSelect.value);
        if (needsHq && !hqTemplateKey) {
            alert('본부 부대를 선택해주세요.');
            return;
        }

        // 1. 새로운 템플릿 객체 생성
        const templateKey = templateName.replace(/\s+/g, '_'); // 공백을 밑줄로 변경하여 고유 키 생성

        // 기존에 같은 이름의 템플릿이 있는지 확인 (덮어쓰기 경고)
        if (UNIT_TEMPLATES_JSON[templateKey]) {
            if (!confirm(`'${templateName}' 설계가 이미 존재합니다. 덮어쓰시겠습니까?`)) {
                return;
            }
        }
        const newTemplate = {
            name: templateName,
            echelon: echelonSelect.value,
            sub_units: [], // 순서를 유지하기 위해 집계하지 않고 직접 추가
        };

        // 본부 부대가 필요한 경우에만 hq_template_key를 추가합니다.
        if (needsHq) {
            newTemplate.hq_template_key = hqTemplateKey;
        }

        // 2. 편제 구조에 포함된 하위 부대들을 집계하여 sub_units 배열에 추가
        // 드래그 앤 드롭으로 정렬된 순서를 유지하기 위해, 동일한 유닛과 역할을 집계(count)하는 방식으로 변경합니다.
        const aggregatedSubUnits = [];
        battalions.forEach(item => {
            const key = item.dataset.templateKey;
            // 역할 선택 메뉴가 있을 때만 값을 읽고, 없으면 기본값을 사용합니다.
            const roleSelect = item.querySelector('.battalion-role-select');
            const role = roleSelect ? roleSelect.value : 'FRONTLINE';
            const lastUnit = aggregatedSubUnits[aggregatedSubUnits.length - 1];

            // 바로 이전 유닛과 종류 및 역할이 모두 같으면 count를 늘리고, 아니면 새로 추가합니다.
            if (lastUnit && lastUnit.template_key === key && lastUnit.role === role) {
                lastUnit.count++;
            } else {
                aggregatedSubUnits.push({ template_key: key, count: 1, role: role });
            }
        });

        newTemplate.sub_units = aggregatedSubUnits;

        // 3. 인-메모리 템플릿 데이터에 새 템플릿 추가
        UNIT_TEMPLATES_JSON[templateKey] = newTemplate;

        // 4. 부대 소환 목록을 즉시 업데이트
        this.updateUnitSpawnList();

        // 5. 현재 게임 세션에만 저장되었음을 알림
        alert(`'${templateName}' 설계가 저장되었습니다.\n(현재 게임 세션에서만 사용 가능)`);
    }

    /**
     * 부대 소환 드롭다운 목록을 최신 템플릿 데이터로 업데이트합니다.
     */
    updateUnitSpawnList() {
        this.unitTemplateSelect.innerHTML = ''; // 기존 옵션 모두 제거
        Object.keys(UNIT_TEMPLATES_JSON).forEach(key => {
            const template = UNIT_TEMPLATES_JSON[key];
            if (['DIVISION', 'BRIGADE', 'REGIMENT'].includes(template.echelon)) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = template.name;
                this.unitTemplateSelect.appendChild(option);
            }
        });
    }

    downloadJSON(data, filename) {
        const jsonStr = JSON.stringify(data, null, 4); // 예쁘게 포맷팅
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
     * @param {'economy' | 'unit-debug' | 'unit-designer'} panelName 
     */
    switchMainPanel(panelName) {
        const buttons = document.querySelectorAll('.panel-toggle-buttons button');
        buttons.forEach(btn => btn.classList.remove('active'));

        this.economyPanel.classList.remove('active');
        this.unitDebugPanel.classList.remove('active');
        this.unitDesignerPanel.classList.remove('active');

        if (panelName === 'economy') {
            this.economyPanel.classList.add('active');
            buttons[0].classList.add('active');
        } else if (panelName === 'unit-debug') {
            this.unitDebugPanel.classList.add('active');
            buttons[1].classList.add('active');
        } else if (panelName === 'unit-designer') {
            this.unitDesignerPanel.classList.add('active');
            buttons[2].classList.add('active');
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

        if (templateKey) {
            const worldCoords = this.camera.screenToWorld(this.camera.canvas.width / 2, this.camera.canvas.height / 2);
            this.unitManager.spawnUnit(templateKey, worldCoords.x, worldCoords.y, team);
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
        if (unit instanceof SymbolUnit) {
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
                // 영문 type을 한글 이름으로 변환하여 표시
                const typeNameMap = {
                    'INFANTRY': '보병',
                    'ARMOR': '기갑',
                    'RECON': '정찰',
                    'ARTILLERY': '포병',
                    'ENGINEER': '공병'
                };
                const displayName = typeNameMap[type] || type;
                html += `<li>${displayName}: ${counts.active} / ${counts.total}</li>`;
            });
            html += '</ul>';
        }
        this.compositionPanel.innerHTML = html;
        this.compositionPanel.style.display = 'block';
    }

    /**
     * 선택된 유닛의 상세 능력치를 UI에 업데이트합니다.
     * @param {Unit | null} unit 선택된 유닛 또는 null
     */
    updateStatsPanel(unit) {
        if (!unit) {
            this.statsPanel.innerHTML = '';
            this.statsPanel.style.display = 'none';
            return;
        }

        // SymbolUnit의 경우, 하위 부대의 능력치를 합산하여 보여줍니다.
        const statsToShow = {
            '조직력': `${Math.floor(unit.organization)} / ${Math.floor(unit.maxOrganization)}`,
            '내구력': `${Math.floor(unit.currentStrength)} / ${Math.floor(unit.baseStrength)}`,
            '---': '---', // 구분선
            '이동 속도': unit.moveSpeed.toFixed(1),
            '직접 화력': unit.directFirepower.toFixed(1),
            '간접 화력': unit.indirectFirepower.toFixed(1),
            '대인 공격': unit.softAttack.toFixed(1),
            '대물 공격': unit.hardAttack.toFixed(1),
            '장갑': unit.armor.toFixed(2),
            '기갑화율': `${(unit.hardness * 100).toFixed(0)}%`,
            '정찰': unit.reconnaissance.toFixed(1),
            '조직 방어': unit.organizationDefense.toFixed(1),
            '단위 방어': unit.unitDefense.toFixed(1),
        };

        let html = `<h3>${unit.name} 능력치</h3>`;
        html += '<ul>';
        Object.entries(statsToShow).forEach(([name, value]) => {
            if (name === '---') {
                html += `<li style="margin: 5px 0; border-top: 1px solid #ccc;"></li>`; // 구분선 스타일
            } else {
                html += `<li>
                            <span>${name}</span>
                            <span>${value}</span>
                         </li>`;
            }
        });
        html += '</ul>';

        this.statsPanel.innerHTML = html;
        this.statsPanel.style.display = 'block';
    }

    /**
     * 선택된 프로빈스의 정보를 UI에 업데이트합니다.
     * @param {Province | null} province 선택된 프로빈스 또는 null
     */
    updateProvinceInfoPanel(province) {
        if (!province) {
            this.provinceInfoPanel.innerHTML = '';
            this.provinceInfoPanel.style.display = 'none';
            return;
        }

        const ownerName = province.owner ? province.owner.name : '중립';
        const ownerColor = province.owner ? province.owner.color.replace('0.3', '1.0') : '#888';

        let html = `<h3>프로빈스 정보</h3>`;
        html += '<ul>';
        html += `<li><span>ID</span><span>${province.id}</span></li>`;
        html += `<li><span>크기</span><span>${province.tiles.length} 타일</span></li>`;
        html += `<li>
                    <span>소유</span>
                    <span style="color: ${ownerColor}; font-weight: bold;">${ownerName}</span>
                 </li>`;

        // 프로빈스가 보유한 자원 정보를 표시합니다.
        if (province.resources && Object.keys(province.resources).length > 0) {
            html += `<li style="margin-top: 10px; border-top: 1px solid #ccc;"></li>`; // 구분선
            html += `<h4>자원</h4>`;
            Object.entries(province.resources).forEach(([key, amount]) => {
                const resourceName = RESOURCE_TYPES[key]?.name || key;
                html += `<li><span>${resourceName}</span><span>${amount}</span></li>`;
            });
        }

        html += '</ul>';

        this.provinceInfoPanel.innerHTML = html;
        this.provinceInfoPanel.style.display = 'block';
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

            // 자원 수입량 및 비축량 표시
            html += `<h4>자원 현황 (수입량/비축량)</h4>`;
            const income = nation.economy.resourceIncome;
            const stockpile = nation.economy.resourceStockpile;
            const allResourceKeys = new Set([...Object.keys(income), ...Object.keys(stockpile)]);

            if (allResourceKeys.size > 0) {
                html += '<ul>';
                allResourceKeys.forEach(key => {
                    const resourceName = RESOURCE_TYPES[key]?.name || key;
                    const incomeAmount = income[key] || 0;
                    const stockpileAmount = Math.floor(stockpile[key] || 0);
                    html += `<li>${resourceName}: +${incomeAmount}/h | ${stockpileAmount}</li>`;
                });
                html += '</ul>';
            } else {
                html += '<p>자원 수입 없음</p>';
            }

            // 장비 비축량 표시
            html += `<h4>장비 비축량</h4>`;
            const equipmentStockpile = nation.economy.equipmentStockpile;
            if (Object.keys(equipmentStockpile).length > 0) {
                html += '<ul>';
                Object.keys(equipmentStockpile).forEach(key => {
                    html += `<li>${EQUIPMENT_TYPES[key].name}: ${equipmentStockpile[key]}</li>`;
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

        // 중대들의 평균 전투 참여도 및 효율성 계산
        const companies = unit.getAllCompanies();
        let avgParticipation = 0;
        let avgEffectiveness = 0;
        if (companies.length > 0) {
            const totalEffectiveness = companies.reduce((sum, c) => sum + c.combatEffectiveness, 0);
            avgEffectiveness = (totalEffectiveness / companies.length * 100).toFixed(0);
        }

        const combatStatsHTML = `<p><small>전투 효율성: ${avgEffectiveness}%</small></p>`;


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
            <p><strong>방어력(조직/단위):</strong> ${unit.organizationDefense.toFixed(1)} / ${unit.unitDefense.toFixed(1)}</p>
            <p><strong>현재 전술:</strong> ${tacticInfo}</p>
            ${combatStatsHTML}
        `;
    }
}