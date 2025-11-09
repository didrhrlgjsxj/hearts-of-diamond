/**
 * 이 파일은 게임에서 사용될 부대 편제 설계를 정의합니다.
 * 각 설계는 유닛의 계층 구조와 타입을 명시합니다.
 */

const DIVISION_TEMPLATES = {
    "HQ Battalion": {
        name: "본부 대대",
        unitClass: Battalion,
        build: (parentName, x, y, team) => {
            const unitName = `${parentName}`;
            const battalion = new Battalion(unitName, x, y, team, 8);

            // 본부 대대는 중대를 갖지 않고, 본부 기능을 수행하는 분대 9개로 직접 구성됩니다.
            // 이렇게 하면 능력치는 계산되지만, 화면에는 하위 중대가 그려지지 않습니다.
            for (let i = 0; i < 9; i++) {
                battalion.addUnit(new Squad(unitName, x, y, team));
            }

            battalion.calculateStats();
            battalion.organization = battalion.maxOrganization;
            battalion.combatSubUnits.push(battalion);
            battalion.initializeOrganization();
            return battalion;
        }
    },
    "Infantry Division": {
        name: "보병 사단",
        unitClass: CommandUnit,
        build: (parentName, x, y, team) => {
            const unitNumber = unitCounters['Division']++;
            const unitName = `제${unitNumber}사단`;

            // 1. 사단 유닛을 직접 생성합니다.
            const division = new CommandUnit(unitName, x, y, team, 12, 'DIVISION');

            // 2. 본부 대대를 생성하여 사단의 hqBattalion으로 지정합니다.
            const hqBattalion = DIVISION_TEMPLATES["HQ Battalion"].build(`${unitName} 본부`, x, y, team);
            hqBattalion.role = BATTALION_ROLES.RESERVE; // 본부 대대는 항상 '후위' 역할
            division.hqBattalion = hqBattalion;
            division.addUnit(hqBattalion); // 본부 대대도 하위 유닛으로 추가

            // 3. 나머지 9개의 보병 대대를 생성하여 추가합니다.
            const rolesToAssign = [
                ...Array(4).fill(BATTALION_ROLES.VANGUARD),   // 4개 대대 선봉
                ...Array(4).fill(BATTALION_ROLES.MAIN_FORCE), // 4개 대대 주력
                ...Array(2).fill(BATTALION_ROLES.RESERVE)     // 2개 대대 예비
            ];

            for (let i = 0; i < 10; i++) {
                const battalion = DIVISION_TEMPLATES["보병 대대"].build(`${unitName} ${i+1}대대`, x, y, team);
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
        unitClass: CommandUnit,
        // 'build' 함수는 이 템플릿으로부터 실제 유닛 인스턴스를 생성하는 로직을 담습니다.
        // 이렇게 하면 복잡한 편제 규칙을 템플릿 내에 캡슐화할 수 있습니다. 
        build: (parentName, x, y, team) => {
            const unitNumber = unitCounters['Brigade']++;
            const unitName = `제${unitNumber}여단 - ${parentName}`;

            // 1. 여단 유닛을 직접 생성합니다.
            const brigade = new CommandUnit(unitName, x, y, team, 10, 'BRIGADE');

            // 2. 본부 대대를 생성하여 여단의 hqBattalion으로 지정합니다.
            const hqBattalion = DIVISION_TEMPLATES["HQ Battalion"].build(`${unitName} 본부`, x, y, team);
            hqBattalion.role = BATTALION_ROLES.RESERVE; // 본부 대대는 항상 '후위' 역할
            brigade.hqBattalion = hqBattalion;
            brigade.addUnit(hqBattalion);

            // 3. 나머지 2개의 보병 대대를 생성하여 추가합니다.
            for (let i = 0; i < 3; i++) {
                const battalion = DIVISION_TEMPLATES["보병 대대"].build(unitName, x, y, team);
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
        unitClass: CommandUnit,
        build: (parentName, x, y, team) => {
            const unitNumber = unitCounters['Regiment']++;
            const unitName = `제${unitNumber}연대 - ${parentName}`;

            // 1. 연대 유닛을 직접 생성합니다.
            const regiment = new CommandUnit(unitName, x, y, team, 9, 'REGIMENT');

            // 2. 본부 대대를 생성하여 연대의 hqBattalion으로 지정합니다.
            const hqBattalion = DIVISION_TEMPLATES["HQ Battalion"].build(`${unitName} 본부`, x, y, team);
            hqBattalion.role = BATTALION_ROLES.RESERVE; // 본부 대대는 항상 '후위' 역할
            regiment.hqBattalion = hqBattalion;
            regiment.addUnit(hqBattalion);

            // 3. 나머지 1개의 보병 대대를 생성하여 추가합니다.
            for (let i = 0; i < 2; i++) {
                const battalion = DIVISION_TEMPLATES["보병 대대"].build(unitName, x, y, team);
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
        build: (parentName, x, y, team) => {
            const unitNumber = unitCounters['Battalion']++;
            const unitName = `제${unitNumber}대대 - ${parentName}`;

            const battalion = new Battalion(unitName, x, y, team, 8);

            for (let i = 0; i < 4; i++) {
                const company = DIVISION_TEMPLATES["Infantry Company"].build(unitName, x, y, team);
                // 4개 중대를 선봉 1, 전위 2, 후위 1로 나눕니다.
                if (i === 0) company.role = COMPANY_ROLES.VANGUARD;
                else if (i < 3) company.role = COMPANY_ROLES.FRONTLINE;
                else company.role = COMPANY_ROLES.REARGUARD;
                battalion.addUnit(company);
            }

            // 역할별로 중대를 그룹화하고, 각 그룹 내에서 순번(lineIndex)과 이웃을 설정합니다.
            const companiesByRole = {};
            battalion.subUnits.forEach(c => {
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
        build: (parentName, x, y, team) => {
            const unitNumber = unitCounters['Company']++;
            const unitName = `제${unitNumber}중대 - ${parentName}`;

            const company = new Company(unitName, x, y, team);
            
            // 보병 분대 9개로 구성
            for (let i = 0; i < 9; i++) {
                company.addUnit(new Squad(unitName, x, y, team));
            }

            company.calculateStats();
            company.organization = company.maxOrganization;

            return company;
        }
    },
    "Infantry Platoon": {
        name: "보병 소대",
        unitClass: Platoon,
        build: (parentName, x, y, team) => {
            // 소대와 분대는 이제 실제 게임 객체로 생성되지 않습니다.
            // 중대 이상의 단위만 생성됩니다.
            return null;
        }
    },
    "Infantry Squad": {
        name: "보병 분대",
        unitClass: Squad,
        build: (parentName, x, y, team) => null,
    },
};