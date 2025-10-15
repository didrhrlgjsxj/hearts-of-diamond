// SquadManager.js
import { NemoSquadFormationManager } from './NemoSquadFormationManager.js';

// This file provides a small manager that automatically groups Nemos
// by distance. Groups are called "squad".  Nemos within
// 5 grid cells from each other (considering chain connection) form a squad.
// squad.  The squad size is limited so that its bounding box does not
// exceed 20 grid cells.
const SquadSizes = {
    SQUAD: 'squad',       // 2-5 Nemos
    TROOP: 'troop',     // 6-12 Nemos
    PLATOON: 'platoon',   // 13-30 Nemos
    COMPANY: 'company'    // 31+ Nemos
};

// 각도를 부드럽게 보간하는 헬퍼 함수
function lerpAngle(start, end, amount) {
    let difference = end - start;
    if (difference > Math.PI) difference -= 2 * Math.PI;
    if (difference < -Math.PI) difference += 2 * Math.PI;
    if (Math.abs(difference) < 0.001) return end; // 작은 차이는 무시
    return start + difference * amount;
}

class Squad {
    constructor(nemos = [], team = 'blue', cellSize = 40) {
        this.nemos = nemos;
        this.team = team;
        this.leader = null;
        this.cellSize = cellSize;
        this.selected = false;
        this.squadDestination = null; // 스쿼드 전체의 목표 지점        
        this.currentPos = { x: 0, y: 0 }; // 스쿼드의 현재 가상 중심 위치
        this.formationManager = new NemoSquadFormationManager(this);

        this.squadSpeed = 3; // 스쿼드의 이동 속도
        this.primaryCombatTarget = null; // 주 경계 대상
        this.secondaryCombatTargets = []; // 보조 경계 대상 (나를 주 경계 대상으로 삼는 다른 스쿼드들)
        this.isHeadOnBattle = false; // 정면 전투 상태
        this.vigilanceBattleTarget = null; // 경계 전투 상태 대상
        this.responseBattleTarget = null; // 대응 전투 상태 대상
        this.isResponseAttacker = false; // 대응 전투 상태에서 공격측인지 여부
        this.isEngaging = false; // 전투 중인지 여부
        this.attackMoveTargetSquad = null; // 어택땅 목표 스쿼드
        this.attackMoveDestination = null; // 어택땅 중간 목표 지점

        this.targetDirection = 0; // 목표 이동 방향 (라디안)

        this.primaryDirection = 0;
        this.secondaryDirections = [
            { currentAngle: -Math.PI / 2, targetOffset: -Math.PI / 2 },
            { currentAngle: Math.PI / 2, targetOffset: Math.PI / 2 }
        ];

        this.type = this.determineSquadSize();
        this.assignLeader();
        this.updateBounds();
        this.currentPos = { x: this.bounds.x + this.bounds.w / 2, y: this.bounds.y + this.bounds.h / 2 };
   }

   addNemos(newNemos) {
       this.nemos.push(...newNemos);
       newNemos.forEach(n => n.squad = this);
       if (!this.leader) this.assignLeader();
   }

   assignLeader() {
       // 이미 유효한 리더가 있다면 교체하지 않습니다.
       if (this.leader && !this.leader.dead && this.nemos.includes(this.leader)) {
           return;
       }

       if (this.nemos.length === 0) {
           this.leader = null;
           return;
       }
       // 리더가 없거나 죽었으면, 스쿼드 내 첫 번째 유닛을 새 리더로 지정합니다.
       this.leader = this.nemos[0];
   }

   update() {
       if (!this.leader || this.leader.dead) {
           this.assignLeader();
       }
       if (!this.leader) return; // 스쿼드에 유닛이 없으면 업데이트 중지

       this.updateAttackMoveState();
       this.updateSquadMovementState();
       this.formationManager.update();
   }

   updateAttackMoveState() {
       if (!this.attackMoveTargetSquad || this.attackMoveTargetSquad.nemos.length === 0) {
           this.attackMoveTargetSquad = null;
           return;
       }

       const myCenter = { x: this.bounds.x + this.bounds.w / 2, y: this.bounds.y + this.bounds.h / 2 };
       const targetCenter = { x: this.attackMoveTargetSquad.bounds.x + this.attackMoveTargetSquad.bounds.w / 2, y: this.attackMoveTargetSquad.bounds.y + this.attackMoveTargetSquad.bounds.h / 2 };

       const inRangeCount = this.nemos.filter(nemo => {
           const dist = Math.hypot(targetCenter.x - nemo.x, targetCenter.y - nemo.y);
           return dist <= nemo.calculatedEffectiveRange;
       }).length;

       if (inRangeCount < this.nemos.length / 2) {
           this.setDestination(targetCenter);
       } else {
           this.squadDestination = null; // 사거리 내에 도달하면 이동 중지
       }
   }

