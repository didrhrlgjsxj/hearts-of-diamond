class UnitDebugPanel {
    constructor(gameUI) {
        this.gameUI = gameUI;
        this.unitTemplateSelect = null;
        this.resetFormationButton = null;
        this.panel = this.createUnitDebugPanel();
    }

    createUnitDebugPanel() {
        const panel = document.createElement('div');
        panel.id = 'unit-debug-panel';
        panel.className = 'main-panel';

        const spawnHeader = document.createElement('h3');
        spawnHeader.textContent = '부대 소환 (디버그)';

        const teamSelect = UIUtils.createSelect('unit-team-select', '팀 선택:', { blue: '블루 공화국', red: '레드 왕국' });

        const templateOptions = {};
        if (UNIT_TEMPLATES_JSON) {
            Object.keys(UNIT_TEMPLATES_JSON).forEach(key => {
                const template = UNIT_TEMPLATES_JSON[key];
                if (template.echelon === 'DIVISION' || template.echelon === 'BRIGADE' || template.echelon === 'REGIMENT') {
                    templateOptions[key] = template.name;
                }
            });
        }
        const templateSelect = UIUtils.createSelect('template-select', '부대 설계:', templateOptions);

        const spawnButton = document.createElement('button');
        spawnButton.textContent = '소환';
        spawnButton.onclick = () => this.spawnUnit();

        this.unitTemplateSelect = templateSelect.select;

        this.resetFormationButton = document.createElement('button');
        this.resetFormationButton.id = 'reset-formation-button';
        this.resetFormationButton.textContent = '기본 진형으로 복귀';

        panel.append(spawnHeader, teamSelect.label, teamSelect.select, templateSelect.label, templateSelect.select, spawnButton, this.resetFormationButton);
        return panel;
    }

    spawnUnit() {
        const team = document.getElementById('unit-team-select').value;
        const templateKey = document.getElementById('template-select').value;

        if (templateKey) {
            const worldCoords = this.gameUI.camera.screenToWorld(this.gameUI.camera.canvas.width / 2, this.gameUI.camera.canvas.height / 2);
            this.gameUI.unitManager.spawnUnit(templateKey, worldCoords.x, worldCoords.y, team);
        }
    }

    updateResetFormationButton(unit) {
        if (!this.resetFormationButton) return;
        // 버튼 표시 로직은 GameUI에서 호출 시 처리
    }
}