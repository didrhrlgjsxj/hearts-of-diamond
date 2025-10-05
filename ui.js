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
        this.unitClasses = {
            Corps,
            Division,
            Brigade,
            Battalion,
            Company,
        };
        this.createControlPanel();
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
        const unitTypeSelect = this.createSelect('unit-type-select', '부대 단위:', {
            Corps: '군단 (Corps)',
            Division: '사단 (Division)',
            Brigade: '여단 (Brigade)',
            Battalion: '대대 (Battalion)',
            Company: '중대 (Company)',
        });

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
        const unitType = document.getElementById('unit-type-select').value;
        const UnitClass = this.unitClasses[unitType];

        // 카메라 중앙 위치에 유닛을 소환합니다.
        const spawnPos = this.camera.screenToWorld(this.camera.canvas.width / 2, this.camera.canvas.height / 2);

        if (UnitClass) {
            const newUnit = new UnitClass(`New ${unitType}`, spawnPos.x, spawnPos.y, team);
            this.topLevelUnits.push(newUnit);
        }
    }
}