/**
 * 이 파일은 게임에서 생산 가능한 모든 장비의 종류와 속성을 정의합니다.
 */

const EQUIPMENT_TYPES = {
    'Rifle': {
        name: '소총',
        category: 'light', // 경공업 장비
        productionCost: 50, // 개당 생산 비용
    },
    'Artillery': {
        name: '야포',
        category: 'light', // 경공업 장비
        productionCost: 150,
    },
    'Tank': {
        name: '전차',
        category: 'heavy', // 중공업 장비
        productionCost: 800,
    },
    // 향후 기계화 장비, 항공기 등 추가 가능
};