   updateSquadMovementState() {
       if (this.squadDestination) {
           const dx = this.squadDestination.x - this.currentPos.x;
           const dy = this.squadDestination.y - this.currentPos.y;
           const dist = Math.hypot(dx, dy);

           if (dist > this.squadSpeed) {
               this.currentPos.x += (dx / dist) * this.squadSpeed;
               this.currentPos.y += (dy / dist) * this.squadSpeed;
           } else {
               this.currentPos.x = this.squadDestination.x;
               this.currentPos.y = this.squadDestination.y;
               this.squadDestination = null; // 스쿼드 이동 완료
               // 도착 후 개별 네모들의 destination을 null로 설정
               this.nemos.forEach(n => n.destination = null);
           }
       }
   }

   setDestination(pos) {
        // 1. 스쿼드의 목표 지점을 설정하여 '이동 중' 상태로 만듭니다.
        this.attackMoveTargetSquad = null; // 일반 이동 시 어택땅 목표 해제
        this.squadDestination = pos;

        // 2. 모든 네모의 개별 목적지를 초기화합니다.
        // 이제 네모는 스쿼드의 formationManager가 계산하는 위치를 따라갑니다.
        this.nemos.forEach(n => {
            n.destination = null;
            n.clearAttackMove();
        });
   }

   setAttackMoveTarget(targetSquad) {
       this.attackMoveTargetSquad = targetSquad;
       this.squadDestination = null; // 일반 이동 목표는 해제
   }

   setFormationShape(startPos, endPos, destination) {
       const dx = endPos.x - startPos.x;
       const dy = endPos.y - startPos.y;
       const dist = Math.hypot(dx, dy);
        this.formationManager.formationWidth = Math.max(this.cellSize * 2, dist);
        this.setDestination(destination);
   }

    updateBounds() {
        if (this.nemos.length === 0) {
            this.bounds = {x:0, y:0, w:0, h:0};
            return;
        }

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        this.nemos.forEach(n => {
            const half = n.size / 2;

            minX = Math.min(minX, n.x - half);
            maxX = Math.max(maxX, n.x + half);
            minY = Math.min(minY, n.y - half);
            maxY = Math.max(maxY, n.y + half);
        });
        this.bounds = {
            x: minX,
            y: minY,
            w: maxX - minX,
            h: maxY - minY
        };
    }

    getRotationSpeed() {
        // 스쿼드 타입에 따라 회전 속도 조절
        switch (this.type) {
            case SquadSizes.COMPANY:
                return 0.01; // 가장 느림
            case SquadSizes.PLATOON:
                return 0.02;
            case SquadSizes.TROOP:
                return 0.03;
            case SquadSizes.SQUAD:
                return 0.04; // 가장 빠름
            default:
                return 0.03;
        }
    }

    updateDirections() {
        const rotationSpeed = this.getRotationSpeed();

        if (this.primaryCombatTarget) {
            // 주 경계 대상이 있으면, 대상을 향해 방향을 설정
            const targetCenter = this.primaryCombatTarget.bounds;
            const targetX = targetCenter.x + targetCenter.w / 2;
            const targetY = targetCenter.y + targetCenter.h / 2;
            const squadCenterX = this.bounds.x + this.bounds.w / 2;
            const squadCenterY = this.bounds.y + this.bounds.h / 2;
            const dx = targetX - squadCenterX;
            const dy = targetY - squadCenterY;
            this.targetDirection = Math.atan2(dy, dx);
        } else if (this.squadDestination) {
            // 스쿼드가 이동 중이면, 이동 방향을 목표 방향으로 설정
            const dx = this.squadDestination.x - (this.bounds.x + this.bounds.w / 2);
            const dy = this.squadDestination.y - (this.bounds.y + this.bounds.h / 2);
            if (Math.hypot(dx, dy) > 1) {
                this.targetDirection = Math.atan2(dy, dx);
            }
        }

        // 주 경계 방향을 부드럽게 회전
        this.primaryDirection = lerpAngle(this.primaryDirection, this.targetDirection, rotationSpeed);

        // 보조 경계 방향들을 부드럽게 회전
        this.secondaryDirections.forEach(dir => {
            const targetAngle = this.targetDirection + dir.targetOffset;
            dir.currentAngle = lerpAngle(dir.currentAngle, targetAngle, rotationSpeed);
        });
    }

