const MAP_WIDTH = 200;
const MAP_HEIGHT = 200;
const TILE_SIZE = 70;

/**
 * 게임 맵의 그리드와 국가 소유권을 관리하는 클래스입니다.
 */
class MapGrid {
    constructor() {
        this.width = MAP_WIDTH;
        this.height = MAP_HEIGHT;
        this.tileSize = TILE_SIZE;
        this.nations = new Map(); // id를 키로 사용하여 Nation 객체를 저장
        this.provinceManager = new ProvinceManager(this.width, this.height);

        // 2D 배열로 맵 그리드를 생성하고, 각 셀은 소유한 Nation 객체를 참조합니다.
        // 초기에는 모든 셀의 소유권이 없습니다 (null).
        this.grid = Array(this.width).fill(null).map(() => Array(this.height).fill(null));

        this.initializeNations();
    }

    /**
     * 디버깅을 위한 초기 국가와 영토를 설정합니다.
     */
    initializeNations() {
        // 1. 디버그용 국가 생성
        const debugNation = new Nation(1, "디버그 공화국", 'rgba(0, 128, 255, 0.3)', { x: 2, y: 2 });
        this.nations.set(debugNation.id, debugNation);

        // 2. 디버그 국가의 초기 영토 설정 (10칸)
        const initialTerritory = [
            { x: 2, y: 2 }, // 수도
            { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
            { x: 1, y: 2 },                 { x: 3, y: 2 },
            { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
            { x: 2, y: 4 },
        ];

        // 3. 영토 정보를 Nation 객체와 MapGrid에 동기화
        initialTerritory.forEach(tile => {
            this.setTileOwner(tile.x, tile.y, debugNation);
        });
    }

    /**
     * 특정 그리드 타일의 소유권을 설정합니다.
     * @param {number} x 
     * @param {number} y 
     * @param {Nation | null} nation 
     */
    setTileOwner(x, y, nation) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            // 이전 소유주가 있었다면 해당 국가의 영토 목록에서 제거
            const oldOwner = this.grid[x][y];
            if (oldOwner) {
                oldOwner.removeTerritory(x, y);
            }

            this.grid[x][y] = nation;
            if (nation) {
                nation.addTerritory(x, y);
            }
        }
    }
}