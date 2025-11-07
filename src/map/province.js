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
        this.color = `hsl(${Math.random() * 360}, 50%, 70%)`; // 디버깅용 랜덤 색상
    }

    /**
     * 프로빈스에 타일을 추가합니다.
     * @param {number} x 타일의 x 좌표
     * @param {number} y 타일의 y 좌표
     */
    addTile(x, y) {
        this.tiles.push({ x, y });
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
        const unassignedTiles = [];
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                unassignedTiles.push({ x, y });
            }
        }

        // 타일 목록을 무작위로 섞어 시작점 편향을 방지합니다.
        for (let i = unassignedTiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [unassignedTiles[i], unassignedTiles[j]] = [unassignedTiles[j], unassignedTiles[i]];
        }

        while (unassignedTiles.length > 0) {
            const startTile = unassignedTiles.pop();
            if (this.provinceGrid[startTile.x][startTile.y] !== null) {
                continue; // 이미 다른 프로빈스에 할당된 타일이면 건너뜁니다.
            }

            const newProvince = new Province(this.nextProvinceId++);
            const provinceSize = Math.floor(Math.random() * (MAX_PROVINCE_SIZE - MIN_PROVINCE_SIZE + 1)) + MIN_PROVINCE_SIZE;
            
            const queue = [startTile];
            this.provinceGrid[startTile.x][startTile.y] = newProvince.id;
            newProvince.addTile(startTile.x, startTile.y);

            while (queue.length > 0 && newProvince.tiles.length < provinceSize) {
                const current = queue.shift();
                
                const neighbors = this.getShuffledNeighbors(current.x, current.y);

                for (const neighbor of neighbors) {
                    if (this.provinceGrid[neighbor.x][neighbor.y] === null) {
                        this.provinceGrid[neighbor.x][neighbor.y] = newProvince.id;
                        newProvince.addTile(neighbor.x, neighbor.y);
                        queue.push(neighbor);
                        if (newProvince.tiles.length >= provinceSize) break;
                    }
                }
            }
            this.provinces.set(newProvince.id, newProvince);
        }
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