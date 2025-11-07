/**
 * 맵의 프로빈스(Province)를 정의하고 생성하는 로직을 담당합니다.
 */

const MIN_PROVINCE_SIZE = 5;
const MAX_PROVINCE_SIZE = 11;

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
        const avgProvinceSize = (MIN_PROVINCE_SIZE + MAX_PROVINCE_SIZE) / 2;
        const numProvinces = Math.floor(mapArea / avgProvinceSize);

        // 2. 프로빈스의 중심점(씨앗)을 무작위로 생성합니다.
        const seeds = [];
        for (let i = 0; i < numProvinces; i++) {
            seeds.push({
                x: Math.floor(Math.random() * this.mapWidth),
                y: Math.floor(Math.random() * this.mapHeight),
                provinceId: i + 1 // ID를 1부터 순차적으로 부여
            });
        }

        // 3. 각 타일이 어떤 씨앗에 가장 가까운지 계산하여 프로빈스를 할당합니다. (보로노이 다이어그램)
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                let closestSeedIndex = -1;
                let minDistanceSq = Infinity;

                for (let i = 0; i < seeds.length; i++) {
                    const seed = seeds[i];
                    const distanceSq = (x - seed.x) ** 2 + (y - seed.y) ** 2;
                    if (distanceSq < minDistanceSq) {
                        minDistanceSq = distanceSq;
                        closestSeedIndex = i;
                    }
                }

                const assignedProvinceId = seeds[closestSeedIndex].provinceId;                
                // 해당 ID의 프로빈스가 아직 없으면 새로 생성합니다.
                if (!this.provinces.has(assignedProvinceId)) {
                    this.provinces.set(assignedProvinceId, new Province(assignedProvinceId));
                }

                this.provinceGrid[x][y] = assignedProvinceId;
                this.provinces.get(assignedProvinceId).addTile(x, y);
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