    determineSquadSize() {
        let weightedSize = 0;
        this.nemos.forEach(nemo => {
            if (nemo.unitType === 'army') {
                switch (nemo.armyType) {
                    case 'sqaudio':
                        weightedSize += 3;
                        break;
                    case 'platoon':
                        weightedSize += 10;
                        break;
                    case 'company':
                        weightedSize += 23;
                        break;
                    default:
                        weightedSize += 1; // 다른 army 타입은 1로 계산
                }
            } else {
                weightedSize += 1; // 'unit' 타입은 1로 계산
            }
        });

        if (weightedSize >= 2 && weightedSize <= 5) {
            return SquadSizes.SQUAD;
        } else if (weightedSize >= 6 && weightedSize <= 12) {
            return SquadSizes.TROOP;
        } else if (weightedSize >= 13 && weightedSize <= 30) {
            return SquadSizes.PLATOON;
        } else if (weightedSize >= 31) {
            return SquadSizes.COMPANY;
        }
        return null; // Or handle the case where the size doesn't fit any type

    }

    calculateOrganization() {
        // This is a placeholder, replace with actual combat effectiveness logic
        // For example, consider Nemo's role, distance to other squad members, etc.
        let total = 0;
        this.nemos.forEach(n => {
            total += n.hp / 45; // Assuming max hp is 45, adjust as needed
        });
        return Math.min(1, total / this.nemos.length); // Normalize to 0-1 range
    }

    calculateDurability() {
        let totalHealth = 0;
        this.nemos.forEach(n => {
            totalHealth += n.hp;
        });
        return totalHealth;
    }

    getMaxDurability() {
        return this.nemos.length * 45;
    }

    calculateRecognitionRange() {
        if (this.nemos.length === 0) return 0;

        const ranges = this.nemos.map(n => n.recognitionRange);
        const sum = ranges.reduce((acc, range) => acc + range, 0);
        const avgRange = sum / this.nemos.length;
        const maxRange = Math.max(...ranges);

        // (평균 감지 거리 + 최대 감지 거리) / 2
        const finalRange = (avgRange + maxRange) / 2;
        return finalRange;
    }

