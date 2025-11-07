/**
 * 맵의 프로빈스(Province)를 정의하고 생성하는 로직을 담당합니다.
 */
const AVG_PROVINCE_SIZE = 6; // 프로빈스의 평균 타일 개수. 이 값이 작을수록 프로빈스가 많아지고, 클수록 적어집니다.

/**
 * 개별 프로빈스를 나타내는 클래스입니다.
 */
class Province {
    /**
     * @param {number} id 프로빈스의 고유 ID
     */
    constructor(id) {
        this.id = id;
        this.tiles = []; // {x, y} 객체의 배열
        this.owner = null; // 이 프로빈스를 소유한 Nation 객체
        this.color = `hsl(${Math.random() * 360}, 50%, 70%)`; // 디버깅용 랜덤 색상
        this.center = { x: 0, y: 0 }; // 프로빈스의 중앙 좌표
    }

    /**
     * 프로빈스에 타일을 추가합니다.
     * @param {number} x 타일의 x 좌표
     * @param {number} y 타일의 y 좌표
     */
    addTile(x, y) {
        this.tiles.push({ x, y });
        this.calculateCenter();
    }

    /**
     * 프로빈스를 구성하는 모든 타일의 평균 위치를 계산하여 중앙 좌표를 설정합니다.
     */
    calculateCenter() {
        if (this.tiles.length === 0) return;
        const total = this.tiles.reduce((acc, tile) => ({ x: acc.x + tile.x, y: acc.y + tile.y }), { x: 0, y: 0 });
        this.center.x = total.x / this.tiles.length;
        this.center.y = total.y / this.tiles.length;
    }
}

/**
 * 맵 전체의 프로빈스를 생성하고 관리하는 클래스입니다.
 */
class ProvinceManager {
    /**
     * @param {number} mapWidth 맵의 너비 (타일 개수)
     * @param {number} mapHeight 맵의 높이 (타일 개수)
     */
    constructor(mapWidth, mapHeight) {
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.provinces = new Map(); // id를 키로 사용하여 Province 객체를 저장
        this.provinceGrid = Array(mapWidth).fill(null).map(() => Array(mapHeight).fill(null));
        this.nextProvinceId = 1;

        this.generateProvinces();
    }

    /**
     * 맵 전체에 걸쳐 프로빈스를 생성하는 메인 알고리즘입니다.
     * 모든 타일이 하나의 프로빈스에 속하도록 맵을 분할합니다.
     */
    generateProvinces() {
        // 1. 생성할 프로빈스의 개수를 결정합니다.
        const mapArea = this.mapWidth * this.mapHeight;
        const numProvinces = Math.floor(mapArea / AVG_PROVINCE_SIZE);

        // 2. 프로빈스의 중심점(씨앗)을 무작위로 생성합니다.
        const queues = [];
        for (let i = 0; i < numProvinces; i++) {
            const provinceId = i + 1;
            let startX, startY;
            // 다른 씨앗과 겹치지 않는 위치를 찾습니다.
            do {
                startX = Math.floor(Math.random() * this.mapWidth);
                startY = Math.floor(Math.random() * this.mapHeight);
            } while (this.provinceGrid[startX][startY] !== null);

            const province = new Province(provinceId);
            this.provinces.set(provinceId, province);

            this.provinceGrid[startX][startY] = provinceId;
            province.addTile(startX, startY);
            queues.push([{ x: startX, y: startY }]);
        }

        // 3. 다중 소스 너비 우선 탐색(Multi-Source BFS)을 사용하여 맵을 채웁니다.
        let activeQueues = true;
        while (activeQueues) {
            activeQueues = false;
            for (let i = 0; i < queues.length; i++) {
                const currentQueue = queues[i];
                if (currentQueue.length === 0) continue;

                activeQueues = true;
                const nextQueue = [];
                for (const tile of currentQueue) {
                    const neighbors = this.getShuffledNeighbors(tile.x, tile.y);
                    for (const neighbor of neighbors) {
                        if (this.provinceGrid[neighbor.x][neighbor.y] === null) {
                            const provinceId = i + 1;
                            this.provinceGrid[neighbor.x][neighbor.y] = provinceId;
                            this.provinces.get(provinceId).addTile(neighbor.x, neighbor.y);
                            nextQueue.push(neighbor);
                        }
                    }
                }
                queues[i] = nextQueue;
            }
        }

        // 모든 프로빈스의 최종 중앙 좌표를 계산합니다.
        this.provinces.forEach(p => p.calculateCenter());
    }

    /**
     * 특정 타일의 인접 타일 목록을 무작위 순서로 반환합니다.
     * @param {number} x 
     * @param {number} y 
     * @returns {{x: number, y: number}[]}
     */
    getShuffledNeighbors(x, y) {
        const neighbors = [];
        if (x > 0) neighbors.push({ x: x - 1, y: y });
        if (x < this.mapWidth - 1) neighbors.push({ x: x + 1, y: y });
        if (y > 0) neighbors.push({ x: x, y: y - 1 });
        if (y < this.mapHeight - 1) neighbors.push({ x: x, y: y + 1 });

        return neighbors.sort(() => Math.random() - 0.5);
    }
}