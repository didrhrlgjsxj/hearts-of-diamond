/**
 * 이 파일은 게임에서 사용될 부대 편제 설계를 정의합니다.
 * 각 설계는 유닛의 계층 구조와 타입을 명시합니다.
 */

const DIVISION_TEMPLATES = {
    "HQ Company": {
        name: "본부 중대",
        unitClass: Company,
        build: (parentName, x, y, team) => {
            const unitName = `본부 중대 - ${parentName}`;
            const hqCompany = new Company(unitName, x, y, team);
            hqCompany.isHQ = true;
            hqCompany.role = COMPANY_ROLES.HQ;
            return hqCompany;
        }
    },
    "Infantry Division": {
        name: "보병 사단",
        unitClass: Division,
        build: (parentName, x, y, team) => {
            const unitNumber = unitCounters['Division']++;
            const unitName = `제${unitNumber}사단`;

            // 1. 본부 중대를 생성합니다.
            const hqCompany = DIVISION_TEMPLATES["HQ Company"].build(unitName, x, y, team);

            // 2. 사단을 생성하고 본부를 추가합니다.
            const division = new Division(unitName, hqCompany.x, hqCompany.y, team, 12);
            division.hqUnit = hqCompany;
            division.addUnit(hqCompany);

            // 3. 4개의 보병 여단을 생성하여 추가합니다. (2배 증가)
            for (let i = 0; i < 4; i++) {
                const brigade = DIVISION_TEMPLATES["Infantry Brigade"].build(unitName, x, y, team);
                division.addUnit(brigade);
            }

            // 4. 사단의 전투 단위는 휘하의 모든 중대들입니다.
            division.combatSubUnits = division.getAllCompanies();

            // 5. 사단 크기를 휘하 중대 수에 비례하여 조정합니다.
            const companyCount = division.getAllCompanies().length;
            division.size = 6 + companyCount * 0.5; // 기본 크기 6 + 중대당 0.5

            division.updateCombatSubUnitPositions();
            return division;
        }
    },
    "Infantry Brigade": {
        name: "보병 여단",
        unitClass: Brigade,
        // 'build' 함수는 이 템플릿으로부터 실제 유닛 인스턴스를 생성하는 로직을 담습니다.
        // 이렇게 하면 복잡한 편제 규칙을 템플릿 내에 캡슐화할 수 있습니다. 
        build: (parentName, x, y, team) => {
            const unitNumber = unitCounters['Brigade']++;
            const unitName = `제${unitNumber}여단 - ${parentName}`;

            // 1. "본부 중대" 템플릿을 사용해 HQ 유닛을 먼저 생성합니다.
            const hqCompany = DIVISION_TEMPLATES["HQ Company"].build(unitName, x, y, team);

            // 2. 생성된 HQ의 위치를 기준으로 여단을 생성하고, HQ를 편제에 추가합니다.
            const brigade = new Brigade(unitName, hqCompany.x, hqCompany.y, team, 10);
            brigade.hqUnit = hqCompany;
            brigade.addUnit(hqCompany);

            // 3. 3개의 보병 대대를 생성하여 추가합니다.
            for (let i = 0; i < 3; i++) {
                const battalion = DIVISION_TEMPLATES["보병 대대"].build(unitName, x, y, team);
                brigade.addUnit(battalion);
            }

            // 4. 전투를 수행할 부대 목록(combatSubUnits)을 설정합니다. (HQ 제외)
            // 여단의 전투 단위는 휘하의 모든 중대들입니다.
            brigade.combatSubUnits = brigade.getAllCompanies();

            // 5. 여단 크기를 휘하 중대 수에 비례하여 조정합니다.
            const companyCount = brigade.getAllCompanies().length;
            brigade.size = 6 + companyCount * 0.5; // 기본 크기 6 + 중대당 0.5

            brigade.updateCombatSubUnitPositions();
            return brigade;
        }
    },
    "Infantry Regiment": {
        name: "보병 연대",
        unitClass: Regiment,
        build: (parentName, x, y, team) => {
            const unitNumber = unitCounters['Regiment']++;
            const unitName = `제${unitNumber}연대 - ${parentName}`;

            // 1. 본부 중대를 생성합니다.
            const hqCompany = DIVISION_TEMPLATES["HQ Company"].build(unitName, x, y, team);

            // 2. 연대를 생성하고 본부를 추가합니다.
            const regiment = new Regiment(unitName, hqCompany.x, hqCompany.y, team, 9);
            regiment.hqUnit = hqCompany;
            regiment.addUnit(hqCompany);

            // 3. 2개의 보병 대대를 생성하여 추가합니다.
            for (let i = 0; i < 2; i++) {
                const battalion = DIVISION_TEMPLATES["보병 대대"].build(unitName, x, y, team);
                regiment.addUnit(battalion);
            }

            // 연대의 전투 단위는 휘하의 모든 중대들입니다.
            regiment.combatSubUnits = regiment.getAllCompanies();
            const companyCount = regiment.getAllCompanies().length;
            regiment.size = 6 + companyCount * 0.5;
            regiment.updateCombatSubUnitPositions();
            return regiment;
        }
    },
    "보병 대대": {
        name: "보병 대대",
        unitClass: Battalion,
        build: (parentName, x, y, team) => {
            const unitNumber = unitCounters['Battalion']++;
            const unitName = `제${unitNumber}대대 - ${parentName}`;

            const hqCompany = DIVISION_TEMPLATES["HQ Company"].build(unitName, x, y, team);

            const battalion = new Battalion(unitName, hqCompany.x, hqCompany.y, team, 8);
            battalion.hqUnit = hqCompany;
            battalion.addUnit(hqCompany);

            // 4개의 유지 중대를 추가합니다. (2배 증가)
            for (let i = 1; i < 5; i++) { // 본부를 제외한 나머지 중대 생성
                const company = DIVISION_TEMPLATES["Infantry Company"].build(unitName, x, y, team);
                    // 나머지는 유지대로 설정
                    company.role = COMPANY_ROLES.SUSTAINMENT; // '유지대'
                const platoon = new Platoon(`${company.name}-1`, x, y, team);
                for (let k = 0; k < 3; k++) {
                    const squad = new Squad(`${platoon.name}-${k+1}`, x, y, team);
                    platoon.addUnit(squad);
                }
                company.addUnit(platoon);
                battalion.addUnit(company);
            }

            // 대대의 전투 단위는 본부 중대를 포함한 모든 휘하 중대들입니다.
            battalion.combatSubUnits = battalion.subUnits.filter(u => u instanceof Company);

            // 대대 크기를 휘하 중대 수에 비례하여 조정합니다.
            const companyCount = battalion.getAllCompanies().length;
            battalion.size = 6 + companyCount * 0.5; // 기본 크기 6 + 중대당 0.5
            battalion.updateCombatSubUnitPositions();
            return battalion;
        }
    },
    "Infantry Company": {
        name: "보병 중대",
        unitClass: Company,
        build: (parentName, x, y, team) => {
            const unitNumber = unitCounters['Company']++;
            const unitName = `제${unitNumber}중대 - ${parentName}`;

            const company = new Company(unitName, x, y, team);

            // 3개의 보병 소대 추가
            for (let i = 0; i < 3; i++) {
                const platoon = new Platoon(`${unitName}-p${i+1}`, x, y, team);
                for (let j = 0; j < 3; j++) {
                    const squad = new Squad(`${platoon.name}-${j+1}`, x, y, team);
                    platoon.addUnit(squad);
                }
                company.addUnit(platoon);
            }

            return company;
        }
    },
    "Infantry Platoon": {
        name: "보병 소대",
        unitClass: Platoon,
        build: (parentName, x, y, team) => {
            const platoon = new Platoon(parentName, x, y, team); // 소대는 별도 이름 없이 상위 부대 이름 따름

            // 3개의 보병 분대 추가
            for (let i = 0; i < 3; i++) {
                const squad = new Squad(`${parentName}-s${i+1}`, x, y, team);
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
        build: (parentName, x, y, team) => {
            const squad = new Squad(parentName, x, y, team); // 분대는 별도 이름 없이 상위 부대 이름 따름
            // 분대는 전투 단위가 아니므로 combatSubUnits를 설정하지 않습니다.
            // 전투 단위가 아니므로 combatSubUnits를 설정하지 않습니다.
            squad.updateCombatSubUnitPositions();
            return squad;
        }
    },
};