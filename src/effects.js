// 이 파일은 여러 모듈에서 공유되는 전역 이펙트 배열을 관리합니다.
// 순환 참조 문제를 방지하기 위해 별도의 파일로 분리되었습니다.

export const deathEffects = [];
export const gatherEffects = [];