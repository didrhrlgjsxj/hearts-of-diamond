/**
 * 이 파일은 게임에서 사용될 부대 편제 설계를 정의합니다.
 * 각 설계는 유닛의 계층 구조와 타입을 명시합니다.
 */

const DIVISION_TEMPLATES = {
    "HQ Company": {
        name: "본부 중대",
        unitClass: Company,
        build: (name, x, y, team) => {
            const hqCompany = new Company(name, x, y, team);
            hqCompany.isHQ = true;
            hqCompany.role = COMPANY_ROLES.HQ;
            // 본부 중대는 자기 자신이 전투 단위가 될 수 있으나, 상위 부대에 소속될 것이므로 combatSubUnits는 상위에서 관리합니다.
            return hqCompany;
        }
    },
    "Infantry Brigade": {
        name: "보병 여단",
        unitClass: Brigade,
        // 'build' 함수는 이 템플릿으로부터 실제 유닛 인스턴스를 생성하는 로직을 담습니다.
        // 이렇게 하면 복잡한 편제 규칙을 템플릿 내에 캡슐화할 수 있습니다. 
        build: (name, x, y, team) => {
            // 1. "본부 중대" 템플릿을 사용해 HQ 유닛을 먼저 생성합니다.
            const hqCompany = DIVISION_TEMPLATES["HQ Company"].build(`${name}-HQ`, x, y, team);

            // 2. 생성된 HQ의 위치를 기준으로 여단을 생성하고, HQ를 편제에 추가합니다.
            const brigade = new Brigade(name, hqCompany.x, hqCompany.y, team);
            brigade.hqUnit = hqCompany;
            brigade.addUnit(hqCompany);

            // 3. 나머지 전투 중대들을 생성하여 편제에 추가합니다. (1개 정찰, 2개 타격)
            for (let i = 1; i < 4; i++) { // 본부를 제외한 나머지 중대 생성
                const company = new Company(`${name}-${i}`, 0, 0, team);
                if (i === 1) {
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

            // 4. 전투를 수행할 부대 목록(combatSubUnits)을 설정합니다. (HQ 제외)
            brigade.combatSubUnits = brigade.subUnits.filter(u => !u.isHQ);

            brigade.updateCombatSubUnitPositions();
            return brigade;
        }
    },
    "Infantry Battalion": {
        name: "보병 대대",
        unitClass: Battalion,
        build: (name, x, y, team) => {
            const hqCompany = DIVISION_TEMPLATES["HQ Company"].build(`${name}-HQ`, x, y, team);

            const battalion = new Battalion(name, hqCompany.x, hqCompany.y, team);
            battalion.hqUnit = hqCompany;
            battalion.addUnit(hqCompany);

            // 2개의 유지 중대를 추가합니다.
            for (let i = 1; i < 3; i++) { // 본부를 제외한 나머지 중대 생성
                const company = new Company(`${name}-${i}`, 0, 0, team);
                    // 나머지는 유지대로 설정
                    company.role = COMPANY_ROLES.SUPPORT;
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