/**
 * 국가(Nation)를 나타내는 클래스입니다.
 * 각 국가는 고유한 이름, 색상, 수도, 영토를 가집니다.
 */
class Nation {
    /**
     * @param {number} id 국가의 고유 ID
     * @param {string} name 국가의 이름
     * @param {string} color 국가를 나타내는 색상 (e.g., 'rgba(255, 0, 0, 0.2)')
     * @param {{x: number, y: number}} capital 수도의 그리드 좌표
     */
    constructor(id, name, color, capital) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.capital = capital; // {x, y}
        // 영토는 Set으로 관리하여 중복을 방지하고 빠른 조회를 지원합니다.
        // 좌표는 "x,y" 형태의 문자열로 저장됩니다.
        this.territory = new Set();
    }

    /**
     * 국가의 영토에 그리드 셀을 추가합니다.
     * @param {number} x 
     * @param {number} y 
     */
    addTerritory(x, y) {
        this.territory.add(`${x},${y}`);
    }

    /**
     * 국가의 영토에서 그리드 셀을 제거합니다.
     * @param {number} x 
     * @param {number} y 
     */
    removeTerritory(x, y) {
        this.territory.delete(`${x},${y}`);
    }
}