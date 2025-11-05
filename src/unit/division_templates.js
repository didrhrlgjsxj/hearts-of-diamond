/**
 * 이 파일은 게임에서 사용될 부대 편제 설계를 정의합니다.
 * 각 설계는 유닛의 계층 구조와 타입을 명시합니다.
 */

// --- 미리 계산된 능력치 세트 ---
// 보병 중대 (분대 9개 기준)
const INFANTRY_COMPANY_STATS = {
    _baseStrength: 108, // 12 * 9
    firepower: 9,       // 1 * 9
    softAttack: 18,     // 2 * 9
    hardAttack: 4.5,    // 0.5 * 9
    reconnaissance: 9,  // 1 * 9
    armor: 0,
    maxOrganization: 190, // 100 + (10 * 9)
};

const DIVISION_TEMPLATES = {
    "HQ Company": {
        name: "본부 중대",
        unitClass: Company,
        // 이 템플릿은 더 이상 직접 사용되지 않습니다.
        // 지휘 부대가 직접 본부 역할을 수행합니다.
        build: () => null,
    },
    "Infantry Division": {
        name: "보병 사단",
        unitClass: CommandUnit,
        build: (parentName, x, y, team) => {
            const unitNumber = unitCounters['Division']++;
            const unitName = `제${unitNumber}사단`;

            // 1. 사단 유닛을 직접 생성합니다.
            const division = new CommandUnit(unitName, x, y, team, 12, 'DIVISION');

            // 3. 10개의 보병 대대를 생성하여 추가합니다. (구조 단순화)
            const rolesToAssign = [
                ...Array(4).fill(BATTALION_ROLES.VANGUARD),   // 4개 대대 선봉
                ...Array(4).fill(BATTALION_ROLES.MAIN_FORCE), // 4개 대대 주력
                ...Array(2).fill(BATTALION_ROLES.RESERVE)     // 2개 대대 예비
            ];

            for (let i = 0; i < 10; i++) {
                const battalion = DIVISION_TEMPLATES["보병 대대"].build(unitName, x, y, team);
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

            // 3. 3개의 보병 대대를 생성하여 추가합니다.
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

            // 3. 2개의 보병 대대를 생성하여 추가합니다.
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

            // 4개의 유지 중대를 추가합니다. (2배 증가)
            for (let i = 0; i < 4; i++) {
                const company = DIVISION_TEMPLATES["Infantry Company"].build(unitName, x, y, team);
                company.role = COMPANY_ROLES.SUSTAINMENT; // '유지대'
                battalion.addUnit(company);
            }

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