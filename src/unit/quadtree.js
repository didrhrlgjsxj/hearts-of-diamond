/**
 * 2D 공간 분할을 위한 쿼드트리(Quadtree) 구현체입니다.
 * 많은 수의 유닛 간 거리 계산이나 충돌 감지 성능을 최적화하는 데 사용됩니다.
 */

class Point {
    constructor(x, y, userData) {
        this.x = x;
        this.y = y;
        this.userData = userData; // 유닛 객체 등을 저장
    }
}

class Rectangle {
    constructor(x, y, w, h) {
        this.x = x; // 중심 x
        this.y = y; // 중심 y
        this.w = w; // 너비의 절반 (반지름 개념)
        this.h = h; // 높이의 절반
    }

    // 점이 사각형 안에 있는지 확인
    contains(point) {
        return (point.x >= this.x - this.w &&
                point.x < this.x + this.w &&
                point.y >= this.y - this.h &&
                point.y < this.y + this.h);
    }

    // 두 사각형이 겹치는지 확인
    intersects(range) {
        return !(range.x - range.w > this.x + this.w ||
                 range.x + range.w < this.x - this.w ||
                 range.y - range.h > this.y + this.h ||
                 range.y + range.h < this.y - this.h);
    }
}

class Quadtree {
    constructor(boundary, capacity) {
        this.boundary = boundary; // Rectangle
        this.capacity = capacity; // 분할 전 담을 수 있는 최대 점 개수
        this.points = [];
        this.divided = false;
    }

    // 점 삽입
    insert(point) {
        if (!this.boundary.contains(point)) {
            return false;
        }

        if (this.points.length < this.capacity) {
            this.points.push(point);
            return true;
        }

        if (!this.divided) {
            this.subdivide();
        }

        return (this.northeast.insert(point) ||
                this.northwest.insert(point) ||
                this.southeast.insert(point) ||
                this.southwest.insert(point));
    }

    // 4개의 하위 구역으로 분할
    subdivide() {
        const x = this.boundary.x;
        const y = this.boundary.y;
        const w = this.boundary.w / 2;
        const h = this.boundary.h / 2;

        const ne = new Rectangle(x + w, y - h, w, h);
        this.northeast = new Quadtree(ne, this.capacity);
        const nw = new Rectangle(x - w, y - h, w, h);
        this.northwest = new Quadtree(nw, this.capacity);
        const se = new Rectangle(x + w, y + h, w, h);
        this.southeast = new Quadtree(se, this.capacity);
        const sw = new Rectangle(x - w, y + h, w, h);
        this.southwest = new Quadtree(sw, this.capacity);

        this.divided = true;
    }

    // 범위 내의 점들 조회
    query(range, found) {
        if (!found) {
            found = [];
        }

        if (!this.boundary.intersects(range)) {
            return found;
        }

        for (const p of this.points) {
            if (range.contains(p)) {
                found.push(p.userData);
            }
        }

        if (this.divided) {
            this.northwest.query(range, found);
            this.northeast.query(range, found);
            this.southwest.query(range, found);
            this.southeast.query(range, found);
        }

        return found;
    }
    
    // 쿼드트리 초기화 (재사용을 위해)
    clear() {
        this.points = [];
        this.divided = false;
        this.northeast = null;
        this.northwest = null;
        this.southeast = null;
        this.southwest = null;
    }
}