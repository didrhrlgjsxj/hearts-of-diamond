const UNIT_STRENGTHS = {
    SQUAD: 12,
    PLATOON: 12 * 3,       // 36
    COMPANY: 12 * 3 * 3,     // 108 //이거는 그냥 예시 최초값
    BATTALION: 12 * 3 * 3 * 3, // 324
    BRIGADE: 12 * 3 * 3 * 3 * 3, // 972
};

const UNIT_TYPES = {
    INFANTRY: 'INFANTRY',
    RECON: 'RECON',
    ARMOR: 'ARMOR',
    ARTILLERY: 'ARTILLERY',
    ENGINEER: 'ENGINEER',
};

// NATO APP-6A 표준을 단순화한 유닛 타입 아이콘
const UNIT_TYPE_ICONS = {
    'INFANTRY': '✕', // 보병 (교차 소총)
    'RECON': '◇',   // 정찰 (기병)
    'ARMOR': '⬬',   // 기갑 (궤도)
    'ARTILLERY': '●', // 포병 (포탄)
    'ENGINEER': 'E'   // 공병
};

// 유닛 타입별 색상
const UNIT_TYPE_COLORS = {
    'INFANTRY': 'rgba(100, 149, 237, 0.9)', // CornflowerBlue
    'RECON': 'rgba(255, 255, 0, 0.9)',      // Yellow
    'ARMOR': 'rgba(47, 79, 79, 0.9)',       // DarkSlateGray
    'ARTILLERY': 'rgba(255, 69, 0, 0.9)',   // OrangeRed
    'ENGINEER': 'rgba(139, 69, 19, 0.9)',   // SaddleBrown
};

// 유닛 타입별 기본 능력치 (분대 기준)
const UNIT_TYPE_STATS = {
    'INFANTRY': { directFirepower: 1, indirectFirepower: 1, softAttack: 0.4, hardAttack: 0.3, reconnaissance: 2, armor: 0, organizationBonus: 8, mobility: 10, tags: ['INFANTRY'] },
    'RECON':    { directFirepower: 1.5, indirectFirepower: 1, softAttack: 0.55, hardAttack: 0.25, reconnaissance: 20, armor: 0, organizationBonus: 4, mobility: 15, tags: ['INFANTRY', 'SUPPORT'] },
    'ARMOR':    { directFirepower: 1.7, indirectFirepower: 1.5, softAttack: 0.65, hardAttack: 0.7, reconnaissance: 3, armor: 6, organizationBonus: 3, mobility: 25, tags: ['ARMOR'] },
    'ARTILLERY':{ directFirepower: 0.7, indirectFirepower: 2, softAttack: 1.1, hardAttack: 0.6, reconnaissance: 2, armor: 0, organizationBonus: 2, mobility: 8, tags: ['SUPPORT'] },
    'ENGINEER': { directFirepower: 2, indirectFirepower: 1, softAttack: 0.35, hardAttack: 0.6, reconnaissance: 2, armor: 3, organizationBonus: 4, mobility: 10, tags: ['INFANTRY', 'SUPPORT'] },
};

// 병과별 최적 교전 거리 및 최대 교전 거리 정의
const UNIT_TYPE_EFFECTIVENESS_RANGE = {
    'INFANTRY': { optimal: 100 }, // 보병: 100 거리에서 효율 100%
    'RECON':    { optimal: 150 }, // 정찰: 150 거리에서 효율 100%
    'ARMOR':    { optimal: 120 }, // 기갑: 120 거리에서 효율 100%
    'ARTILLERY':{ optimal: 250 }, // 포병: 250 거리에서 효율 100%
    'ENGINEER': { optimal: 80  }, // 공병: 80 거리에서 효율 100%
};

// 진형 역할 통일 (대대, 중대 공통 사용)
const FORMATION_ROLES = {
    FRONTLINE: 'FRONTLINE',  // Frontline: 주력 전투 담당
    MIDGUARD: 'MIDGUARD',   // Midguard: 전위와 후위 사이에서 지원
    REARGUARD: 'REARGUARD',  // Rearguard: 후방 지원 및 예비대 역할 (본부 위치)
};

// 역할별 진형 오프셋 (상대적 거리)
const FORMATION_OFFSETS = {
    [FORMATION_ROLES.FRONTLINE]: { distance: 100, spread: 80 },  // 전위: 주력 전투선
    [FORMATION_ROLES.MIDGUARD]: { distance: 40, spread: 100 }, // 중위: 중간 뒤, 넓게
    [FORMATION_ROLES.REARGUARD]: { distance: 0, spread: 70 },   // 후위: 본부와 같은 라인
};

// 유닛 간 최소 이격 거리
const MIN_UNIT_SPACING = 30;

// 전투 중 중대가 기본 진형 위치에서 벗어날 수 있는 최대 거리
const MAX_FORMATION_DEVIATION = 50;

// 유닛 이동 목표 우선순위 (낮을수록 높음)
const MOVEMENT_PRIORITIES = {
    RETREAT: 0,               // 후퇴 (최우선)
    REFIT: 0.5,               // 재정비 (대대 따라다니기)
    PLAYER_COMMAND: 1,        // 플레이어의 직접 이동 명령
    FORMATION_COHESION: 4,    // 진형 이탈 시 복귀
    COMBAT_EFFECTIVENESS: 7,  // 전투 효율성 극대화 위치로 이동
    DEFAULT_FORMATION: 10,    // 기본 진형 위치로 이동
};

