/**
 * 맵의 프로빈스(Province)를 정의하고 생성하는 로직을 담당합니다.
 */
const AVG_PROVINCE_SIZE = 28; // 프로빈스의 평균 타일 개수. 이 값이 작을수록 프로빈스가 많아지고, 클수록 적어집니다.

/**
 * 개별 프로빈스를 나타내는 클래스입니다.
 */
class Province {
    /**
     * @param {number} id 프로빈스의 고유 ID
     */
    constructor(id) {
        this.id = id;
        this.tiles = []; // {col, row} 객체의 배열 (Hex coordinates)
        this.owner = null; // 이 프로빈스를 소유한 Nation 객체
        this.color = `hsl(${Math.random() * 360}, 50%, 70%)`; // 디버깅용 랜덤 색상
        this.center = { x: 0, y: 0 }; // 프로빈스의 중앙 좌표
        this.resources = {}; // 이 프로빈스에서 생산되는 자원. 예: { 'IRON': 5, 'OIL': 2 }
    }

    /**
     * 프로빈스에 타일을 추가합니다.
     * @param {number} col 타일의 col 좌표
     * @param {number} row 타일의 row 좌표
     */
    addTile(col, row) {
        this.tiles.push({ x: col, y: row }); // x=col, y=row for compatibility
        this.calculateCenter();
    }

    /**
     * 프로빈스를 구성하는 모든 타일의 평균 위치를 계산하여 중앙 좌표를 설정합니다.
     */
    calculateCenter() {
        if (this.tiles.length === 0) return;
        // Hex grid center calculation needs to average pixels, not logical coords
        let sumX = 0;
        let sumY = 0;
        this.tiles.forEach(tile => {
            const pixel = hexToPixel(tile.x, tile.y);
            sumX += pixel.x;
            sumY += pixel.y;
        });
        this.center.x = sumX / this.tiles.length;
        this.center.y = sumY / this.tiles.length;
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
        this.provinceAdjacency = new Map(); // 프로빈스 인접 목록
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
        const frontiers = Array(numProvinces).fill(null).map(() => new Set());

        for (let i = 0; i < numProvinces; i++) {
            const provinceId = this.nextProvinceId++;
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
            
            // 씨앗의 이웃을 프론티어에 추가
            const neighbors = getHexNeighbors(startX, startY);
            for (const n of neighbors) {
                if (n.col >= 0 && n.col < this.mapWidth && n.row >= 0 && n.row < this.mapHeight) {
                    frontiers[i].add(`${n.col},${n.row}`);
                }
            }
        }

        // 3. 개선된 성장 알고리즘: 인접 타일이 2개 이상인 곳을 우선적으로 채웁니다.
        let active = true;
        while (active) {
            active = false;
            
            // 처리 순서를 섞어서 성장이 한쪽으로 치우치는 것을 방지합니다.
            const indices = Array.from({ length: numProvinces }, (_, i) => i);
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }

            for (const i of indices) {
                const provinceId = i + 1;
                const frontier = frontiers[i];
                if (frontier.size === 0) continue;

                const candidates = [];
                const toRemove = [];

                for (const key of frontier) {
                    const [col, row] = key.split(',').map(Number);
                    if (this.provinceGrid[col][row] !== null) {
                        toRemove.push(key);
                        continue;
                    }

                    // 현재 프로빈스와의 인접 수 계산
                    let myNeighborsCount = 0;
                    const neighbors = getHexNeighbors(col, row);
                    for (const n of neighbors) {
                        if (n.col >= 0 && n.col < this.mapWidth && n.row >= 0 && n.row < this.mapHeight) {
                            if (this.provinceGrid[n.col][n.row] === provinceId) {
                                myNeighborsCount++;
                            }
                        }
                    }
                    candidates.push({ key, col, row, score: myNeighborsCount });
                }

                toRemove.forEach(k => frontier.delete(k));
                if (candidates.length === 0) continue;

                active = true;

                // 점수가 2 이상인 후보를 우선 선택 (오목한 곳 채우기)
                let selected = candidates.filter(c => c.score >= 2);
                
                // 2 이상인 후보가 없으면, 1개인 후보 중 하나를 선택하여 성장 (성장 멈춤 방지)
                if (selected.length === 0) {
                    const randomIndex = Math.floor(Math.random() * candidates.length);
                    selected = [candidates[randomIndex]];
                }

                for (const item of selected) {
                    if (this.provinceGrid[item.col][item.row] !== null) continue;

                    this.provinceGrid[item.col][item.row] = provinceId;
                    this.provinces.get(provinceId).addTile(item.col, item.row);
                    frontier.delete(item.key);

                    // 새로운 이웃을 프론티어에 추가
                    const newNeighbors = getHexNeighbors(item.col, item.row);
                    for (const n of newNeighbors) {
                        if (n.col >= 0 && n.col < this.mapWidth && n.row >= 0 && n.row < this.mapHeight) {
                            if (this.provinceGrid[n.col][n.row] === null) {
                                frontier.add(`${n.col},${n.row}`);
                            }
                        }
                    }
                }
            }
        }

        // 모든 프로빈스의 최종 중앙 좌표를 계산합니다.
        this.provinces.forEach(p => p.calculateCenter());

