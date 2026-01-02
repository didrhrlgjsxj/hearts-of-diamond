class EconomyPanel {
    constructor(gameUI) {
        this.gameUI = gameUI;
        this.blockRows = {};
        this.levelBlockRow = {};
        this.remainingBlocksDisplay = null;

        // 생산 정보 패널 (우측 상단)
        this.productionPanel = document.createElement('div');
        this.productionPanel.id = 'production-panel';
        document.body.appendChild(this.productionPanel);
        this.gameUI.addUIElementListener(this.productionPanel);

        // 경제 관리 패널 (메인 탭)
        this.panel = this.createEconomyPanel();
    }

    createEconomyPanel() {
        const panel = document.createElement('div');
        panel.id = 'economy-panel';
        panel.className = 'main-panel';

        const productionHeader = document.createElement('h3');
        productionHeader.textContent = '생산 관리';

        const teamSelect = UIUtils.createSelect('team-select', '국가 선택:', {
            blue: '블루 공화국',
            red: '레드 왕국'
        });
        
        teamSelect.select.onchange = () => {
            const team = teamSelect.select.value;
            const nation = this.gameUI.nations.get(team);
            if (nation) {
                this.updateConstructionUI(nation);
            }
            this.updateProductionPanel();
        };

        const equipmentOptions = {};
        Object.keys(EQUIPMENT_TYPES).forEach(key => {
            equipmentOptions[key] = EQUIPMENT_TYPES[key].name;
        });
        const equipmentSelect = UIUtils.createSelect('equipment-select', '장비 선택:', equipmentOptions);

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

        const constructionHeader = document.createElement('h3');
        constructionHeader.textContent = '공장 건설';

        this.remainingBlocksDisplay = document.createElement('div');
        this.remainingBlocksDisplay.style.fontSize = '12px';
        this.remainingBlocksDisplay.style.marginBottom = '5px';
        this.remainingBlocksDisplay.style.textAlign = 'right';

        panel.append(
            teamSelect.label, teamSelect.select,
            constructionHeader,
            this.createLevelControl(),
            this.remainingBlocksDisplay,
            this.createBlockRow('light', '경공업', '#4caf50'),
            this.createBlockRow('heavy', '중공업', '#f44336'),
            this.createBlockRow('consumer', '소비재', '#2196f3'),
            productionHeader, 
            equipmentSelect.label, equipmentSelect.select, 
            lightFactoryLabel, lightFactoryInput, heavyFactoryLabel, heavyFactoryInput, 
            addLineButton
        );
        
        setTimeout(() => this.updateConstructionUI(this.gameUI.nations.get('blue')), 0);

        return panel;
    }

    createLevelControl() {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.marginBottom = '15px';

        const label = document.createElement('span');
        label.textContent = '건설 활성화';
        label.style.width = '70px';
        label.style.fontSize = '12px';

        const decreaseBtn = document.createElement('button');
        decreaseBtn.textContent = '-';
        decreaseBtn.style.width = '20px';
        decreaseBtn.style.height = '20px';
        decreaseBtn.style.padding = '0';
        decreaseBtn.onclick = () => this.modifyConstructionLevel(-1);

        const visualContainer = document.createElement('div');
        visualContainer.style.flexGrow = '1';
        visualContainer.style.margin = '0 5px';
        visualContainer.style.display = 'flex';
        visualContainer.style.gap = '1px';
        visualContainer.style.height = '15px';
        visualContainer.style.backgroundColor = '#eee';

        const increaseBtn = document.createElement('button');
        increaseBtn.textContent = '+';
        increaseBtn.style.width = '20px';
        increaseBtn.style.height = '20px';
        increaseBtn.style.padding = '0';
        increaseBtn.onclick = () => this.modifyConstructionLevel(1);

        const countDisplay = document.createElement('span');
        countDisplay.style.width = '20px';
        countDisplay.style.textAlign = 'center';
        countDisplay.style.fontSize = '12px';

        row.append(label, decreaseBtn, visualContainer, increaseBtn, countDisplay);
        this.levelBlockRow = { container: visualContainer, count: countDisplay, color: '#9c27b0' };
        return row;
    }

    createBlockRow(type, labelText, color) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.marginBottom = '5px';

        const label = document.createElement('span');
        label.textContent = labelText;
        label.style.width = '70px';
        label.style.fontSize = '12px';

        const decreaseBtn = document.createElement('button');
        decreaseBtn.textContent = '-';
        decreaseBtn.style.width = '20px';
        decreaseBtn.style.height = '20px';
        decreaseBtn.style.padding = '0';
        decreaseBtn.onclick = () => this.modifyBlockAllocation(type, -1);

        const visualContainer = document.createElement('div');
        visualContainer.style.flexGrow = '1';
        visualContainer.style.margin = '0 5px';
        visualContainer.style.display = 'flex';
        visualContainer.style.gap = '1px';
        visualContainer.style.height = '15px';
        visualContainer.style.backgroundColor = '#eee';

        const increaseBtn = document.createElement('button');
        increaseBtn.textContent = '+';
        increaseBtn.style.width = '20px';
        increaseBtn.style.height = '20px';
        increaseBtn.style.padding = '0';
        increaseBtn.onclick = () => this.modifyBlockAllocation(type, 1);

        const countDisplay = document.createElement('span');
        countDisplay.style.width = '20px';
        countDisplay.style.textAlign = 'center';
        countDisplay.style.fontSize = '12px';

        row.append(label, decreaseBtn, visualContainer, increaseBtn, countDisplay);
        this.blockRows[type] = { container: visualContainer, count: countDisplay, color: color };
        return row;
    }

    modifyConstructionLevel(change) {
        const teamSelect = document.getElementById('team-select');
        const nation = this.gameUI.nations.get(teamSelect.value);
        if (!nation) return;

        let newLevel = nation.economy.construction.level + change;
        if (newLevel < 0) newLevel = 0;
        if (newLevel > 10) newLevel = 10;
        
        nation.economy.construction.level = newLevel;
        this.updateConstructionUI(nation);
        this.updateProductionPanel();
    }

    modifyBlockAllocation(type, change) {
        const teamSelect = document.getElementById('team-select');
        const nation = this.gameUI.nations.get(teamSelect.value);
        if (!nation) return;

        const alloc = nation.economy.construction.allocation;
        const currentBlocks = alloc[type];
        const totalBlocks = alloc.light + alloc.heavy + alloc.consumer;

        if (change === -1) {
            if (currentBlocks > 0) {
                alloc[type]--;
            }
        } else if (change === 1) {
            if (totalBlocks < 15) {
                alloc[type]++;
            }
        }
        this.updateConstructionUI(nation);
    }

    updateConstructionUI(nation) {
        if (!nation) return;
        const constr = nation.economy.construction;
        
        const levelRow = this.levelBlockRow;
        levelRow.count.textContent = constr.level;
        levelRow.container.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const block = document.createElement('div');
            block.style.flex = '1';
            block.style.height = '100%';
            if (i < constr.level) {
                block.style.backgroundColor = levelRow.color;
                block.style.border = '1px solid rgba(0,0,0,0.2)';
            } else {
                block.style.backgroundColor = 'transparent';
                block.style.borderRight = '1px solid #ddd';
            }
            levelRow.container.appendChild(block);
        }

        const totalBlocks = 15; // 할당 가능 블록 수를 15로 변경
        const usedBlocks = constr.allocation.light + constr.allocation.heavy + constr.allocation.consumer;
        const remainingBlocks = totalBlocks - usedBlocks;

        if (this.remainingBlocksDisplay) {
            this.remainingBlocksDisplay.textContent = `남은 할당 가능 블록: ${remainingBlocks}`;
            this.remainingBlocksDisplay.style.color = remainingBlocks > 0 ? 'green' : 'red';
        }

        ['light', 'heavy', 'consumer'].forEach(type => {
            const row = this.blockRows[type];
            const count = constr.allocation[type];
            
            row.count.textContent = count;

            row.container.innerHTML = '';
            for (let i = 0; i < totalBlocks; i++) {
                const block = document.createElement('div');
                block.style.flex = '1';
                block.style.height = '100%';
                if (i < count) {
                    block.style.backgroundColor = row.color;
                    block.style.border = '1px solid rgba(0,0,0,0.2)';
                } else {
                    block.style.backgroundColor = 'transparent';
                    block.style.borderRight = '1px solid #ddd';
                }
                row.container.appendChild(block);
            }
        });
    }

    updateProductionPanel() {
        if (!this.productionPanel) return;

        let html = ``;
        this.gameUI.nations.forEach(nation => {
            // 중립 국가는 패널에 표시하지 않음
            if (nation.type === 'NONE') return;

            const isAI = nation.type === 'AI';
            const typeLabel = isAI ? '<span style="color: red; font-weight: bold;">(AI)</span>' : '<span style="color: blue; font-weight: bold;">(PLAYER)</span>';

            html += `<h3>${nation.name} ${typeLabel}</h3>`;

            if (isAI) {
                // AI 국가 전용 표시
                const weight = nation.calculateNationalWeight();
                const dailyIncome = weight * 20;
                
                html += `<div><strong>국가 체급: ${weight.toFixed(1)}</strong></div>`;
                html += `<div>총 공장: ${nation.economy.lightIndustry + nation.economy.heavyIndustry + nation.economy.consumerGoodsIndustry} (경:${nation.economy.lightIndustry}/중:${nation.economy.heavyIndustry}/소:${nation.economy.consumerGoodsIndustry})</div>`;
                html += `<div>경제 단위: ${Math.floor(nation.economy.economicUnits)} <span style="color: green">(+${Math.floor(dailyIncome)}/일)</span></div>`;
                
                const warPercent = Math.round(nation.economy.warFocusRatio * 100);
                const ecoPercent = 100 - warPercent;
                html += `<div>집중 비율: 경제 ${ecoPercent}% / 전쟁 ${warPercent}%</div>`;
            } else {
                // 플레이어 국가 표시 (기존 로직)
                const availableFactories = nation.economy.getAvailableFactories();
                const hourlyBaseChange = nation.economy.calculateHourlyEconomicChange();
                const constructionStats = nation.economy.getHourlyConstructionStats();
                const netHourlyChange = hourlyBaseChange - constructionStats.cost;
                const dailyChange = netHourlyChange * 24;
                const changeSign = dailyChange >= 0 ? '+' : '';
                const changeColor = dailyChange >= 0 ? 'green' : 'red';

                html += `<div>총 공장: (경: ${nation.economy.lightIndustry} / 중: ${nation.economy.heavyIndustry} / 소: ${nation.economy.consumerGoodsIndustry})</div>`;
                html += `<div>가용 공장: (경: ${availableFactories.light} / 중: ${availableFactories.heavy})</div>`;
                html += `<div>경제 단위: ${Math.floor(nation.economy.economicUnits)} <span style="color: ${changeColor}">(${changeSign}${Math.floor(dailyChange)}/일)</span></div>`;

                html += `<h4>건설 진행</h4>`;
                const constr = nation.economy.construction;
                const costs = nation.economy.factoryCosts;
                const renderBuildProgress = (type, name) => {
                    const progress = constr.progress[type];
                    const cost = costs[type];
                    const percent = Math.min(100, (progress / cost * 100)).toFixed(1);
                    return `<div>${name}: <progress value="${percent}" max="100"></progress> ${percent}% (${Math.floor(progress)}/${cost})</div>`;
                };
                html += renderBuildProgress('light', '경공업');
                html += renderBuildProgress('heavy', '중공업');
                html += renderBuildProgress('consumer', '소비재');
            }

            html += `<h4>자원 생산량</h4>`;
            const income = nation.economy.resourceIncome;
            const allResourceKeys = Object.keys(income);

            if (allResourceKeys.length > 0) {
                html += '<ul>';
                allResourceKeys.forEach(key => {
                    const resourceName = RESOURCE_TYPES[key]?.name || key;
                    const incomeAmount = income[key] || 0;
                    html += `<li>${resourceName}: ${incomeAmount}</li>`;
                });
                html += '</ul>';
            } else {
                html += '<p>자원 수입 없음</p>';
            }

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

            if (!isAI) {
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
            }
        });
        this.productionPanel.innerHTML = html;
    }

    addProductionLine() {
        const team = document.getElementById('team-select').value;
        const equipmentKey = document.getElementById('equipment-select').value;
        const assignedLight = parseInt(document.getElementById('light-factory-input').value, 10);
        const assignedHeavy = parseInt(document.getElementById('heavy-factory-input').value, 10);
        const nation = this.gameUI.nations.get(team);
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
}