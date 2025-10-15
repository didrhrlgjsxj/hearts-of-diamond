import { BATTALION_ROLES, COMPANY_ROLES } from "./unitConstants.js";
import { CommandUnit, Battalion, Company, Platoon, Squad } from "./unitEchelons.js";

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

export const DIVISION_TEMPLATES = {
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
        // 보병 대대 10개 + 본부 중대 1개 기준
        stats: {
            _baseStrength: 5508, // (540 * 10) + 108
            firepower: 459,      // (45 * 10) + 9
            softAttack: 918,     // (90 * 10) + 18
            hardAttack: 229.5,   // (22.5 * 10) + 4.5
            reconnaissance: 459, // (45 * 10) + 9
            maxOrganization: 5590, // 100 + (549 * 10) + 90
        },
        build: (parentName, x, y, team) => {
            const unitNumber = unitCounters['Division']++;
            const unitName = `제${unitNumber}사단`;

            // 1. 사단 유닛을 직접 생성합니다.
            const division = new CommandUnit(unitName, x, y, team, 12, 'DIVISION');
            Object.assign(division, DIVISION_TEMPLATES["Infantry Division"].stats); // 고정 능력치 할당

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

            division.organization = division.maxOrganization;

            // 4. 사단의 전투 단위는 휘하의 모든 중대들입니다.
            division.combatSubUnits = division.getAllCompanies();

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
        // 보병 대대 3개 + 본부 중대 1개 기준
        stats: {
            _baseStrength: 1728,   // (540 * 3) + 108
            firepower: 144,      // (45 * 3) + 9
            softAttack: 288,     // (90 * 3) + 18
            hardAttack: 72,      // (22.5 * 3) + 4.5
            reconnaissance: 144, // (45 * 3) + 9
            maxOrganization: 1737, // 100 + (549 * 3) + 90
        },
        // 'build' 함수는 이 템플릿으로부터 실제 유닛 인스턴스를 생성하는 로직을 담습니다.
        // 이렇게 하면 복잡한 편제 규칙을 템플릿 내에 캡슐화할 수 있습니다. 
        build: (parentName, x, y, team) => {
            const unitNumber = unitCounters['Brigade']++;
            const unitName = `제${unitNumber}여단 - ${parentName}`;

            // 1. 여단 유닛을 직접 생성합니다.
            const brigade = new CommandUnit(unitName, x, y, team, 10, 'BRIGADE');
            Object.assign(brigade, DIVISION_TEMPLATES["Infantry Brigade"].stats); // 고정 능력치 할당

            // 3. 3개의 보병 대대를 생성하여 추가합니다.
            for (let i = 0; i < 3; i++) {
                const battalion = DIVISION_TEMPLATES["보병 대대"].build(unitName, x, y, team);
                brigade.addUnit(battalion);
            }

            brigade.organization = brigade.maxOrganization;

            // 4. 전투를 수행할 부대 목록(combatSubUnits)을 설정합니다. (HQ 제외)
            // 여단의 전투 단위는 휘하의 모든 중대들입니다.
            brigade.combatSubUnits = brigade.getAllCompanies();

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
        // 보병 대대 2개 + 본부 중대 1개 기준
        stats: {
            _baseStrength: 1188,   // (540 * 2) + 108
            firepower: 99,       // (45 * 2) + 9
            softAttack: 198,     // (90 * 2) + 18
            hardAttack: 49.5,    // (22.5 * 2) + 4.5
            reconnaissance: 99,  // (45 * 2) + 9
            maxOrganization: 1188, // 100 + (549 * 2) + 90
        },
        build: (parentName, x, y, team) => {
            const unitNumber = unitCounters['Regiment']++;
            const unitName = `제${unitNumber}연대 - ${parentName}`;

            // 1. 연대 유닛을 직접 생성합니다.
            const regiment = new CommandUnit(unitName, x, y, team, 9, 'REGIMENT');
            Object.assign(regiment, DIVISION_TEMPLATES["Infantry Regiment"].stats); // 고정 능력치 할당

            // 3. 2개의 보병 대대를 생성하여 추가합니다.
            for (let i = 0; i < 2; i++) {
                const battalion = DIVISION_TEMPLATES["보병 대대"].build(unitName, x, y, team);
                regiment.addUnit(battalion);
            }

            regiment.organization = regiment.maxOrganization;

            // 연대의 전투 단위는 휘하의 모든 중대들입니다.
            regiment.combatSubUnits = regiment.getAllCompanies();
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
        // 보병 중대 4개 + 본부 역할(중대 1개 분량) 기준
        stats: {
            _baseStrength: 540,      // 108 * 5
            firepower: 45,           // 9 * 5
            softAttack: 90,          // 18 * 5
            hardAttack: 22.5,        // 4.5 * 5
            reconnaissance: 45,      // 9 * 5
            maxOrganization: 550,    // 100 + (90 * 5)
        },
        build: (parentName, x, y, team) => {
            const unitNumber = unitCounters['Battalion']++;
            const unitName = `제${unitNumber}대대 - ${parentName}`;

            const battalion = new Battalion(unitName, x, y, team, 8);
            Object.assign(battalion, DIVISION_TEMPLATES["보병 대대"].stats); // 고정 능력치 할당

            // 4개의 유지 중대를 추가합니다. (2배 증가)
            for (let i = 0; i < 4; i++) {
                const company = DIVISION_TEMPLATES["Infantry Company"].build(unitName, x, y, team);
                company.role = COMPANY_ROLES.SUSTAINMENT; // '유지대'
                battalion.addUnit(company);
            }

            battalion.organization = battalion.maxOrganization;

            // 대대의 전투 단위는 휘하의 모든 중대들입니다.
            battalion.combatSubUnits = battalion.getAllCompanies();

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
        stats: INFANTRY_COMPANY_STATS,
        build: (parentName, x, y, team) => {
            const unitNumber = unitCounters['Company']++;
            const unitName = `제${unitNumber}중대 - ${parentName}`;

            const company = new Company(unitName, x, y, team);
            
            // 미리 계산된 고정 능력치를 할당합니다.
            Object.assign(company, DIVISION_TEMPLATES["Infantry Company"].stats);
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

// To be used by main.js
import { unitCounters } from "../main.js";