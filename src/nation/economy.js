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
        this.consumerGoodsIndustry = 10; // 소비재 공장 수

        // --- 자원 ---
        this.economicUnits = 5000; // 경제 단위

        // --- 생산 ---
        this.equipmentStockpile = {}; // 장비 비축량. 예: { 'Rifle': 1500, 'Tank': 50 }
        this.resourceIncome = {};     // 자원 수입량. 예: { 'IRON': 10, 'OIL': 5 }
        this.productionLines = [];    // 생산 라인 목록

        // --- 건설 ---
        this.defaultFactoryCosts = {
            'light': 5000,
            'heavy': 8000,
            'consumer': 6000
        };
        this.factoryCosts = {
            'light': this.defaultFactoryCosts.light, // 건설 레벨 1 기준 비용 (경제 단위)
            'heavy': this.defaultFactoryCosts.heavy,
            'consumer': this.defaultFactoryCosts.consumer,
        };
        this.construction = {
            level: 5, // 건설 산업 활성화 정도 (0 ~ 10 블록)
            allocation: { light: 5, heavy: 5, consumer: 5 }, // 투자 비중 (총 15블록)
            progress: { light: 0, heavy: 0, consumer: 0 } // 현재 진행도
        };
        this.warFocusRatio = 0.5; // 초기 경제/전쟁 집중 비율 (5:5)
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
        if (this.nation.type === 'PLAYER') {
            // 시간당 변화량을 하루(24시간) 기준으로 적용합니다.
            const hourlyChange = this.calculateHourlyEconomicChange();
            this.economicUnits += hourlyChange * 24;
            this.economicUnits = Math.max(0, this.economicUnits);

            // 자원 생산량을 계산합니다. (비축하지 않음)
            this.calculateResourceIncome();
        } else if (this.nation.type === 'AI') {
            // AI 국가: 국가 체급에 기반한 간소화된 경제 시뮬레이션
            const weight = this.nation.calculateNationalWeight();

            // 1. 경제 단위 획득 (체급 * 20)
            this.economicUnits += weight * 20;

            // 2. 장비 자동 획득 (생산 라인 없이 자동 수급) (AI 국가용)
            this.equipmentStockpile['Rifle'] = (this.equipmentStockpile['Rifle'] || 0) + Math.floor(weight * 0.5);
            this.equipmentStockpile['Artillery'] = (this.equipmentStockpile['Artillery'] || 0) + Math.floor(weight * 0.1);
            this.equipmentStockpile['Tank'] = (this.equipmentStockpile['Tank'] || 0) + Math.floor(weight * 0.05);

            // 3. 자원 수입 계산 (정보 표시용)
            this.calculateResourceIncome();

            // 4. AI 공장 건설
            this.updateAIConstruction(weight);
        }
    }

    /**
     * 매 시간, 해당 틱에 할당된 생산 라인만 업데이트합니다.
     * @param {number} currentTick - 현재 계산해야 할 생산 주기 (0-4)
     * @param {number} hoursPassed - 경과 시간 (시간 단위)
     */
    updateHourlyProduction(currentTick, hoursPassed) {
        // 플레이어 국가만 상세 생산/건설 시뮬레이션을 수행합니다.
        if (this.nation.type !== 'PLAYER') {
            return;
        }

        // 건설 프로세스 업데이트 (매 시간 진행)
        this.updateConstruction(hoursPassed);

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
     * 현재 설정된 건설 활성화 레벨에 따른 시간당 건설 비용과 진행량을 계산합니다.
     * 레벨이 높을수록 비효율적(비용 증가)이 됩니다.
     * @returns {{cost: number, progress: number}}
     */
    getHourlyConstructionStats() {
        // 건설력 계산: 경공업 제외, 중공업 1.5배, 소비재 1배 가중치 적용
        const weightedCapacity = (this.heavyIndustry * 1.5) + this.consumerGoodsIndustry;
        const baseCapacity = weightedCapacity * 5; // 가중치가 적용된 공장당 시간당 5의 기본 건설력
        const level = this.construction.level;

        // 요청사항 반영: 건설 활성화 레벨(1~10)에 따라 가중치를 적용하여 진행량(progress)을 계산합니다.
        // 레벨 1일 때 가중치 5, 레벨 10일 때 가중치 20으로, 낮은 레벨에서 효율이 더 높도록 조정됩니다.
        let progressMultiplier = 0;
        if (level > 0) {
            // W(L) = (5L + 10) / 3. W(1)=5, W(10)=20.
            const weight = (5 * level + 10) / 3;
            // 최대 가중치(20)로 정규화하여 0~1 사이의 값으로 만듭니다.
            progressMultiplier = weight / 20;
        }
        
        const progress = baseCapacity * progressMultiplier;

        // 비용은 활성화 레벨이 높을수록 할증 (과부하 비용)
        // 건설 활성화 레벨 1을 기준으로 가격(비용)을 정규화합니다.
        // 레벨 1일 때 Cost == Progress (1:1 비율)가 되도록 설정합니다.
        const utilization = level / 10; // 0.1 ~ 1.0
        const costMultiplier = 0.9 + utilization; // Level 1: 1.0, Level 10: 1.9
        const cost = progress * costMultiplier;

        return { cost, progress };
    }

    /**
     * 건설 진행 상황을 업데이트합니다.
     * 경제 단위를 소모하여 공장 건설 진행도를 높입니다.
     * @param {number} hoursPassed 
     */
    updateConstruction(hoursPassed) {
        const stats = this.getHourlyConstructionStats();
        const targetSpend = stats.cost * hoursPassed;
        const targetProgress = stats.progress * hoursPassed;

        // 2. 실제 소모 가능한 경제 단위 확인
        const actualSpend = Math.min(targetSpend, this.economicUnits);

        if (actualSpend <= 0) return;

        // 실제 비용 대비 진행 효율 계산 (자원이 부족할 경우 진행도도 비례해서 줄어듦)
        const efficiencyRatio = actualSpend / targetSpend;
        const actualProgress = targetProgress * efficiencyRatio;

        // 3. 경제 단위 소모
        this.economicUnits -= actualSpend;

        // 4. 비중(Allocation)에 따라 진행도 분배
        const totalBlocks = 15; // 전체 블록 수 고정

        ['light', 'heavy', 'consumer'].forEach(type => {
            const blocks = this.construction.allocation[type];
            if (blocks <= 0) return;
            
            // 진행도는 비용이 아니라 계산된 progress를 기준으로 분배
            const progressToAdd = actualProgress * (blocks / totalBlocks);
            
            this.construction.progress[type] += progressToAdd;

            // 5. 건설 완료 확인
            if (this.construction.progress[type] >= this.factoryCosts[type]) {
                this.construction.progress[type] -= this.factoryCosts[type];
                if (type === 'light') this.lightIndustry++;
                else if (type === 'heavy') this.heavyIndustry++;
                else if (type === 'consumer') this.consumerGoodsIndustry++;
                console.log(`${this.nation.name}: ${type} 공장 건설 완료!`);
            }
        });
    }

    /**
     * AI 국가의 공장 건설 로직을 처리합니다.
     * @param {number} weight 국가 체급
     */
    updateAIConstruction(weight) {
        // 1. 전쟁 상태 확인
        let isAtWar = false;
        for (const relation of this.nation.diplomacy.values()) {
            if (relation === 'WAR') {
                isAtWar = true;
                break;
            }
        }

        // 2. 경제 집중 vs 전쟁 집중 비율 설정
        // 전쟁 중이면 전쟁 집중 비중을 높임 (예: 9:1), 평시에는 경제 집중 (예: 4:6)
        const warFocusRatio = isAtWar ? 0.9 : 0.4;
        const economyFocusRatio = 1.0 - warFocusRatio;

        // 3. 건설 임계값 설정 (체급 * 200 정도의 비축량 유지)
        const threshold = weight * 200;

        // 4. 경제 단위가 임계값을 초과하는지 확인
        if (this.economicUnits > threshold) {
            // 5. 건설할 공장 타입 결정
            const rand = Math.random();
            let typeToBuild = 'consumer';

            if (rand < economyFocusRatio) {
                typeToBuild = 'consumer';
            } else {
                // 전쟁 집중 시 경공업/중공업 건설 (50:50)
                typeToBuild = Math.random() < 0.5 ? 'light' : 'heavy';
            }

            // 6. 건설 비용 계산 (기본 가격의 5배)
            const baseCost = this.factoryCosts[typeToBuild];
            const aiCheckCost = baseCost * 5; // 건설 조건은 5배 필요

            // 7. 비용 지불 및 즉시 건설 (임계값 이상의 여유분으로 건설 가능한지 확인)
            if (this.economicUnits >= threshold + aiCheckCost) {
                this.economicUnits -= baseCost; // 실제 소모는 1배만
                if (typeToBuild === 'light') this.lightIndustry++;
                else if (typeToBuild === 'heavy') this.heavyIndustry++;
                else if (typeToBuild === 'consumer') this.consumerGoodsIndustry++;
            }
        }
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
}