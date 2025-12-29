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
 * 국가의 경제를 관리하는 클래스입니다.
 * 산업, 생산, 경제 단위 등을 담당합니다.
 */
class Economy {
    /**
     * @param {Nation} nation 이 경제가 소속된 국가
     */
    constructor(nation) {
        this.nation = nation;

        // --- 산업 ---
        this.lightIndustry = 10; // 경공업 공장 수
        this.heavyIndustry = 5;  // 중공업 공장 수
        this.consumerGoodsIndustry = 0; // 소비재 공장 수

        // --- 자원 ---
        this.economicUnits = 5000; // 경제 단위

        // --- 생산 ---
        this.equipmentStockpile = {}; // 장비 비축량. 예: { 'Rifle': 1500, 'Tank': 50 }
        this.resourceIncome = {};     // 자원 수입량. 예: { 'IRON': 10, 'OIL': 5 }
        this.productionLines = [];    // 생산 라인 목록
    }

    /**
     * 새로운 생산 라인을 추가합니다.
     * @param {string} equipmentKey - EQUIPMENT_TYPES에 정의된 장비 키
     * @param {number} assignedLightFactories - 이 라인에 할당할 경공업 공장 수
     * @param {number} assignedHeavyFactories - 이 라인에 할당할 중공업 공장 수
     * @returns {boolean} 생산 라인 추가 성공 여부
     */
    addProductionLine(equipmentKey, assignedLightFactories, assignedHeavyFactories) {
        const equipment = EQUIPMENT_TYPES[equipmentKey];
        if (!equipment) {
            console.error(`${equipmentKey}는 유효한 장비가 아닙니다.`);
            return false;
        }

        // 1. 현재 할당된 총 공장 수를 계산합니다.
        const totalAssignedLight = this.productionLines.reduce((sum, line) => sum + line.assignedLightFactories, 0);
        const totalAssignedHeavy = this.productionLines.reduce((sum, line) => sum + line.assignedHeavyFactories, 0);

        // 2. 가용 공장 수를 계산합니다.
        const availableLight = this.lightIndustry - totalAssignedLight;
        const availableHeavy = this.heavyIndustry - totalAssignedHeavy;

        // 3. 요청된 공장 수가 가용 공장 수를 초과하는지 확인합니다.
        if (assignedLightFactories > availableLight) {
            alert(`경공업 공장을 할당할 수 없습니다.\n가용: ${availableLight} / 요청: ${assignedLightFactories}`);
            return false;
        }
        if (assignedHeavyFactories > availableHeavy) {
            alert(`중공업 공장을 할당할 수 없습니다.\n가용: ${availableHeavy} / 요청: ${assignedHeavyFactories}`);
            return false;
        }

        this.productionLines.push({
            equipmentKey: equipmentKey,
            assignedLightFactories: assignedLightFactories,
            assignedHeavyFactories: assignedHeavyFactories,
            progress: 0,       // 현재 생산 진행도
            efficiency: 0.5,   // 생산 효율 (50%에서 시작)
            productionTick: Math.floor(Math.random() * 3) // 0~2 사이의 랜덤한 생산 주기 할당
        });

        return true;
    }

    /**
     * 시간당 경제 단위 변화량을 계산합니다.
     * 소비재 공장은 생산량을 늘리고, 산업 공장들은 유지비로 생산량을 감소시킵니다.
     */
    calculateHourlyEconomicChange() {
        // 소비재: +5, 경공업: -1, 중공업: -3
        return (this.consumerGoodsIndustry * 5.0) - (this.lightIndustry * 1.0) - (this.heavyIndustry * 3.0);
    }

