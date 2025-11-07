/**
 * 게임 내 국가의 정보를 관리하는 클래스입니다.
 * 영토, 수도, 색상, 경제(산업, 생산) 등의 정보를 가집니다.
 */
class Nation {
    /**
     * @param {string} id 국가의 고유 ID ('blue', 'red' 등)
     * @param {string} name 국가의 이름
     * @param {string} color 국가를 나타내는 색상 (e.g., 'rgba(255, 0, 0, 0.2)')
     * @param {number | null} capitalProvinceId 수도 프로빈스의 ID
     */
    constructor(id, name, color, capitalProvinceId = null) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.capitalProvinceId = capitalProvinceId; // 수도 프로빈스 ID
        // 영토는 프로빈스 ID의 Set으로 관리합니다.
        this.territory = new Set();

        // 국가의 경제를 담당하는 Economy 인스턴스를 생성합니다.
        this.economy = new Economy(this);
    }

    /**
     * 국가의 영토에 프로빈스를 추가합니다.
     * @param {number} provinceId 
     */
    addProvince(provinceId) {
        this.territory.add(provinceId);
    }

    /**
     * 국가의 영토에서 프로빈스를 제거합니다.
     * @param {number} provinceId 
     */
    removeProvince(provinceId) {
        this.territory.delete(provinceId);
    }
}