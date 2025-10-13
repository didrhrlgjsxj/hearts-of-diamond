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
    HQ: '본부',           // Headquarters: 지휘부
    VANGUARD: '선발대',     // Vanguard: 선두에서 정찰 및 초동 교전 담당 (구 정찰대)
    FIRE_SUPPORT: '지원대', // Fire Support: 주력 화력 지원 담당 (구 타격대)
    SUSTAINMENT: '유지대',  // Sustainment: 본부와 함께 중심을 잡으며 전투 지속 지원
};

// 역할별 진형 오프셋 (상대적 거리)
const FORMATION_OFFSETS = {
    [COMPANY_ROLES.VANGUARD]: { distance: 60, spread: 40 },     // 선발대는 가장 앞에
    [COMPANY_ROLES.FIRE_SUPPORT]: { distance: 30, spread: 60 }, // 지원대는 중간에
    [COMPANY_ROLES.SUSTAINMENT]: { distance: 0, spread: 80 },   // 유지대는 본부와 함께 중심에
};

// 대대 역할 정의
const BATTALION_ROLES = {
    VANGUARD: '선봉',     // Vanguard: 선두에서 주력 공격 담당
    MAIN_FORCE: '주력', // Main Force: 중앙에서 화력 지원
    RESERVE: '예비',    // Reserve: 후방에서 대기 및 지원
};

// 대대 역할별 진형 오프셋 (중대보다 훨씬 넓은 간격)
const BATTALION_FORMATION_OFFSETS = {
    [BATTALION_ROLES.VANGUARD]: { distance: 250, spread: 150 }, // 선봉대는 가장 앞에 넓게
    [BATTALION_ROLES.MAIN_FORCE]: { distance: 100, spread: 200 }, // 주력대는 중앙에 더 넓게
    [BATTALION_ROLES.RESERVE]: { distance: -50, spread: 100 },  // 예비대는 본부 약간 뒤에
};

// 유닛 간 최소 이격 거리
const MIN_UNIT_SPACING = 15;

// 부대 규모(Echelon)별 심볼 정의
const ECHELON_SYMBOLS = {
    'DIVISION': 'XX',
    'BRIGADE': 'X',
    'REGIMENT': '|||',
    'BATTALION': '||',
    // 중대 이하는 각 클래스에서 직접 그림
};