    // Draw translucent rectangle covering all nemos in the squad
    draw(ctx) {

        if (!this.bounds) return;
        const { x, y, w, h } = this.bounds;
        ctx.save();

        const stroke = this.team === 'red' ? 'darkred' : 'darkblue';
        const fill = this.team === 'red'
            ? 'rgba(255,0,0,0.15)'
            : 'rgba(0,0,255,0.15)';
        ctx.strokeStyle = stroke;
        ctx.fillStyle = fill;
        ctx.lineWidth = this.selected ? 4 : 2;
        if (this.selected) {
            ctx.shadowColor = stroke;
            ctx.shadowBlur = 10;
        }
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        ctx.restore()

        // 정면 전투 시 화살표 그리기
        if (this.isHeadOnBattle && this.primaryCombatTarget) {
            const myCenter = { x: this.bounds.x + this.bounds.w / 2, y: this.bounds.y + this.bounds.h / 2 };
            const targetCenter = { x: this.primaryCombatTarget.bounds.x + this.primaryCombatTarget.bounds.w / 2, y: this.primaryCombatTarget.bounds.y + this.primaryCombatTarget.bounds.h / 2 };
            const midPoint = { x: (myCenter.x + targetCenter.x) / 2, y: (myCenter.y + targetCenter.y) / 2 };

            const angle = Math.atan2(targetCenter.y - myCenter.y, targetCenter.x - myCenter.x);
            const arrowLength = 40;
            const arrowWidth = 20;

            ctx.save();
            ctx.strokeStyle = 'white';
            ctx.fillStyle = this.team === 'red' ? 'rgba(255, 100, 100, 0.7)' : 'rgba(100, 100, 255, 0.7)';
            ctx.lineWidth = 8;

            // 내 스쿼드에서 중간 지점으로 향하는 화살표
            ctx.beginPath();
            ctx.moveTo(myCenter.x, myCenter.y);
            ctx.lineTo(midPoint.x, midPoint.y);
            ctx.stroke();

            // 화살표 머리
            ctx.beginPath();
            ctx.moveTo(midPoint.x, midPoint.y);
            ctx.lineTo(midPoint.x - arrowLength * Math.cos(angle - Math.PI / 6), midPoint.y - arrowLength * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(midPoint.x - arrowLength * Math.cos(angle + Math.PI / 6), midPoint.y - arrowLength * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // 경계 전투 상태 (Vigilance Battle) 화살표 그리기
        if (this.vigilanceBattleTarget) {
            const myCenter = { x: this.bounds.x + this.bounds.w / 2, y: this.bounds.y + this.bounds.h / 2 };
            const targetCenter = { x: this.vigilanceBattleTarget.bounds.x + this.vigilanceBattleTarget.bounds.w / 2, y: this.vigilanceBattleTarget.bounds.y + this.vigilanceBattleTarget.bounds.h / 2 };
            const midPoint = { x: (myCenter.x + targetCenter.x) / 2, y: (myCenter.y + targetCenter.y) / 2 };
            const angle = Math.atan2(targetCenter.y - myCenter.y, targetCenter.x - myCenter.x);

            ctx.save();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 4;
            ctx.fillStyle = 'rgba(255, 165, 0, 0.6)'; // Orange color for vigilance

            // 양쪽 모두에게서 중간 지점으로 향하는 선
            ctx.beginPath();
            ctx.moveTo(myCenter.x, myCenter.y);
            ctx.lineTo(midPoint.x, midPoint.y);
            ctx.moveTo(targetCenter.x, targetCenter.y);
            ctx.lineTo(midPoint.x, midPoint.y);
            ctx.stroke();
            ctx.restore();
        }

        // 보조 경계 대상 (방어적 교전)에 대한 화살표 그리기
        this.secondaryCombatTargets.forEach(secondaryTarget => {
            const myCenter = { x: this.bounds.x + this.bounds.w / 2, y: this.bounds.y + this.bounds.h / 2 };
            const targetCenter = { x: secondaryTarget.bounds.x + secondaryTarget.bounds.w / 2, y: secondaryTarget.bounds.y + secondaryTarget.bounds.h / 2 };
            
            // 만나는 지점을 내 스쿼드 쪽에 가깝게 (20%)
            const midPoint = { 
                x: myCenter.x * 0.8 + targetCenter.x * 0.2, 
                y: myCenter.y * 0.8 + targetCenter.y * 0.2 
            };

            const angleToMe = Math.atan2(myCenter.y - targetCenter.y, myCenter.x - targetCenter.x);
            const arrowLength = 40;

            ctx.save();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 6; // 정면 전투보다 약간 얇게

            // 상대방(공격자)의 화살표 (뾰족함)
            ctx.fillStyle = secondaryTarget.team === 'red' ? 'rgba(255, 100, 100, 0.7)' : 'rgba(100, 100, 255, 0.7)';
            ctx.beginPath();
            ctx.moveTo(targetCenter.x, targetCenter.y);
            ctx.lineTo(midPoint.x, midPoint.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(midPoint.x, midPoint.y);
            ctx.lineTo(midPoint.x - arrowLength * Math.cos(angleToMe - Math.PI / 6), midPoint.y - arrowLength * Math.sin(angleToMe - Math.PI / 6));
            ctx.lineTo(midPoint.x - arrowLength * Math.cos(angleToMe + Math.PI / 6), midPoint.y - arrowLength * Math.sin(angleToMe + Math.PI / 6));
            ctx.closePath();
            ctx.fill();

            // 내(방어자) 화살표 (둥글게)
            ctx.fillStyle = this.team === 'red' ? 'rgba(255, 100, 100, 0.7)' : 'rgba(100, 100, 255, 0.7)';
            ctx.beginPath();
            ctx.moveTo(myCenter.x, myCenter.y);
            ctx.lineTo(midPoint.x, midPoint.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(midPoint.x, midPoint.y, 15, angleToMe - Math.PI / 2, angleToMe + Math.PI / 2);
            ctx.fill();

            ctx.restore();
        });

        // 대응 전투 상태 (Response Battle) 화살표 그리기
        if (this.responseBattleTarget) {
            const myCenter = { x: this.bounds.x + this.bounds.w / 2, y: this.bounds.y + this.bounds.h / 2 };
            const targetCenter = { x: this.responseBattleTarget.bounds.x + this.responseBattleTarget.bounds.w / 2, y: this.responseBattleTarget.bounds.y + this.responseBattleTarget.bounds.h / 2 };
            
            const midPoint = { 
                x: myCenter.x * 0.5 + targetCenter.x * 0.5, 
                y: myCenter.y * 0.5 + targetCenter.y * 0.5 
            };

            const angleToTarget = Math.atan2(targetCenter.y - myCenter.y, targetCenter.x - myCenter.x);
            const angleToMe = angleToTarget + Math.PI;
            const arrowLength = 40;

            ctx.save();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 6;

            // 공격자(Attacker)의 화살표 (뾰족함)
            const attacker = this.isResponseAttacker ? this : this.responseBattleTarget;
            const defender = this.isResponseAttacker ? this.responseBattleTarget : this;
            const attackerCenter = { x: attacker.bounds.x + attacker.bounds.w / 2, y: attacker.bounds.y + attacker.bounds.h / 2 };
            const defenderCenter = { x: defender.bounds.x + defender.bounds.w / 2, y: defender.bounds.y + defender.bounds.h / 2 };
            const angleFromAttacker = Math.atan2(defenderCenter.y - attackerCenter.y, defenderCenter.x - attackerCenter.x);

            ctx.fillStyle = attacker.team === 'red' ? 'rgba(255, 100, 100, 0.7)' : 'rgba(100, 100, 255, 0.7)';
            ctx.beginPath();
            ctx.moveTo(attackerCenter.x, attackerCenter.y);
            ctx.lineTo(midPoint.x, midPoint.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(midPoint.x, midPoint.y);
            ctx.lineTo(midPoint.x - arrowLength * Math.cos(angleFromAttacker - Math.PI / 6), midPoint.y - arrowLength * Math.sin(angleFromAttacker - Math.PI / 6));
            ctx.lineTo(midPoint.x - arrowLength * Math.cos(angleFromAttacker + Math.PI / 6), midPoint.y - arrowLength * Math.sin(angleFromAttacker + Math.PI / 6));
            ctx.closePath();
            ctx.fill();

            // 방어자(Defender)의 화살표 (둥글게)
            ctx.fillStyle = defender.team === 'red' ? 'rgba(255, 100, 100, 0.7)' : 'rgba(100, 100, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(midPoint.x, midPoint.y, 15, angleFromAttacker - Math.PI / 2, angleFromAttacker + Math.PI / 2);
            ctx.fill();
            ctx.restore();
        }

        // 주/보조 경계 방향 그리기
        if (this.nemos.length > 0) {
            const centerX = x + w / 2;
            const centerY = y + h / 2;
            const lineLength = this.cellSize * 3;

            ctx.save();

            // 이동 방향 (파란색) - 스쿼드의 실제 이동 방향
            ctx.strokeStyle = 'blue';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]); // 점선으로 표시
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + Math.cos(this.targetDirection) * lineLength * 1.2, centerY + Math.sin(this.targetDirection) * lineLength * 1.2);
            ctx.stroke();
            ctx.setLineDash([]); // 점선 초기화

            // 주 경계 대상이 없을 때만 주/보조 경계 방향을 그립니다.
            if (!this.primaryCombatTarget) {
                // 주 경계 방향 (초록색)
                ctx.strokeStyle = 'green';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(centerX + Math.cos(this.primaryDirection) * lineLength, centerY + Math.sin(this.primaryDirection) * lineLength);
                ctx.stroke();

                // 보조 경계 방향 (주황색)
                ctx.strokeStyle = 'orange';
                ctx.lineWidth = 2;
                this.secondaryDirections.forEach(dir => {
                    const angle = dir.currentAngle;
                    ctx.beginPath();
                    ctx.moveTo(centerX, centerY);
                    ctx.lineTo(centerX + Math.cos(angle) * lineLength, centerY + Math.sin(angle) * lineLength);
                    ctx.stroke();
                });
            }
            ctx.restore();
        }
        
        // Display squad type
        if (this.nemos.length) {
            ctx.save();
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';

            ctx.fillText(this.type, x + w / 2, y - 10);
            ctx.restore();
        }

        // Draw Health Bar
        if (this.nemos.length) {
            ctx.save();

            // Health Bar Dimensions
            const barWidth = 8;
            const barHeight = 40;
            const barX = x + w + 5; // Position to the right of the squad
            const barY = y;

            // Calculate health ratios
            const organizationRatio = this.calculateOrganization();
            const durabilityRatio = this.calculateDurability() / this.getMaxDurability();

            // Draw Durability Bar (Light Brown)
            ctx.fillStyle = 'peru'; // Light Brown
            ctx.fillRect(barX + barWidth, barY + (1 - durabilityRatio) * barHeight, barWidth, durabilityRatio * barHeight);

            // Draw Organization Bar (Green)
            ctx.fillStyle = 'green';
            ctx.fillRect(barX, barY + (1 - organizationRatio) * barHeight, barWidth, organizationRatio * barHeight);

            // Health Bar Outline
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth * 2, barHeight);

            ctx.restore();
        }
    }
}

class SquadManager {
    constructor(gridCellSize = 40) {
        this.squads = [];
        this.cellSize = gridCellSize;
        this.linkDist = this.cellSize * 15;
        this.maxGroup = this.cellSize * 40;
    }

    // Get random member of a squad
    getRandomSquadMember(squad) {
        if (!squad || !squad.nemos || squad.nemos.length === 0) {
            return null; // Or handle the case where the squad is empty
        }
        const randomIndex = Math.floor(Math.random() * squad.nemos.length);
        return squad.nemos[randomIndex];
    }

    applyDamageToSquad(squad, damage) {
        const targetMember = this.getRandomSquadMember(squad);
        if (targetMember) {
            // TODO: targetMember.takeDamage(damage);
        }    }

    mergeSelectedSquads() {
        const selected = this.squads.filter(s => s.selected);

        // 선택된 스쿼드가 2개 미만이면 병합하지 않습니다.
        if (selected.length < 2) return;

        // 첫 번째 선택된 스쿼드의 팀을 기준으로 병합 가능한 스쿼드만 필터링합니다.
        const team = selected[0].team;
        const sameTeamSquads = selected.filter(s => s.team === team);
        
        // 같은 팀 스쿼드가 2개 미만이면 병합하지 않습니다.
        if (sameTeamSquads.length < 2) return;
        
        const newNemos = [];
        sameTeamSquads.forEach(s => { newNemos.push(...s.nemos); s.nemos = []; });
        this.squads = this.squads.filter(s => !s.selected);
        
        const newSquad = new Squad(newNemos, team, this.cellSize);
        newSquad.nemos.forEach(n => n.squad = newSquad);
        newSquad.selected = true;
        this.squads.push(newSquad);
        return newSquad;
    }
    
    /**
     * 공격 대상 스쿼드로부터 우선순위가 높은 타겟 목록과 확률을 반환합니다.
     * @param {Squad} attackingSquad - 공격하는 스쿼드
     * @param {Squad} targetSquad - 공격받는 스쿼드
     * @returns {{targets: Nemo[], probabilities: number[]}} - 타겟 네모 객체 배열과 각 타겟에 대한 공격 확률 배열
     */
    getPrioritizedTargets(attackingSquad, targetSquad) {
        if (!attackingSquad || !targetSquad || targetSquad.nemos.length === 0) {
            return { targets: [], probabilities: [] };
        }

        const attackerCenter = attackingSquad.leader ? { x: attackingSquad.leader.x, y: attackingSquad.leader.y } : { x: 0, y: 0 };

        // 1. 적 스쿼드의 네모들을 정렬합니다.
        //    - 주 기준: formationLine (오름차순, 앞 대열부터)
        //    - 부 기준: 공격 스쿼드 리더와의 거리 (오름차순, 가까운 순)
        const sortedNemos = [...targetSquad.nemos].sort((a, b) => {
            if (a.formationLine !== b.formationLine) {
                return a.formationLine - b.formationLine;
            }
            const distA = Math.hypot(a.x - attackerCenter.x, a.y - attackerCenter.y);
            const distB = Math.hypot(b.x - attackerCenter.x, b.y - attackerCenter.y);
            return distA - distB;
        });

        // 2. 대상 수를 적 스쿼드 네모 수의 절반으로 제한합니다. (최소 1명)
        const targetCount = Math.max(1, Math.ceil(targetSquad.nemos.length / 2));
        const prioritizedTargets = sortedNemos.slice(0, targetCount);

        // 3. 각 타겟에 대한 공격 확률을 계산합니다.
        //    - 우선순위가 높을수록 (배열 인덱스가 낮을수록) 높은 확률을 가집니다.
        const weights = prioritizedTargets.map((_, i) => targetCount - i);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);

        if (totalWeight === 0) {
            return { targets: prioritizedTargets, probabilities: [] };
        }

        const probabilities = weights.map(w => w / totalWeight);

        return { targets: prioritizedTargets, probabilities };
    }


    // Build squads from given nemos array
    updateSquads(nemos) {
        // 1. 각 스쿼드의 내부 상태를 먼저 업데이트 (리더 재임명 등)
        this.squads.forEach(s => {
            s.update();
        });

        // 스쿼드별 주 경계 대상 및 정면 전투 상태 설정
        this.squads.forEach(squad => {
            let nearestEnemySquad = null;
            const recognitionRange = squad.calculateRecognitionRange(); // 스쿼드의 고유 인식 범위 계산
            let minDistance = recognitionRange; 

            // 바운드와 방향을 적 탐지 전에 업데이트
            squad.updateBounds();
            squad.updateDirections();

            this.squads.forEach(otherSquad => {
                if (squad.team !== otherSquad.team) {
                    const squadCenterX = squad.bounds.x + squad.bounds.w / 2;
                    const squadCenterY = squad.bounds.y + squad.bounds.h / 2;
                    const otherSquadCenterX = otherSquad.bounds.x + otherSquad.bounds.w / 2;
                    const otherSquadCenterY = otherSquad.bounds.y + otherSquad.bounds.h / 2;

                    const distance = Math.hypot(squadCenterX - otherSquadCenterX, squadCenterY - otherSquadCenterY);

                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestEnemySquad = otherSquad;
                    }
                }
            });

            squad.primaryCombatTarget = nearestEnemySquad;
            squad.isEngaging = !!nearestEnemySquad; // 적이 있으면 전투 상태로 설정
        });

        // 정면 전투 상태 확인
        this.squads.forEach(squad => {
            squad.isHeadOnBattle = false;
            squad.secondaryCombatTargets = [];
            squad.vigilanceBattleTarget = null;
            squad.responseBattleTarget = null;
            squad.isResponseAttacker = false;

            if (squad.primaryCombatTarget && squad.primaryCombatTarget.primaryCombatTarget === squad) {
                squad.isHeadOnBattle = true;
            }

            // 나를 주 경계 대상으로 삼는 다른 스쿼드들을 찾는다.
            this.squads.forEach(otherSquad => {
                if (otherSquad.team !== squad.team) {
                    const isOtherPrimaryTargetingMe = otherSquad.primaryCombatTarget === squad;
                    const isMyPrimaryTargetingOther = squad.primaryCombatTarget === otherSquad;

                    if (isOtherPrimaryTargetingMe && !isMyPrimaryTargetingOther) {
                        // Case: 다른 스쿼드가 나를 주 경계 대상으로 삼았지만, 나는 그렇지 않음.
                        // 이것이 기존의 '보조 경계 대상' (방어적 교전) 입니다.
                        // 이 상태는 이제 '대응 전투 상태'로 처리됩니다.
                        squad.responseBattleTarget = otherSquad;
                        squad.isResponseAttacker = false; // 나는 방어자
                        otherSquad.responseBattleTarget = squad;
                        otherSquad.isResponseAttacker = true; // 상대는 공격자
                    }
                }
            });
        });

        // 경계 전투 상태 확인 (상호 보조 경계)
        // 이 로직은 보조 경계 대상을 별도로 지정하는 기능이 추가된 후에 구현해야 합니다.
        // 현재는 primaryCombatTarget만 있으므로, 이 부분은 개념적으로만 남겨둡니다.
        // 예: if (squad.secondaryTarget === otherSquad && otherSquad.secondaryTarget === squad) {
        //         squad.vigilanceBattleTarget = otherSquad;
        //         otherSquad.vigilanceBattleTarget = squad;
        //     }
        // 현재 로직에서는 '대응 전투 상태'가 기존 '보조 경계 대상'의 역할을 대신합니다.
        // '경계 전투' 시각화 코드는 추가되었지만, 트리거 조건이 없어 아직 표시되지 않습니다.
    }

    draw(ctx) {
        this.squads.forEach(g => g.draw(ctx));
    }

}



export { SquadSizes };
export { SquadManager, Squad };
