/**
 * 이 파일은 division_templates.json 파일을 읽어 실제 유닛 객체를 생성하는
 * 템플릿 파서(Template Parser) 역할을 합니다.
 */

// JSON 데이터를 저장할 전역 변수
let UNIT_TEMPLATES_JSON = null;

// 부대 규모(Echelon) 문자열과 실제 클래스를 매핑합니다.
const ECHELON_TO_CLASS = {
    'DIVISION': SymbolUnit,
    'BRIGADE': SymbolUnit,
    'REGIMENT': SymbolUnit,
    'BATTALION': SymbolUnit,
    'COMPANY': Company,
    'PLATOON': Platoon,
    'SQUAD': Squad,
};

// 부대 규모별 아이콘 크기를 정의합니다.
const ECHELON_SIZES = {
    'DIVISION': 12,
    'BRIGADE': 10,
    'REGIMENT': 9,
    'BATTALION': 8,
    'COMPANY': 7,
    'PLATOON': 6,
    'SQUAD': 4,
};

/**
 * JSON 파일을 비동기적으로 불러와 UNIT_TEMPLATES_JSON 변수에 저장합니다.
 * @returns {Promise<object>} 불러온 JSON 데이터
 */
async function loadUnitTemplates() {
    if (UNIT_TEMPLATES_JSON) {
        return UNIT_TEMPLATES_JSON;
    }
    try {
        const response = await fetch('src/unit/division_templates.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        UNIT_TEMPLATES_JSON = data.templates;
        return UNIT_TEMPLATES_JSON;
    } catch (error) {
        console.error("Could not load unit templates:", error);
        return null;
    }
}

/**
 * JSON 템플릿을 기반으로 유닛을 재귀적으로 생성하는 핵심 함수입니다.
 * @param {string} templateKey - 생성할 유닛의 템플릿 키 (e.g., "Infantry_Division")
 * @param {number} x - 생성 위치 x 좌표
 * @param {number} y - 생성 위치 y 좌표
 * @param {string} team - 유닛의 팀 ('blue' or 'red')
 * @returns {Unit|null} 생성된 최상위 유닛 객체
 */
function buildUnitFromTemplate(templateKey, x, y, team) {
    const template = UNIT_TEMPLATES_JSON[templateKey];
    if (!template) {
        console.error(`Template with key "${templateKey}" not found.`);
        return null;
    }

    const UnitClass = ECHELON_TO_CLASS[template.echelon];
    const size = ECHELON_SIZES[template.echelon] || 5;
    let unitName = template.name;

    // 사단, 여단, 연대, 대대급에는 고유 번호를 붙여줍니다.
    if (['DIVISION', 'BRIGADE', 'REGIMENT', 'BATTALION', 'COMPANY'].includes(template.echelon)) {
        const counterKey = template.echelon.charAt(0) + template.echelon.slice(1).toLowerCase();
        const unitNumber = unitCounters[counterKey]++;
        unitName = `제${unitNumber}${template.name.replace(/.* (.*)/, '$1')}`; // e.g., 제1사단, 제2대대
    }

    // 클래스에 따라 다른 생성자 인자를 사용합니다.
    const unit = (UnitClass === SymbolUnit)
        ? new UnitClass(unitName, x, y, team, size, template.echelon)
        : new UnitClass(unitName, x, y, team);

    // 분대(Squad)의 경우 병과(type)를 설정합니다.
    if (template.type) {
        unit.setType(template.type);
    }

    // 역할(role)을 설정합니다.
    if (template.role) {
        unit.role = FORMATION_ROLES[template.role];
    }

    // 본부 중대(hq_template_key)를 생성하고 할당합니다.
    if (template.hq_template_key && unit instanceof SymbolUnit) {
        const hqCompany = buildUnitFromTemplate(template.hq_template_key, x, y, team);
        if (hqCompany) {
            unit.hqCompany = hqCompany;
        }
    }

    // 하위 유닛(sub_units)을 재귀적으로 생성하고 추가합니다.
    if (template.sub_units) {
        template.sub_units.forEach(subUnitInfo => {
            for (let i = 0; i < subUnitInfo.count; i++) {
                const subUnit = buildUnitFromTemplate(subUnitInfo.template_key, x, y, team);
                if (subUnit) {
                    // 하위 유닛의 역할을 지정합니다.
                    if (subUnitInfo.role) {
                        subUnit.role = FORMATION_ROLES[subUnitInfo.role];
                    }
                    unit.addUnit(subUnit);
                }
            }
        });
    }

    // *** 중요: 모든 유닛은 하위 유닛 구성이 끝난 후 자신의 능력치를 계산합니다. ***
    // 능력치 계산에 본부 중대도 포함합니다.ㅅ
    let allSquadsForStats = unit.getAllSquads();
    if (unit.hqCompany) {
        allSquadsForStats = [...allSquadsForStats, ...unit.hqCompany.getAllSquads()];
    }
    unit.calculateStats(allSquadsForStats);
    unit.initializeOrganization();

    // 최상위 유닛만 최종 진형 설정을 수행합니다.
    if (!unit.parent) {
        // 전투 단위(combatSubUnits)를 설정합니다.
        if (unit instanceof SymbolUnit) {
            if (unit.echelon === 'BATTALION') {
                // 대대는 휘하의 모든 중대를 전투 단위로 가집니다.
                unit.combatSubUnits = unit.getAllCompanies();
            } else {
                // 사단, 여단 등은 휘하의 모든 대대를 전투 단위로 가집니다.
                unit.combatSubUnits = unit.getAllBattalions();
            }
        }

        // 초기 진형을 설정합니다.
        if (unit.updateCombatSubUnitPositions) {
            unit.updateCombatSubUnitPositions();
        }
    }

    return unit;
}

// 외부에서 사용할 수 있도록 DIVISION_TEMPLATES 객체를 정의합니다.
// 이제 build 함수는 템플릿 키를 받아 파서를 호출하는 역할만 합니다.
const DIVISION_TEMPLATES = {
    // 이 객체는 이제 UI에서 부대 목록을 가져오는 데 주로 사용됩니다.
    // build 함수는 main.js의 spawnUnit 함수와 호환성을 위해 유지됩니다.
    "Infantry_Division": {
        name: "보병 사단",
        build: (x, y, team) => buildUnitFromTemplate("Infantry_Division", x, y, team)
    },
    "Armored_Brigade": {
        name: "기갑 여단",
        build: (x, y, team) => buildUnitFromTemplate("Armored_Brigade", x, y, team)
    },
    "Infantry_Regiment": {
        name: "보병 연대",
        build: (x, y, team) => buildUnitFromTemplate("Infantry_Regiment", x, y, team)
    }
    // 필요에 따라 다른 최상위 편제들을 여기에 추가할 수 있습니다.
};