/**
 * 여러 프로빈스를 묶는 지역(Region)을 나타내는 클래스입니다.
 */
class Region {
    /**
     * @param {number} id 지역의 고유 ID
     */
    constructor(id) {
        this.id = id;
        this.provinces = new Set(); // 이 지역에 속한 Province ID의 Set
        this.mainResource = null; // { key: string, amount: number }
        this.secondaryResources = []; // [{ key: string, amount: number }]
    }

    /**
     * 지역에 프로빈스를 추가합니다.
     * @param {number} provinceId 
     */
    addProvince(provinceId) {
        this.provinces.add(provinceId);
    }
}

/**
 * 맵 전체의 지역을 생성하고 관리하는 클래스입니다.
 */
class RegionManager {
    /**
     * @param {ProvinceManager} provinceManager 
     */
    constructor(provinceManager) {
        this.provinceManager = provinceManager;
        this.regions = new Map(); // id를 키로 사용하여 Region 객체를 저장
        this.nextRegionId = 1;

        this.generateRegionsAndResources();
    }

    /**
     * 프로빈스를 지역으로 그룹화하고 각 지역에 자원을 할당합니다.
     */
    generateRegionsAndResources() {
        const unassignedProvinces = new Set(this.provinceManager.provinces.keys());

        while (unassignedProvinces.size > 0) {
            // 1. 새 지역 생성 및 시작 프로빈스 할당
            const startProvinceId = unassignedProvinces.values().next().value;
            const region = new Region(this.nextRegionId++);
            this.regions.set(region.id, region);

            region.addProvince(startProvinceId);
            unassignedProvinces.delete(startProvinceId);

            // 2. 2~4개의 프로빈스로 지역을 구성 (BFS)
            const queue = [startProvinceId];
            const visited = new Set([startProvinceId]);

            while (queue.length > 0 && region.provinces.size < 4) {
                const currentId = queue.shift();
                const neighbors = this.provinceManager.provinceAdjacency.get(currentId) || [];

                for (const neighborId of neighbors) {
                    if (unassignedProvinces.has(neighborId) && region.provinces.size < 4) {
                        region.addProvince(neighborId);
                        unassignedProvinces.delete(neighborId);
                        visited.add(neighborId);
                        queue.push(neighborId);
                    }
                }
            }

            // 3. 생성된 지역에 자원 할당
            this.assignResourcesToRegion(region);
        }
    }

    /**
     * 특정 지역에 주 자원과 보조 자원을 할당하고, 이를 해당 지역의 프로빈스에 분배합니다.
     * 이제 각 프로빈스는 크기와 확률에 따라 독립적으로 자원량을 결정합니다.
     * @param {Region} region 
     */
    assignResourcesToRegion(region) {
        const DENSE_RESOURCE_CHANCE = 0.05; // 자원 밀집 구역이 될 확률 (5%)

        // 1. 지역의 주 자원과 보조 자원 '종류'를 결정합니다.
        // 주 자원은 마정석을 제외하고 가중치에 따라 선택됩니다.
        const mainResourceKey = getWeightedRandomResource({ excludeMagicStones: true });
        region.mainResource = { key: mainResourceKey }; // 양은 프로빈스별로 결정되므로 여기서는 키만 저장

        const secondaryResourceKeys = [];
        const numSecondaryResources = Math.floor(Math.random() * 2) + 1;
        for (let i = 0; i < numSecondaryResources; i++) {
            let secondaryResourceKey;
            // 중복되지 않는 보조 자원을 선택합니다.
            do {
                secondaryResourceKey = getWeightedRandomResource();
            } while (secondaryResourceKey === mainResourceKey || secondaryResourceKeys.includes(secondaryResourceKey));

            // 주 자원과 중복되지 않도록 합니다.
            if (secondaryResourceKey !== mainResourceKey && !secondaryResourceKeys.includes(secondaryResourceKey)) {
                secondaryResourceKeys.push(secondaryResourceKey);
            }
        }
        region.secondaryResources = secondaryResourceKeys.map(key => ({ key }));

        // 2. 지역 내 각 프로빈스를 순회하며 자원을 할당합니다.
        region.provinces.forEach(provinceId => {
            const province = this.provinceManager.provinces.get(provinceId);
            if (!province) return;

            // 2-1. 프로빈스의 총 자원량 결정 (기본량 + 밀집 구역 확률 + 크기 가중치)
            const isDense = Math.random() < DENSE_RESOURCE_CHANCE;
            let totalAmount = isDense 
                ? (Math.floor(Math.random() * 16) + 15) // 15 ~ 30
                : (Math.floor(Math.random() * 7) + 3);   // 3 ~ 9

            // 프로빈스 크기에 따른 가중치 적용 (평균 크기 7 초과 시)
            if (province.tiles.length > AVG_PROVINCE_SIZE) {
                const sizeMultiplier = 1 + (province.tiles.length - AVG_PROVINCE_SIZE) * 0.05;
                totalAmount = Math.floor(totalAmount * sizeMultiplier);
            }

            // 2-2. 자원 분배
            // 주 자원은 최소 1개 보장
            province.resources[mainResourceKey] = (province.resources[mainResourceKey] || 0) + 1;
            totalAmount--;

            // 나머지 양을 주 자원과 보조 자원에 무작위로 할당
            const availableResourcePool = [mainResourceKey, ...secondaryResourceKeys];
            for (let i = 0; i < totalAmount; i++) {
                // 여기서는 지역에 할당된 자원 풀 내에서만 무작위로 선택하므로 가중치를 다시 적용할 필요는 없습니다.
                const randomResourceKey = availableResourcePool[Math.floor(Math.random() * availableResourcePool.length)]; 
                province.resources[randomResourceKey] = (province.resources[randomResourceKey] || 0) + 1;
            }
        });
    }
}

/**
 * 설정된 가중치에 따라 자원을 무작위로 선택하는 헬퍼 함수입니다.
 * @param {object} [options]
 * @param {boolean} [options.excludeMagicStones=false] - 마정석을 선택에서 제외할지 여부
 * @returns {string} 선택된 자원의 키
 */
function getWeightedRandomResource(options = {}) {
    const weights = {
        'IRON': 10,
        'GOLD': 2,
        'OIL': 3,
        'TITANIUM': 4,
        'TUNGSTEN': 6,
        'ALUMINUM': 4,
        'MAGIC_STONE_ALPHA': 3,
        'MAGIC_STONE_BETA': 1
    };

    let availableResources = Object.keys(weights);

    if (options.excludeMagicStones) {
        availableResources = availableResources.filter(key => !key.includes('MAGIC_STONE'));
    }

    const totalWeight = availableResources.reduce((sum, key) => sum + weights[key], 0);
    let random = Math.random() * totalWeight;

    for (const key of availableResources) {
        random -= weights[key];
        if (random <= 0) {
            return key;
        }
    }

    // 만약의 경우 마지막 자원을 반환
    return availableResources[availableResources.length - 1];
}