// 필요한 클래스와 상수를 워커 스코프로 가져옵니다.
// importScripts는 워커 내부에서 다른 스크립트를 동기적으로 로드하는 함수입니다.
importScripts(
    'unit/unitConstants.js',
    'unit/unitBase.js',
    'unit/unitEchelons.js',
    'unit/division_templates.js',
    'nation/equipment_types.js',
    'nation/economy.js',
    'nation/nation.js',
    'unit/unitLogic.js'
);

// 워커 스코프 내에서 게임 상태를 관리할 변수들
let topLevelUnits = [];
let nations = new Map();
let gameTime = { totalHours: 0 };
let lastHour = -1;
const PRODUCTION_TICKS = 3;

// 메인 스레드로부터 메시지를 받습니다.
self.onmessage = function(e) {
    const { type, data } = e.data;

    if (type === 'init') {
        // 초기 데이터 설정
        topLevelUnits = data.topLevelUnits.map(plainObj => hydrateUnit(plainObj));
        data.nations.forEach(plainNation => {
            const nation = hydrateNation(plainNation);
            nations.set(nation.id, nation);
        });

    } else if (type === 'update') {
        // --- 게임 시간 및 경제 업데이트 ---
        gameTime.totalHours = data.gameTime.totalHours;
        if (gameTime.totalHours > lastHour) {
            if (Math.floor(lastHour / 24) < Math.floor(gameTime.totalHours / 24)) {
                nations.forEach(nation => nation.economy.updateDailyEconomy());
            }
            nations.forEach(nation => {
                const currentTick = gameTime.totalHours % PRODUCTION_TICKS;
                nation.economy.updateHourlyProduction(currentTick, gameTime.totalHours - lastHour);
            });
            lastHour = gameTime.totalHours;
        }

        // --- 유닛 로직 업데이트 ---
        updateUnits(topLevelUnits, data.scaledDeltaTime);
        const cleanupResult = cleanupDestroyedUnits(topLevelUnits, null); // 워커는 선택된 유닛을 모름
        topLevelUnits = cleanupResult.remainingUnits;

        // 업데이트된 상태를 메인 스레드로 다시 보냅니다.
        self.postMessage({
            type: 'updateComplete',
            data: {
                topLevelUnits: topLevelUnits.map(unit => dehydrateUnit(unit)),
                nations: Array.from(nations.values()).map(nation => dehydrateNation(nation)),
                broadcastedBattle: broadcastedBattle // unitLogic.js에서 설정된 전역 변수
            }
        });
    }
};

// --- 데이터 직렬화/역직렬화 헬퍼 함수 ---
// 실제 구현에서는 클래스 인스턴스를 순수 객체로, 또는 그 반대로 변환하는 로직이 필요합니다.
// 이는 복잡할 수 있으므로 여기서는 개념적인 예시만 듭니다.

function hydrateUnit(plainObj) {
    // 순수 객체를 다시 클래스 인스턴스로 만드는 로직
    // 예: const unit = new (window[plainObj.className])(...); Object.assign(unit, plainObj);
    // 이 부분은 실제 구현 시 가장 까다로운 부분입니다. 라이브러리(e.g., 'class-transformer')를 사용하거나
    // 각 클래스에 toJSON(), fromJSON() 메서드를 구현하는 것이 좋습니다.
    // 지금은 간단하게 객체를 그대로 반환합니다. 실제로는 클래스 메서드가 동작하지 않습니다.
    return plainObj; // FIXME: This is a placeholder
}

function dehydrateUnit(unitInstance) {
    // 클래스 인스턴스를 순수 객체로 만드는 로직
    return JSON.parse(JSON.stringify(unitInstance)); // 가장 간단하지만 불완전한 방법
}

function hydrateNation(plainNation) {
    const nation = new Nation(plainNation.id, plainNation.name, plainNation.color, plainNation.capitalProvinceId);
    nation.economy = new Economy(nation);
    Object.assign(nation.economy, plainNation.economy);
    // productionLines, equipmentStockpile 등도 복원 필요
    return nation;
}

function dehydrateNation(nationInstance) {
    return JSON.parse(JSON.stringify(nationInstance));
}


// broadcastedBattle 변수를 unitLogic.js에서 접근할 수 있도록 전역으로 선언
let broadcastedBattle = null;