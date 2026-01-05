const MAP_WIDTH = 400;
const MAP_HEIGHT = 400;
const HEX_RADIUS = 20;
const HEX_WIDTH = Math.sqrt(3) * HEX_RADIUS;
const HEX_HEIGHT = 2 * HEX_RADIUS;
const HEX_VERT_SPACING = 1.5 * HEX_RADIUS;

/**
 * 게임 맵의 그리드와 국가 소유권을 관리하는 클래스입니다.
 */
class MapGrid {
    constructor() {
        this.width = MAP_WIDTH;
        this.height = MAP_HEIGHT;
        this.hexRadius = HEX_RADIUS;
        
        this.nations = new Map(); // id를 키로 사용하여 Nation 객체를 저장
        this.provinceManager = new ProvinceManager(this.width, this.height); // 프로빈스 먼저 생성
        this.regionManager = new RegionManager(this.provinceManager); // 프로빈스 생성 후 지역 및 자원 생성
    }

    /**
     * 특정 프로빈스의 소유권을 설정합니다.
     * @param {number} provinceId 
     * @param {Nation | null} nation 
     */
    setProvinceOwner(provinceId, nation) {
        const province = this.provinceManager.provinces.get(provinceId);
        if (!province) return;

        // 1. 이전 소유주가 있었다면 해당 국가의 영토 목록에서 프로빈스를 제거합니다.
        if (province.owner) {
            province.owner.removeProvince(provinceId);
        }

        // 2. 프로빈스의 소유주를 새로운 국가로 설정합니다.
        province.owner = nation;

        // 3. 새로운 국가의 영토 목록에 이 프로빈스를 추가합니다.
        if (nation) {
            nation.addProvince(provinceId);
        }
    }
}

// --- Hexagon Helper Functions (Pointy-topped, Odd-r) ---

function hexToPixel(col, row) {
    const x = (col + 0.5 * (row & 1)) * HEX_WIDTH;
    const y = row * HEX_VERT_SPACING;
    return { x, y };
}

function pixelToHex(x, y) {
    const q = (Math.sqrt(3)/3 * x - 1/3 * y) / HEX_RADIUS;
    const r = (2/3 * y) / HEX_RADIUS;
    return cubeToOddr(cubeRound(axialToCube(q, r)));
}

function axialToCube(q, r) {
    return { q, r, s: -q - r };
}

function cubeRound(cube) {
    let q = Math.round(cube.q);
    let r = Math.round(cube.r);
    let s = Math.round(cube.s);

    const q_diff = Math.abs(q - cube.q);
    const r_diff = Math.abs(r - cube.r);
    const s_diff = Math.abs(s - cube.s);

    if (q_diff > r_diff && q_diff > s_diff) {
        q = -r - s;
    } else if (r_diff > s_diff) {
        r = -q - s;
    } else {
        s = -q - r;
    }
    return { q, r, s };
}

function cubeToOddr(cube) {
    const col = cube.q + (cube.r - (cube.r & 1)) / 2;
    const row = cube.r;
    return { col, row };
}

function getHexNeighbors(col, row) {
    const parity = row & 1;
    const directions = [
        { col: 1, row: 0 },           // East
        { col: parity ? 1 : 0, row: 1 },  // South-East
        { col: parity ? 0 : -1, row: 1 }, // South-West
        { col: -1, row: 0 },          // West
        { col: parity ? 0 : -1, row: -1 },// North-West
        { col: parity ? 1 : 0, row: -1 }, // North-East
    ];
    return directions.map(d => ({ col: col + d.col, row: row + d.row }));
}

function getHexCorner(center, i) {
    const angle_deg = 60 * i + 30;
    const angle_rad = Math.PI / 180 * angle_deg;
    return {
        x: center.x + HEX_RADIUS * Math.cos(angle_rad),
        y: center.y + HEX_RADIUS * Math.sin(angle_rad)
    };
}