// 부대 규모(Echelon)별 심볼 정의
const ECHELON_SYMBOLS = {
    'DIVISION': 'XX',
    'BRIGADE': 'X',
    'REGIMENT': '|||',
    'BATTALION': '||',
    // 중대 이하는 각 클래스에서 직접 그림
};

/**
 * 전투 시 대대가 사용할 수 있는 전술을 정의합니다.
 */
const TACTICS = {
    ASSAULT: {
        name: '돌격',
        attackModifier: 1.10, // 공격력 10% 증가
        orgDamageModifier: 1.20, // 받는 조직력 피해 20% 증가
    },
    STANDOFF: {
        name: '대치',
        attackModifier: 0.95, // 공격력 5% 감소
        orgDamageModifier: 0.90, // 받는 조직력 피해 10% 감소
    },
};

/**
 * 부대의 능력치를 하위 부대로부터 어떻게 합산할지 정의하는 함수 모음입니다.
 * 이를 통해 능력치 계산 방식을 중앙에서 관리하고 쉽게 수정할 수 있습니다.
 */
const UNIT_STAT_AGGREGATORS = {
    // 화력, 공격력은 단순 합산합니다.
    directFirepower: (units) => units.reduce((total, unit) => total + unit.directFirepower, 0),
    indirectFirepower: (units) => units.reduce((total, unit) => total + unit.indirectFirepower, 0),
    softAttack: (units) => units.reduce((total, unit) => total + unit.softAttack, 0),
    hardAttack: (units) => units.reduce((total, unit) => total + unit.hardAttack, 0),

    // 정찰(Reconnaissance)은 모든 분대의 평균값으로 계산합니다.
    reconnaissance: (units) => {
        if (units.length === 0) return 0;
        return units.reduce((total, unit) => total + unit.reconnaissance, 0) / units.length;
    },
    // 장갑(Armor)은 모든 분대의 평균값으로 계산합니다.
    armor: (units) => {
        if (units.length === 0) return 0;
        return units.reduce((total, unit) => total + unit.armor, 0) / units.length;
    },

    // 최대 조직력(maxOrganization)은 기본 100에 각 분대의 보너스 값을 더합니다.
    maxOrganization: (units) => {
        const bonus = units.reduce((total, unit) => total + unit.organizationBonus, 0);
        return 100 + bonus;
    },

    // 기본 내구력(baseStrength)은 모든 분대의 내구력을 합산합니다.
    baseStrength: (units) => units.reduce((total, unit) => total + unit._baseStrength, 0),

    // 기갑화율(hardness)은 기갑화된 분대의 비율로 계산합니다.
    hardness: (units) => {
        if (units.length === 0) return 0;
        // 장갑이 1 이상인 분대를 기갑화된 것으로 간주합니다.
        const armoredCount = units.filter(unit => unit.armor > 0).length;
        return armoredCount / units.length;
    },
        // 조직 방어력: 기동력, 정찰력, 본래 부대에 추가된 조직력에 기반하여 계산됩니다.
    organizationDefense: (units) => {
        if (units.length === 0) return 0;
        // 1. 편제에 의해 추가된 조직력(organizationBonus) 총합을 기본 방어력으로 설정합니다.
        const baseOrgDefense = units.reduce((total, unit) => total + unit.organizationBonus * 0.35, 0);

        // 2. 평균 기동력과 정찰력을 기반으로 배율을 계산합니다.
        const avgMobility = units.reduce((total, unit) => total + unit.mobility, 0) / units.length;
        const avgRecon = units.reduce((total, unit) => total + unit.reconnaissance, 0) / units.length;
        const multiplier = 1 + (avgMobility * 0.02) + (avgRecon * 0.03);

        // 3. 기본 방어력에 배율을 적용하여 최종 조직 방어력을 계산합니다.
        return baseOrgDefense * multiplier;
    },

    // 단위 방어력: 평균 장갑과 기갑화율에 비례하여 계산됩니다. 대물 공격력을 막는 역할을 합니다.
    unitDefense: (units) => {
        if (units.length === 0) return 0;

        // 1. 기본 생존성: 모든 분대의 훈련 수준(organizationBonus)을 기반으로 한 기본 방어력입니다.
        // 보병도 엄폐, 산개 등을 통해 생존하므로, 이를 반영합니다.
        const baseSurvivalDefense = units.reduce((total, unit) => total + unit.organizationBonus, 0) * 0.05;

        // 2. 추가 방호력: 장갑과 기갑화율에 기반한 물리적 방호력입니다.
        const avgArmor = units.reduce((total, unit) => total + unit.armor, 0) / units.length;
        const hardness = units.filter(unit => unit.armor > 0).length / units.length;
        const armorBasedDefense = avgArmor * 20 * (1 + hardness);

        // 3. 기동력에 따른 회피 보너스 (곱연산)
        const avgMobility = units.reduce((total, unit) => total + unit.mobility, 0) / units.length;
        const mobilityMultiplier = 1 + (avgMobility * 0.01); // 기동력 1당 1%의 추가 방어력 보너스

        // 4. 최종 단위 방어력은 기본 생존성과 추가 방호력의 합에 기동력 보너스를 곱합니다.
        return (baseSurvivalDefense + armorBasedDefense) * mobilityMultiplier;
    },
};