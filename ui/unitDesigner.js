class UnitDesigner {
    constructor(gameUI) {
        this.gameUI = gameUI;
        
        this.battalionTooltip = document.createElement('div');
        this.battalionTooltip.id = 'battalion-tooltip';
        document.body.appendChild(this.battalionTooltip);
        this.gameUI.addUIElementListener(this.battalionTooltip);

        this.panel = this.createUnitDesignerPanel();
    }

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

        panel.querySelector('#template-echelon-select').onchange = () => {
            const hqDisplay = document.getElementById('hq-unit-display');
            hqDisplay.textContent = '본부를 선택하세요.';
            delete hqDisplay.dataset.templateKey;

            const orgChart = document.querySelector('#unit-designer-panel .org-chart');
            orgChart.innerHTML = '<p>하위 부대를 추가하여 편제를 구성하세요.</p>';

            this.updateBattalionCountLimit();
        };

        panel.querySelector('#add-subunit-button').onclick = () => this.showSubUnitSelection();
        panel.querySelector('#select-hq-button').onclick = () => this.showHqUnitSelection();
        panel.querySelector('#new-design-button').onclick = () => this.resetDesignerPanel();
        panel.querySelector('#load-template-button').onclick = () => this.showTemplateSelectionForLoad();
        panel.querySelector('#save-template-button').onclick = () => this.saveUnitTemplate();

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
            e.preventDefault();
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
            'BATTALION': { min: 2, max: 5 },
            'COMPANY': { min: 2, max: 5 },
            'PLATOON': { min: 2, max: 5 }
        };

        if (['COMPANY', 'PLATOON', 'SQUAD'].includes(selectedEchelon)) {
            hqContainer.style.display = 'none';
        } else {
            hqContainer.style.display = 'block';
        }

        const hqSelected = hqDisplay.dataset.templateKey ? 1 : 0;
        hqStatus.textContent = `${hqSelected} / 1`;
        hqStatus.style.color = hqSelected < 1 ? 'red' : 'black';

        const limit = limits[selectedEchelon];
        const currentCount = orgChart.querySelectorAll('.battalion-item').length;

        countDisplay.textContent = `${currentCount} / ${limit.max}`;
        countDisplay.dataset.min = limit.min;
        countDisplay.dataset.max = limit.max;

        countDisplay.style.color = currentCount > limit.max ? 'red' : 'black';
    }

    showHqUnitSelection() {
        const existingList = document.getElementById('hq-selection-list');
        if (existingList) {
            existingList.remove();
            return;
        }

        const selectionList = document.createElement('div');
        selectionList.id = 'hq-selection-list';

        const list = document.createElement('ul');

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

    setHqUnit(templateKey, name) {
        const hqDisplay = document.getElementById('hq-unit-display');
        hqDisplay.textContent = `| ${name}`;
        hqDisplay.dataset.templateKey = templateKey;
        this.updateBattalionCountLimit();
    }

    showSubUnitSelection() {
        const existingList = document.getElementById('battalion-selection-list');
        if (existingList) {
            existingList.remove();
            return;
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

        Object.keys(UNIT_TEMPLATES_JSON).forEach(key => {
            const template = UNIT_TEMPLATES_JSON[key];
            if (template.echelon === targetEchelon) {
                const listItem = document.createElement('li');
                listItem.textContent = template.name;
                listItem.dataset.templateKey = key;
                listItem.onclick = () => {
                    this.addSubUnitToChart(key, template.name);
                    selectionList.remove();
                };
                list.appendChild(listItem);
            }
        });

        selectionList.appendChild(list);
        document.getElementById('unit-designer-panel').querySelector('.org-chart-container').appendChild(selectionList);
    }

    addSubUnitToChart(templateKey, name) {
        const countDisplay = document.getElementById('battalion-count-display');
        const maxCount = parseInt(countDisplay.dataset.max, 10);
        const currentCount = document.querySelectorAll('#unit-designer-panel .org-chart .battalion-item').length;

        if (currentCount >= maxCount) {
            alert(`편제 가능한 최대 하위 부대 수(${maxCount}개)를 초과했습니다.`);
            return;
        }

        const orgChart = document.getElementById('unit-designer-panel').querySelector('.org-chart');
        
        const placeholder = orgChart.querySelector('p');
        if (placeholder) placeholder.remove();

        const battalionItem = document.createElement('div');
        battalionItem.className = 'battalion-item';
        battalionItem.title = '클릭하여 제거 / 드래그하여 순서 변경';
        battalionItem.draggable = true;
        battalionItem.dataset.templateKey = templateKey;

        const subUnitTemplate = UNIT_TEMPLATES_JSON[templateKey];
        const echelonSymbols = { 'BATTALION': '||', 'COMPANY': '|', 'PLATOON': '•', 'SQUAD': 'ø' };
        const symbol = echelonSymbols[subUnitTemplate.echelon] || '';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${symbol} ${name}`;
        battalionItem.appendChild(nameSpan);

        const designingEchelon = document.getElementById('template-echelon-select').value;
        if (['DIVISION', 'BRIGADE', 'REGIMENT', 'BATTALION'].includes(designingEchelon)) {
            const roleSelect = document.createElement('select');
            roleSelect.className = 'battalion-role-select';
            roleSelect.name = 'subunit-role';
            roleSelect.innerHTML = `<option value="FRONTLINE">전위</option><option value="MIDGUARD">중위</option><option value="REARGUARD">후위</option>`;
            roleSelect.addEventListener('mousedown', (e) => e.stopPropagation());
            battalionItem.appendChild(roleSelect);
        }

        nameSpan.onclick = () => {
            battalionItem.remove();
            this.updateBattalionCountLimit();
        };

        battalionItem.addEventListener('mouseenter', (e) => this.showBattalionTooltip(e, templateKey));
        battalionItem.addEventListener('mouseleave', () => { this.battalionTooltip.style.display = 'none'; });
        battalionItem.addEventListener('mousemove', (e) => {
            this.battalionTooltip.style.left = `${e.clientX + 15}px`;
            this.battalionTooltip.style.top = `${e.clientY + 15}px`;
        });

        orgChart.appendChild(battalionItem);
        this.updateBattalionCountLimit();
        return battalionItem;
    }

    resetDesignerPanel() {
        document.getElementById('template-name-input').value = '';
        document.getElementById('template-echelon-select').value = 'DIVISION';
        const orgChart = document.querySelector('#unit-designer-panel .org-chart');
        orgChart.innerHTML = '<p>하위 부대를 추가하여 편제를 구성하세요.</p>';
        this.updateBattalionCountLimit();
        const hqDisplay = document.getElementById('hq-unit-display');
        hqDisplay.textContent = '본부를 선택하세요.';
        delete hqDisplay.dataset.templateKey;
        this.updateBattalionCountLimit();
    }

    showTemplateSelectionForLoad() {
        const existingList = document.getElementById('template-load-selection-list');
        if (existingList) { existingList.remove(); return; }

        const selectionList = document.createElement('div');
        selectionList.id = 'template-load-selection-list';
        const list = document.createElement('ul');

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

    loadTemplateIntoDesigner(templateKey) {
        const template = UNIT_TEMPLATES_JSON[templateKey];
        if (!template) return;

        document.getElementById('template-name-input').value = template.name;
        document.getElementById('template-echelon-select').value = template.echelon;

        const orgChart = document.querySelector('#unit-designer-panel .org-chart');
        orgChart.innerHTML = '<p>하위 부대를 추가하여 편제를 구성하세요.</p>';

        template.sub_units.forEach(subUnitInfo => {
            for (let i = 0; i < subUnitInfo.count; i++) {
                const subUnitTemplate = UNIT_TEMPLATES_JSON[subUnitInfo.template_key];
                const role = subUnitInfo.role || 'FRONTLINE';
                const battalionItem = this.addSubUnitToChart(subUnitInfo.template_key, subUnitTemplate.name);
                const roleSelect = battalionItem?.querySelector('.battalion-role-select');
                if (roleSelect) roleSelect.value = role;
            }
        });

        if (template.hq_template_key) {
            const hqTemplate = UNIT_TEMPLATES_JSON[template.hq_template_key];
            if (hqTemplate) this.setHqUnit(template.hq_template_key, hqTemplate.name);
        }
        this.updateBattalionCountLimit();
    }

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

    _getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.battalion-item:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    saveUnitTemplate() {
        const nameInput = document.getElementById('template-name-input');
        const echelonSelect = document.getElementById('template-echelon-select');
        const countDisplay = document.getElementById('battalion-count-display');
        const orgChart = document.querySelector('#unit-designer-panel .org-chart');

        const templateName = nameInput.value.trim();
        if (!templateName) { alert('설계 이름을 입력해주세요.'); return; }

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
        if (['DIVISION', 'BRIGADE', 'REGIMENT', 'BATTALION', 'COMPANY'].includes(echelonSelect.value) && battalions.length === 0) {
            alert('편제에 하위 부대를 하나 이상 추가해주세요.');
            return;
        }

        const hqDisplay = document.getElementById('hq-unit-display');
        const hqTemplateKey = hqDisplay.dataset.templateKey;
        const needsHq = ['DIVISION', 'BRIGADE', 'REGIMENT', 'BATTALION'].includes(echelonSelect.value);
        if (needsHq && !hqTemplateKey) {
            alert('본부 부대를 선택해주세요.');
            return;
        }

        const templateKey = templateName.replace(/\s+/g, '_');
        if (UNIT_TEMPLATES_JSON[templateKey]) {
            if (!confirm(`'${templateName}' 설계가 이미 존재합니다. 덮어쓰시겠습니까?`)) return;
        }
        const newTemplate = {
            name: templateName,
            echelon: echelonSelect.value,
            sub_units: [],
        };
        if (needsHq) newTemplate.hq_template_key = hqTemplateKey;

        const aggregatedSubUnits = [];
        battalions.forEach(item => {
            const key = item.dataset.templateKey;
            const roleSelect = item.querySelector('.battalion-role-select');
            const role = roleSelect ? roleSelect.value : 'FRONTLINE';
            const lastUnit = aggregatedSubUnits[aggregatedSubUnits.length - 1];

            if (lastUnit && lastUnit.template_key === key && lastUnit.role === role) {
                lastUnit.count++;
            } else {
                aggregatedSubUnits.push({ template_key: key, count: 1, role: role });
            }
        });

        newTemplate.sub_units = aggregatedSubUnits;
        UNIT_TEMPLATES_JSON[templateKey] = newTemplate;
        this.gameUI.updateUnitSpawnList();
        alert(`'${templateName}' 설계가 저장되었습니다.\n(현재 게임 세션에서만 사용 가능)`);
    }
}