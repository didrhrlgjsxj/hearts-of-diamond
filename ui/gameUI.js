class GameUI {
    constructor(camera, nations, unitManager) {
        this.camera = camera;
        this.nations = nations;
        this.unitManager = unitManager;

        this.economyPanelManager = new EconomyPanel(this);
        this.unitDebugPanelManager = new UnitDebugPanel(this);
        this.unitDesignerManager = new UnitDesigner(this);
        this.infoPanelsManager = new InfoPanels(this);

        this.createMainInterface();
        this.createTimeControls();
    }

    addUIElementListener(element) {
        element.addEventListener('mouseenter', () => {
            this.camera.resetKeys();
        });
    }

    createMainInterface() {
        const container = document.createElement('div');
        container.id = 'main-ui-container';

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

        container.append(
            buttonContainer, 
            this.economyPanelManager.panel, 
            this.unitDebugPanelManager.panel, 
            this.unitDesignerManager.panel
        );
        document.body.appendChild(container);
        this.addUIElementListener(container);

        this.switchMainPanel('economy');
    }

    switchMainPanel(panelName) {
        const buttons = document.querySelectorAll('.panel-toggle-buttons button');
        buttons.forEach(btn => btn.classList.remove('active'));

        this.economyPanelManager.panel.classList.remove('active');
        this.unitDebugPanelManager.panel.classList.remove('active');
        this.unitDesignerManager.panel.classList.remove('active');

        if (panelName === 'economy') {
            this.economyPanelManager.panel.classList.add('active');
            buttons[0].classList.add('active');
        } else if (panelName === 'unit-debug') {
            this.unitDebugPanelManager.panel.classList.add('active');
            buttons[1].classList.add('active');
        } else if (panelName === 'unit-designer') {
            this.unitDesignerManager.panel.classList.add('active');
            buttons[2].classList.add('active');
        }
    }

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
        const timeDisplayContainer = document.getElementById('time-display');
        if (timeDisplayContainer) timeDisplayContainer.appendChild(timeControls);
        this.updateTimeControls();
    }

    updateTimeControls() {
        const buttons = document.querySelectorAll('#time-controls button');
        buttons.forEach(button => {
            if (parseInt(button.dataset.speed, 10) === gameSpeed) button.classList.add('active');
            else button.classList.remove('active');
        });
    }

    updateCompositionPanel(unit) {
        this.infoPanelsManager.updateCompositionPanel(unit);
        if (unit instanceof SymbolUnit) {
            this.unitDebugPanelManager.resetFormationButton.style.display = 'block';
            this.unitDebugPanelManager.resetFormationButton.onclick = () => unit.resetFormation && unit.resetFormation();
        } else {
            this.unitDebugPanelManager.resetFormationButton.style.display = 'none';
        }
    }
    updateStatsPanel(unit) { this.infoPanelsManager.updateStatsPanel(unit); }
    updateProvinceInfoPanel(province) { this.infoPanelsManager.updateProvinceInfoPanel(province); }
    updateProductionPanel() { this.economyPanelManager.updateProductionPanel(); }
    updateBattlePanel(battle) { this.infoPanelsManager.updateBattlePanel(battle); }
    updateUnitSpawnList() { 
        const select = this.unitDebugPanelManager.unitTemplateSelect;
        select.innerHTML = '';
        Object.keys(UNIT_TEMPLATES_JSON).forEach(key => {
            const template = UNIT_TEMPLATES_JSON[key];
            if (['DIVISION', 'BRIGADE', 'REGIMENT'].includes(template.echelon)) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = template.name;
                select.appendChild(option);
            }
        });
    }
}