    /**
     * 매일 한 번씩 호출되어 경제 단위의 변화를 계산합니다.
     */
    updateDailyEconomy() {
        // 시간당 변화량을 하루(24시간) 기준으로 적용합니다.
        const hourlyChange = this.calculateHourlyEconomicChange();
        this.economicUnits += hourlyChange * 24;
        this.economicUnits = Math.max(0, this.economicUnits);

        // 자원 생산량을 계산합니다. (비축하지 않음)
        this.calculateResourceIncome();
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

            // 할당된 경공업/중공업 공장 수에 기본 생산력을 곱합니다.
            const lightPower = line.assignedLightFactories * baseProductionPerFactory;
            const heavyPower = line.assignedHeavyFactories * baseProductionPerFactory * 2; // 중공업은 기본적으로 2배 가중치

            // 장비 카테고리에 맞는 효율을 적용합니다.
            const efficiencyMultipliers = PRODUCTION_EFFICIENCY[equipment.category] || { light: 1.0, heavy: 1.0 };
            const effectivePower = (lightPower * efficiencyMultipliers.light) + (heavyPower * efficiencyMultipliers.heavy);

            // 최종 생산량은 라인의 효율과 경과 시간을 곱하여 결정됩니다.
            const appliedProduction = effectivePower * line.efficiency * hoursPassed;

            // 2. 생산 진행도를 높입니다.
            line.progress += appliedProduction;

            // 3. 생산이 완료되었는지 확인합니다.
            if (line.progress >= equipment.productionCost) {
                const completedUnits = Math.floor(line.progress / equipment.productionCost);

                // '경제 단위'는 비축량이 아닌 국가의 economicUnits에 직접 더해집니다.
                if (line.equipmentKey === 'EconomicUnit') {
                    this.economicUnits += completedUnits;
                } else {
                    if (!this.equipmentStockpile[line.equipmentKey]) {
                        this.equipmentStockpile[line.equipmentKey] = 0;
                    }
                    this.equipmentStockpile[line.equipmentKey] += completedUnits;
                }
                console.log(`[Tick ${currentTick}] ${this.nation.name}에서 ${equipment.name} ${completedUnits}개 생산 완료!`);

                line.progress %= equipment.productionCost;
                line.efficiency = Math.min(1.0, line.efficiency + 0.01 * completedUnits);
            }
        });
    }

    /**
     * 매 시간, 해당 틱에 할당된 생산 라인만 업데이트합니다.
     * @param {number} currentTick - 현재 계산해야 할 생산 주기 (0-4)
     * @param {number} hoursPassed - 경과 시간 (시간 단위)
     */
    calculateResourceIncome() {
        const income = {};

        // 국가가 소유한 모든 영토를 순회합니다.
        this.nation.territory.forEach(provinceId => {
            const province = mapGrid.provinceManager.provinces.get(provinceId);
            if (province && province.resources) {
                // 해당 프로빈스에서 생산되는 모든 자원을 수입량에 합산합니다.
                Object.keys(province.resources).forEach(resourceKey => {
                    if (!income[resourceKey]) {
                        income[resourceKey] = 0;
                    }
                    income[resourceKey] += province.resources[resourceKey];
                });
            }
        });

        this.resourceIncome = income;
    }

    /**
     * 현재 사용 가능한 공장 수를 반환합니다.
     * @returns {{light: number, heavy: number}}
     */
    getAvailableFactories() {
        const totalAssignedLight = this.productionLines.reduce((sum, line) => sum + line.assignedLightFactories, 0);
        const totalAssignedHeavy = this.productionLines.reduce((sum, line) => sum + line.assignedHeavyFactories, 0);

        return {
            light: this.lightIndustry - totalAssignedLight,
            heavy: this.heavyIndustry - totalAssignedHeavy,
        };
    }

    /**
     * 공장을 건설합니다.
     * @param {'light' | 'heavy' | 'consumer'} type 
     * @returns {boolean} 성공 여부
     */
    constructFactory(type) {
        const costs = {
            'light': 500,
            'heavy': 800,
            'consumer': 300
        };

        const cost = costs[type];
        if (!cost) return false;

        if (this.economicUnits >= cost) {
            this.economicUnits -= cost;
            if (type === 'light') this.lightIndustry++;
            else if (type === 'heavy') this.heavyIndustry++;
            else if (type === 'consumer') this.consumerGoodsIndustry++;
            return true;
        }
        return false;
    }
}