const UNIT_STRENGTHS = {
    SQUAD: 12,
    PLATOON: 12 * 3,       // 36
    COMPANY: 12 * 3 * 3,     // 108
    BATTALION: 12 * 3 * 3 * 3, // 324
    BRIGADE: 12 * 3 * 3 * 3 * 3, // 972
};

const UNIT_TYPES = {
    INFANTRY: '보병',
    RECON: '정찰',
    ARMOR: '기갑',
    ARTILLERY: '포병',
    ENGINEER: '공병',
};

// NATO APP-6A 표준을 단순화한 유닛 타입 아이콘
const UNIT_TYPE_ICONS = {
    [UNIT_TYPES.INFANTRY]: '✕', // 보병 (교차 소총)
    [UNIT_TYPES.RECON]: '◇',   // 정찰 (기병)
    [UNIT_TYPES.ARMOR]: '⬬',   // 기갑 (궤도)
    [UNIT_TYPES.ARTILLERY]: '●', // 포병 (포탄)
    [UNIT_TYPES.ENGINEER]: 'E',   // 공병
};

// 유닛 타입별 색상
const UNIT_TYPE_COLORS = {
    [UNIT_TYPES.INFANTRY]: 'rgba(100, 149, 237, 0.9)', // CornflowerBlue
    [UNIT_TYPES.RECON]: 'rgba(255, 255, 0, 0.9)',      // Yellow
    [UNIT_TYPES.ARMOR]: 'rgba(47, 79, 79, 0.9)',       // DarkSlateGray
    [UNIT_TYPES.ARTILLERY]: 'rgba(255, 69, 0, 0.9)',   // OrangeRed
    [UNIT_TYPES.ENGINEER]: 'rgba(139, 69, 19, 0.9)',   // SaddleBrown
};

// 유닛 타입별 기본 능력치 (분대 기준)
const UNIT_TYPE_STATS = {
    [UNIT_TYPES.INFANTRY]: { firepower: 1, softAttack: 2, hardAttack: 0.5, reconnaissance: 1, armor: 0, organizationBonus: 10 },
    [UNIT_TYPES.RECON]:    { firepower: 0.5, softAttack: 1, hardAttack: 0.5, reconnaissance: 15, armor: 0, organizationBonus: 2 },
    [UNIT_TYPES.ARMOR]:    { firepower: 4, softAttack: 5, hardAttack: 3, reconnaissance: 2, armor: 8, organizationBonus: 5 },
    [UNIT_TYPES.ARTILLERY]:{ firepower: 8, softAttack: 3, hardAttack: 4, reconnaissance: 1, armor: 1, organizationBonus: 1 },
    [UNIT_TYPES.ENGINEER]: { firepower: 1, softAttack: 1, hardAttack: 6, reconnaissance: 1, armor: 2, organizationBonus: 3 },
};

// 중대 역할 정의
const COMPANY_ROLES = {
    HQ: '본부',
    RECON: '정찰대',
    STRIKE: '타격대',
    SUPPORT: '유지대',
    SUPPLY: '보급대', // 현재 미사용, 향후 확장용
};

// 역할별 진형 오프셋 (상대적 거리)
const FORMATION_OFFSETS = {
    [COMPANY_ROLES.RECON]: { distance: 60, spread: 40 },
    [COMPANY_ROLES.STRIKE]: { distance: 30, spread: 60 },
    [COMPANY_ROLES.SUPPORT]: { distance: 0, spread: 80 },
};