/**
 * 이 파일은 게임에서 사용될 부대 편제 설계를 정의합니다.
 * 각 설계는 유닛의 계층 구조와 타입을 명시합니다.
 */

const DIVISION_TEMPLATES = {
    "Infantry Brigade": {
        name: "보병 여단",
        unitClass: Brigade,
        // 'build' 함수는 이 템플릿으로부터 실제 유닛 인스턴스를 생성하는 로직을 담습니다.
        // 이렇게 하면 복잡한 편제 규칙을 템플릿 내에 캡슐화할 수 있습니다.
        build: (name, x, y, team) => {
            const brigade = new Brigade(name, x, y, team);

            // 3개의 보병 대대 추가
            for (let i = 0; i < 3; i++) {
                const battalion = new Battalion(`${name}-${i+1}`, 0, 0, team);
                for (let j = 0; j < 3; j++) {
                    const company = new Company(`${battalion.name}-${j+1}`, 0, 0, team);
                    for (let k = 0; k < 3; k++) {
                        const platoon = new Platoon(`${company.name}-${k+1}`, 0, 0, team);
                        for (let l = 0; l < 3; l++) {
                            const squad = new Squad(`${platoon.name}-${l+1}`, 0, 0, team);
                            platoon.addUnit(squad);
                        }
                        company.addUnit(platoon);
                    }
                    battalion.addUnit(company);
                }
                brigade.addUnit(battalion);
            }

            // 편제 생성 후, 전체 분대 목록을 다시 계산합니다.
            brigade.combatSubUnits = brigade.getAllSquads();

            // 여단 특성: 첫 번째 분대를 정찰 분대로 변경
            if (brigade.combatSubUnits.length > 0) {
                brigade.combatSubUnits[0].setType(UNIT_TYPES.RECON);
            }

            brigade.updateCombatSubUnitPositions();
            return brigade;
        }
    },
    // 향후 여기에 '기갑 여단', '포병 사단' 등 새로운 설계를 추가할 수 있습니다.
};