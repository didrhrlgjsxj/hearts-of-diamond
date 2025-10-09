/**
 * 게임의 사용자 인터페이스(UI)를 관리하는 클래스입니다.
 */
class GameUI {
    /**
     * @param {Camera} camera - 게임 카메라 인스턴스
     * @param {Unit[]} unitList - 게임의 최상위 유닛 목록
     */
    constructor(camera, unitList) {
        this.camera = camera;
        this.topLevelUnits = unitList;
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
        spawnButton.onclick = () => this.spawnUnit();

        panel.append('<h3>유닛 소환</h3>', teamSelect.label, teamSelect.select, unitTypeSelect.label, unitTypeSelect.select, spawnButton);
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

    spawnUnit() {
        const team = document.getElementById('team-select').value;
        const templateKey = document.getElementById('unit-type-select').value;
        const template = DIVISION_TEMPLATES[templateKey];

        // 카메라 중앙 위치에 유닛을 소환합니다.
        const spawnPos = this.camera.screenToWorld(this.camera.canvas.width / 2, this.camera.canvas.height / 2);

        if (template && template.build) {
            const newUnit = template.build(`New ${template.name}`, spawnPos.x, spawnPos.y, team);
            this.topLevelUnits.push(newUnit);
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

        const activeCompanies = unit.getAllCompanies().filter(c => c.currentStrength > 0);
        const composition = {};

        // 각 중대의 하위 분대 타입을 집계합니다.
        for (const company of activeCompanies) {
            const squads = company.getAllSquads();
            squads.forEach(squad => {
                composition[squad.type] = (composition[squad.type] || 0) + 1;
            });
        }
        let html = `<h3>부대 구성 (${Object.values(composition).reduce((a, b) => a + b, 0)}개 분대)</h3>`;
        if (Object.keys(composition).length > 0) {
            html += '<ul>';
            // UNIT_TYPES 순서대로 정렬하여 표시
            Object.values(UNIT_TYPES).forEach(type => {
                if (composition[type]) {
                    html += `<li>${type}: ${composition[type]}</li>`;
                }
            });
            html += '</ul>';
        }
        this.compositionPanel.innerHTML = html;
        this.compositionPanel.style.display = 'block';
    }
}