        // 4. 너무 큰 프로빈스를 분할하는 후처리 단계를 실행합니다.
        this.splitLargeProvinces();

        // 5. 모든 프로빈스 생성이 끝난 후, 인접 목록을 계산합니다.
        this.calculateAdjacency();
    }

    /**
     * 설정된 평균 크기보다 과도하게 큰 프로빈스를 찾아 분할합니다.
     */
    splitLargeProvinces() {
        const provincesToSplit = [];
        this.provinces.forEach(p => {
            if (p.tiles.length > AVG_PROVINCE_SIZE * 2) {
                provincesToSplit.push(p);
            }
        });

        for (const province of provincesToSplit) {
            this.splitProvince(province);
        }
    }

    /**
     * 주어진 프로빈스를 두 개로 분할합니다.
     * @param {Province} province 분할할 프로빈스
     */
    splitProvince(province) {
        if (province.tiles.length < 2) return;

        // 픽셀 좌표계(hexToPixel)를 사용하여 실제 거리를 계산합니다.
        const getDistSq = (t1, t2) => {
            const p1 = hexToPixel(t1.x, t1.y);
            const p2 = hexToPixel(t2.x, t2.y);
            return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
        };

        // 1. 프로빈스 내에서 서로 가장 멀리 떨어진 두 타일을 찾아 새 '씨앗'으로 사용합니다.
        let maxDistSq = -1;
        let seed1 = null, seed2 = null;

        // O(n^2) 연산을 피하기 위한 근사치 계산:
        // 1. 첫 타일에서 가장 먼 타일(A)을 찾습니다.
        // 2. 타일 A에서 가장 먼 타일(B)을 찾습니다. A와 B를 두 씨앗으로 사용합니다.
        let tempSeed = province.tiles[0];
        province.tiles.forEach(tile => {
            const distSq = getDistSq(tile, tempSeed);
            if (distSq > maxDistSq) {
                maxDistSq = distSq;
                seed1 = tile;
            }
        });
        maxDistSq = -1;
        province.tiles.forEach(tile => {
            const distSq = getDistSq(tile, seed1);
            if (distSq > maxDistSq) {
                maxDistSq = distSq;
                seed2 = tile;
            }
        });

        // 2. 새 프로빈스를 생성하고 타일을 재할당합니다.
        const newProvince = new Province(this.nextProvinceId++);
        const tilesToMove = province.tiles.filter(tile => {
            const distToSeed1 = getDistSq(tile, seed1);
            const distToSeed2 = getDistSq(tile, seed2);
            return distToSeed2 < distToSeed1;
        });

        // 3. 타일 소유권을 이전합니다.
        province.tiles = province.tiles.filter(tile => !tilesToMove.includes(tile));
        tilesToMove.forEach(tile => {
            this.provinceGrid[tile.x][tile.y] = newProvince.id; // tile.x is col, tile.y is row
            newProvince.addTile(tile.x, tile.y); // tile.x is col, tile.y is row
        });

        // 4. 변경된 프로빈스 정보를 시스템에 등록하고 중앙점을 다시 계산합니다.
        this.provinces.set(newProvince.id, newProvince);
        province.calculateCenter();
        newProvince.calculateCenter();
    }

    /**
     * 특정 타일의 인접 타일 목록을 무작위 순서로 반환합니다. (Hexagon)
     * @param {number} col 
     * @param {number} row 
     * @returns {{col: number, row: number}[]}
     */
    getShuffledHexNeighbors(col, row) {
        const neighbors = getHexNeighbors(col, row).filter(n => 
            n.col >= 0 && n.col < this.mapWidth && n.row >= 0 && n.row < this.mapHeight);

        return neighbors.sort(() => Math.random() - 0.5);
    }

    /**
     * 모든 프로빈스의 인접 관계를 계산하여 provinceAdjacency 맵에 저장합니다.
     */
    calculateAdjacency() {
        this.provinces.forEach(province => {
            const adjacentProvinces = new Set();
            province.tiles.forEach(tile => {
                const neighbors = getHexNeighbors(tile.x, tile.y);

                neighbors.forEach(n => {
                    if (n.col >= 0 && n.col < this.mapWidth && n.row >= 0 && n.row < this.mapHeight) {
                        const neighborProvinceId = this.provinceGrid[n.col][n.row];
                        if (neighborProvinceId !== province.id) {
                            adjacentProvinces.add(neighborProvinceId);
                        }
                    }
                });
            });
            this.provinceAdjacency.set(province.id, Array.from(adjacentProvinces));
        });
    }

    /**
     * 특정 프로빈스가 수도까지 연결되어 있는지 확인합니다. (BFS 사용)
     * @param {number} startProvinceId - 확인할 프로빈스 ID
     * @param {Nation} nation - 소유 국가
     * @returns {boolean}
     */
    isPathToCapital(startProvinceId, nation) {
        const queue = [startProvinceId];
        const visited = new Set([startProvinceId]);
        while (queue.length > 0) {
            const currentId = queue.shift();
            if (currentId === nation.capitalProvinceId) return true;
            this.provinceAdjacency.get(currentId)?.forEach(neighborId => {
                if (!visited.has(neighborId) && nation.territory.has(neighborId)) {
                    visited.add(neighborId);
                    queue.push(neighborId);
                }
            });
        }
        return false;
    }
}