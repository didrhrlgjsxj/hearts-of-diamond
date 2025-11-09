/**
 * 이 파일은 게임에서 사용될 부대 편제 설계를 정의합니다.
 * 각 설계는 유닛의 계층 구조와 타입을 명시합니다.
 */

const DIVISION_TEMPLATES = {
    "HQ Company": {
        name: "본부 중대",
        unitClass: Company,
        build: (x, y, team, name) => {
            const company = new Company(name, x, y, team);
            company.role = FORMATION_ROLES.REARGUARD; // 본부는 항상 후위에 위치
            // 본부 중대도 다른 보병 중대와 동일하게 3개 소대로 구성됩니다.
            for (let i = 0; i < 3; i++) {
                company.addUnit(DIVISION_TEMPLATES["Infantry Platoon"].build(x, y, team, name));
            }

            company.calculateStats();
            return company;
        }
    },
    "Infantry Division": {
        name: "보병 사단",
        unitClass: SymbolUnit,
        build: (x, y, team) => {
            const unitNumber = unitCounters['Division']++;
            const unitName = `제${unitNumber}사단`;

            // 1. 사단 유닛을 직접 생성합니다.
            const division = new SymbolUnit(unitName, x, y, team, 12, 'DIVISION');

            // 2. 본부 대대를 생성하여 사단의 hqBattalion으로 지정합니다.
            const hqCompany = DIVISION_TEMPLATES["HQ Company"].build(x, y, team, `${unitName} 본부`);
            division.hqCompany = hqCompany;
            division.addUnit(hqCompany);

            // 3. 나머지 9개의 보병 대대를 생성하여 추가합니다.
            const rolesToAssign = [
                ...Array(2).fill(FORMATION_ROLES.VANGUARD), // 2개 대대 선봉
                ...Array(3).fill(FORMATION_ROLES.FRONTLINE),// 3개 대대 전위
                ...Array(4).fill(FORMATION_ROLES.MIDGUARD), // 4개 대대 중위
            ];

            for (let i = 0; i < 9; i++) { // 본부 대대 외 9개 대대를 생성하도록 수정
                const battalion = DIVISION_TEMPLATES["보병 대대"].build(x, y, team);
                battalion.role = rolesToAssign[i]; // 역할 할당
                division.addUnit(battalion);
            }

            division.calculateStats(); // 모든 편제가 끝난 후 능력치 계산
            division.organization = division.maxOrganization; // 계산된 능력치 기반으로 조직력 초기화

            // 4. 사단의 전투 단위는 휘하의 모든 대대들입니다.
            division.combatSubUnits = division.getAllBattalions();

            // 5. 사단 크기를 휘하 중대 수에 비례하여 조정합니다.
            const companyCount = division.getAllCompanies().length;
            division.size = 6 + companyCount * 0.5; // 기본 크기 6 + 중대당 0.5

            division.updateCombatSubUnitPositions();
            division.initializeOrganization(); // 모든 편제가 끝난 후 조직력 초기화
            return division;
        }
    },
    "Infantry Brigade": {
        name: "보병 여단",
        unitClass: SymbolUnit,
        // 'build' 함수는 이 템플릿으로부터 실제 유닛 인스턴스를 생성하는 로직을 담습니다.
        // 이렇게 하면 복잡한 편제 규칙을 템플릿 내에 캡슐화할 수 있습니다.
        build: (x, y, team) => {
            const unitNumber = unitCounters['Brigade']++;
            const unitName = `제${unitNumber}여단`;

            // 1. 여단 유닛을 직접 생성합니다.
            const brigade = new SymbolUnit(unitName, x, y, team, 10, 'BRIGADE');

            // 2. 본부 대대를 생성하여 여단의 hqBattalion으로 지정합니다.
            const hqCompany = DIVISION_TEMPLATES["HQ Company"].build(x, y, team, `${unitName} 본부`);
            brigade.hqCompany = hqCompany;
            brigade.addUnit(hqCompany);

            // 3. 나머지 2개의 보병 대대를 생성하여 추가합니다.
            const rolesToAssign = [
                FORMATION_ROLES.VANGUARD,
                FORMATION_ROLES.FRONTLINE,
                FORMATION_ROLES.FRONTLINE,
            ];
            for (let i = 0; i < 3; i++) {
                const battalion = DIVISION_TEMPLATES["보병 대대"].build(x, y, team);
                battalion.role = rolesToAssign[i];
                brigade.addUnit(battalion);
            }

            brigade.calculateStats();
            brigade.organization = brigade.maxOrganization;

            // 4. 전투를 수행할 부대 목록(combatSubUnits)을 설정합니다. (HQ 제외)
            // 여단의 전투 단위는 휘하의 모든 대대들입니다.
            brigade.combatSubUnits = brigade.getAllBattalions();

            // 5. 여단 크기를 휘하 중대 수에 비례하여 조정합니다.
            const companyCount = brigade.getAllCompanies().length;
            brigade.size = 6 + companyCount * 0.5; // 기본 크기 6 + 중대당 0.5

            brigade.updateCombatSubUnitPositions();
            brigade.initializeOrganization();
            return brigade;
        }
    },
    "Infantry Regiment": {
        name: "보병 연대",
        unitClass: SymbolUnit,
        build: (x, y, team) => {
            const unitNumber = unitCounters['Regiment']++;
            const unitName = `제${unitNumber}연대`;

            // 1. 연대 유닛을 직접 생성합니다.
            const regiment = new SymbolUnit(unitName, x, y, team, 9, 'REGIMENT');

            // 2. 본부 대대를 생성하여 연대의 hqBattalion으로 지정합니다.
            const hqCompany = DIVISION_TEMPLATES["HQ Company"].build(x, y, team, `${unitName} 본부`);
            regiment.hqCompany = hqCompany;
            regiment.addUnit(hqCompany);

            // 3. 나머지 1개의 보병 대대를 생성하여 추가합니다.
            const rolesToAssign = [
                FORMATION_ROLES.VANGUARD,
                FORMATION_ROLES.FRONTLINE,
            ];
            for (let i = 0; i < 2; i++) {
                const battalion = DIVISION_TEMPLATES["보병 대대"].build(x, y, team);
                battalion.role = rolesToAssign[i];
                regiment.addUnit(battalion);
            }

            regiment.calculateStats();
            regiment.organization = regiment.maxOrganization;

            // 연대의 전투 단위는 휘하의 모든 대대들입니다.
            regiment.combatSubUnits = regiment.getAllBattalions();
            const companyCount = regiment.getAllCompanies().length;
            regiment.size = 6 + companyCount * 0.5;
            regiment.updateCombatSubUnitPositions();
            regiment.initializeOrganization();
            return regiment;
        }
    },
    "보병 대대": {
        name: "보병 대대",
        unitClass: Battalion,
        build: (x, y, team) => {
            const unitNumber = unitCounters['Battalion']++;
            const unitName = `제${unitNumber}대대`;

            const battalion = new Battalion(unitName, x, y, team, 8);

            // 대대의 본부 중대를 생성하고 할당합니다.
            const hqCompany = DIVISION_TEMPLATES["HQ Company"].build(x, y, team, `${unitName} 본부`);
            battalion.hqCompany = hqCompany;
            battalion.addUnit(hqCompany);

            const rolesToAssign = [
                FORMATION_ROLES.VANGUARD,
                FORMATION_ROLES.FRONTLINE,
                FORMATION_ROLES.FRONTLINE,
                FORMATION_ROLES.MIDGUARD,
            ];

            for (let i = 0; i < 4; i++) {
                const company = DIVISION_TEMPLATES["Infantry Company"].build(x, y, team, unitName);
                company.role = rolesToAssign[i];
                battalion.addUnit(company);
            }

            // 역할별로 중대를 그룹화하고, 각 그룹 내에서 순번(lineIndex)과 이웃을 설정합니다.
            const companiesByRole = {};
            battalion.subUnits.filter(u => u instanceof Company).forEach(c => {
                if (!companiesByRole[c.role]) companiesByRole[c.role] = [];
                companiesByRole[c.role].push(c);
            });

            Object.values(companiesByRole).forEach(roleGroup => {
                roleGroup.forEach((company, index) => {
                    company.lineIndex = index;
                    company.leftNeighbor = roleGroup[index - 1] || null;
                    company.rightNeighbor = roleGroup[index + 1] || null;
                });
            });


            battalion.calculateStats();
            battalion.organization = battalion.maxOrganization;

            // 대대는 이제 스스로가 전투 단위입니다.
            battalion.combatSubUnits.push(battalion);

            // 대대 크기를 휘하 중대 수에 비례하여 조정합니다.
            const companyCount = battalion.getAllCompanies().length;
            battalion.size = 6 + companyCount * 0.5; // 기본 크기 6 + 중대당 0.5
            battalion.updateCombatSubUnitPositions();
            battalion.initializeOrganization();
            return battalion;
        }
    },
    "Infantry Company": {
        name: "보병 중대",
        unitClass: Company,
        build: (x, y, team, parentUnitName = '') => {
            const unitNumber = unitCounters['Company']++;
            const unitName = `제${unitNumber}중대`;

            const company = new Company(unitName, x, y, team);
            parentUnitName = parentUnitName ? `${parentUnitName} ` : '';
            
            // 3개의 보병 소대로 구성
            for (let i = 0; i < 3; i++) {
                company.addUnit(DIVISION_TEMPLATES["Infantry Platoon"].build(x, y, team, parentUnitName));
            }

            company.calculateStats();
            company.organization = company.maxOrganization;

            return company;
        }
    },
    "Infantry Platoon": {
        name: "보병 소대",
        unitClass: Platoon,
        build: (x, y, team, parentUnitName = '') => {
            const platoon = new Platoon(`${parentUnitName}소대`, x, y, team);

            // 3개의 보병 분대로 구성
            for (let i = 0; i < 3; i++) {
                platoon.addUnit(new Squad(`${parentUnitName}분대`, x, y, team));
            }

            platoon.calculateStats();
            return platoon;
        }
    },
    "Infantry Squad": {
        name: "보병 분대",
        unitClass: Squad,
        build: (x, y, team) => null,
    },
};