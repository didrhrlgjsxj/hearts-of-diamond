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