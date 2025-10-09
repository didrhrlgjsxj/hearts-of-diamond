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

            // 1개 본부, 1개 정찰, 2개 타격, 1개 유지 중대 (총 5개)
            for (let i = 0; i < 4; i++) {
                const company = new Company(`${name}-${i+1}`, 0, 0, team);
                if (i === 0) { // 첫 번째 중대를 본부로 지정
                    company.isHQ = true;
                    company.role = COMPANY_ROLES.HQ;
                    brigade.hqUnit = company;
                } else if (i === 1) {
                    company.role = COMPANY_ROLES.RECON;
                } else {
                    // 나머지는 타격대로 설정
                    company.role = COMPANY_ROLES.STRIKE;
                }

                for (let j = 0; j < 3; j++) {
                    const platoon = new Platoon(`${company.name}-${j+1}`, 0, 0, team);
                    for (let k = 0; k < 3; k++) {
                        const squad = new Squad(`${platoon.name}-${k+1}`, 0, 0, team);
                        platoon.addUnit(squad);
                    }
                    company.addUnit(platoon);
                }
                brigade.addUnit(company);
            }

            // 전투 부대는 본부(HQ)를 제외한 중대들입니다.
            brigade.combatSubUnits = brigade.subUnits.filter(u => !u.isHQ);

            brigade.updateCombatSubUnitPositions();
            return brigade;
        }
    },
    "Infantry Battalion": {
        name: "보병 대대",
        unitClass: Battalion,
        build: (name, x, y, team) => {
            const battalion = new Battalion(name, x, y, team);

            // 1개 본부, 2개 유지 중대
            for (let i = 0; i < 3; i++) {
                const company = new Company(`${name}-${i+1}`, 0, 0, team);
                if (i === 0) { // 첫 번째 중대를 본부로 지정
                    company.isHQ = true;
                    company.role = COMPANY_ROLES.HQ;
                    battalion.hqUnit = company;
                } else {
                    // 나머지는 유지대로 설정
                    company.role = COMPANY_ROLES.SUPPORT;
                }
                const platoon = new Platoon(`${company.name}-1`, 0, 0, team);
                for (let k = 0; k < 3; k++) {
                    const squad = new Squad(`${platoon.name}-${k+1}`, 0, 0, team);
                    platoon.addUnit(squad);
                }
                company.addUnit(platoon);
                battalion.addUnit(company);
            }

            battalion.combatSubUnits = battalion.subUnits.filter(u => !u.isHQ);
            battalion.updateCombatSubUnitPositions();
            return battalion;
        }
    },
    "Infantry Company": {
        name: "보병 중대",
        unitClass: Company,
        build: (name, x, y, team) => {
            const company = new Company(name, x, y, team);

            // 3개의 보병 소대 추가
            for (let i = 0; i < 3; i++) {
                const platoon = new Platoon(`${name}-${i+1}`, 0, 0, team);
                for (let j = 0; j < 3; j++) {
                    const squad = new Squad(`${platoon.name}-${j+1}`, 0, 0, team);
                    platoon.addUnit(squad);
                }
                company.addUnit(platoon);
            }

            company.combatSubUnits = [company]; // 중대는 자기 자신이 전투 단위입니다.
            company.updateCombatSubUnitPositions();
            return company;
        }
    },
    "Infantry Platoon": {
        name: "보병 소대",
        unitClass: Platoon,
        build: (name, x, y, team) => {
            const platoon = new Platoon(name, x, y, team);

            // 3개의 보병 분대 추가
            for (let i = 0; i < 3; i++) {
                const squad = new Squad(`${name}-${i+1}`, 0, 0, team);
                platoon.addUnit(squad);
            }

            // 소대는 전투 단위가 아니므로 combatSubUnits를 설정하지 않습니다.
            platoon.updateCombatSubUnitPositions();
            return platoon;
        }
    },
    "Infantry Squad": {
        name: "보병 분대",
        unitClass: Squad,
        build: (name, x, y, team) => {
            const squad = new Squad(name, x, y, team);
            // 분대는 전투 단위가 아니므로 combatSubUnits를 설정하지 않습니다.
            // 전투 단위가 아니므로 combatSubUnits를 설정하지 않습니다.
            squad.updateCombatSubUnitPositions();
            return squad;
        }
    },
};