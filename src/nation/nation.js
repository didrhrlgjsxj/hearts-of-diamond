/**
 * 카테고리별 생산 효율 정의
 * light: 경공업 특화, heavy: 중공업 특화
 */
const PRODUCTION_EFFICIENCY = {
    'light':        { light: 2.0, heavy: 0.2 },
    'medium-light': { light: 1.5, heavy: 0.5 },
    'medium':       { light: 1.0, heavy: 1.0 },
    'medium-heavy': { light: 0.5, heavy: 1.5 },
    'heavy':        { light: 0.2, heavy: 2.0 },
};

/**
 * 게임 내 국가의 정보를 관리하는 클래스입니다.
 * 영토, 수도, 색상, 경제(산업, 생산) 등의 정보를 가집니다.
 */
class Nation {
    /**
     * @param {number} id 국가의 고유 ID
     * @param {string} name 국가의 이름
     * @param {string} color 국가를 나타내는 색상 (e.g., 'rgba(255, 0, 0, 0.2)')
     * @param {{x: number, y: number}} capital 수도의 그리드 좌표
     */
    constructor(id, name, color, capital) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.capital = capital; // {x, y} 그리드 좌표
        // 영토는 Set으로 관리하여 중복을 방지하고 빠른 조회를 지원합니다.
        // 좌표는 "x,y" 형태의 문자열로 저장됩니다.
        this.territory = new Set();

        // --- 경제 시스템 속성 ---
        this.lightIndustry = 10; // 경공업 공장 수
        this.heavyIndustry = 5;  // 중공업 공장 수

        this.equipmentStockpile = {}; // 장비 비축량. 예: { 'Rifle': 1500, 'Tank': 50 }
        this.productionLines = [];    // 생산 라인 목록
    }

    /**
     * 경공업의 총 생산력을 반환합니다.
     * 공장 하나당 기본 생산력은 1.5로 설정합니다.
     */
    get lightProduction() {
        return this.lightIndustry * 1.5;
    }

    /**
     * 중공업의 총 생산력을 반환합니다.
     * 공장 하나당 기본 생산력은 1.5로 설정합니다.
     */
    get heavyProduction() {
        return this.heavyIndustry * 1.5;
    }

    /**
     * 새로운 생산 라인을 추가합니다.
     * @param {string} equipmentKey - EQUIPMENT_TYPES에 정의된 장비 키
     * @param {number} assignedFactories - 이 라인에 할당할 공장 수
     */
    addProductionLine(equipmentKey, assignedFactories) {
        const equipment = EQUIPMENT_TYPES[equipmentKey];
        if (!equipment) {
            console.error(`${equipmentKey}는 유효한 장비가 아닙니다.`);
            return;
        }

        this.productionLines.push({
            equipmentKey: equipmentKey,
            assignedFactories: assignedFactories,
            progress: 0,       // 현재 생산 진행도
            efficiency: 0.5,   // 생산 효율 (50%에서 시작)
            productionTick: Math.floor(Math.random() * 5) // 0~4 사이의 랜덤한 생산 주기 할당
        });
    }

    /**
     * 국가의 영토에 그리드 셀을 추가합니다.
     * @param {number} x 
     * @param {number} y 
     */
    addTerritory(x, y) {
        this.territory.add(`${x},${y}`);
    }

    /**
     * 국가의 영토에서 그리드 셀을 제거합니다.
     * @param {number} x 
     * @param {number} y 
     */
    removeTerritory(x, y) {
        this.territory.delete(`${x},${y}`);
    }

    /**
     * 매 시간, 해당 틱에 할당된 생산 라인만 업데이트합니다.
     * @param {number} currentTick - 현재 계산해야 할 생산 주기 (0-4)
     * @param {number} hoursPassed - 경과 시간 (시간 단위)
     */
    updateHourlyProduction(currentTick, hoursPassed) {
        if (this.productionLines.length === 0) {
            return;
        }

        // TODO: 총 할당된 공장 수가 보유 공장 수를 넘지 않도록 제한하는 로직 필요

        this.productionLines.filter(line => line.productionTick === currentTick).forEach(line => {
            const equipment = EQUIPMENT_TYPES[line.equipmentKey];
            if (!equipment) return;

            // 1. 이 라인에 적용될 총 생산력을 계산합니다.
            const baseProductionPerFactory = 1.5; // 공장당 기본 생산력

            // 5단계 카테고리에 따른 생산 효율을 가져옵니다.
            const efficiencyMultipliers = PRODUCTION_EFFICIENCY[equipment.category] || { light: 1.0, heavy: 1.0 };

            const totalProductionPower = (this.lightIndustry * efficiencyMultipliers.light) + (this.heavyIndustry * efficiencyMultipliers.heavy);
            
            // 할당된 공장 수, 기본 생산력, 생산 효율, 경과 시간을 모두 곱합니다.
            const appliedProduction = line.assignedFactories * baseProductionPerFactory * totalProductionPower * line.efficiency * hoursPassed;

            // 2. 생산 진행도를 높입니다.
            line.progress += appliedProduction;

            // 3. 생산이 완료되었는지 확인합니다.
            if (line.progress >= equipment.productionCost) {
                const completedUnits = Math.floor(line.progress / equipment.productionCost); // 시간당 생산량
                
                // 비축량에 추가
                if (!this.equipmentStockpile[line.equipmentKey]) {
                    this.equipmentStockpile[line.equipmentKey] = 0;
                }
                this.equipmentStockpile[line.equipmentKey] += completedUnits;
                console.log(`[Tick ${currentTick}] ${this.name}에서 ${equipment.name} ${completedUnits}개 생산 완료! (총: ${this.equipmentStockpile[line.equipmentKey]})`);

                // 진행도 리셋
                line.progress %= equipment.productionCost;

                // 생산 효율을 점진적으로 증가시킵니다 (최대 100%).
                line.efficiency = Math.min(1.0, line.efficiency + 0.01 * completedUnits);
            }
        });
    }
}