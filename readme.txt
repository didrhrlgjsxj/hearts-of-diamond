게임 메카닉 설명
================================

### 1. 부대 능력치 (Unit Stats)

모든 부대의 능력치는 가장 작은 단위인 분대(Squad)의 능력치를 합산하여 동적으로 결정됩니다.

*   **화력 (Firepower)**: 적의 조직력(초록색 바)에 가하는 피해량을 결정합니다. 화력이 높을수록 적의 전투 효율을 빠르게 떨어뜨릴 수 있습니다.

*   **대인 공격력 (Soft Attack)**: 장갑이 없거나 낮은 '소프트' 타겟(보병 등)에게 가하는 병력(주황색 바) 피해량을 결정합니다.

*   **대물 공격력 (Hard Attack)**: 장갑이 높은 '하드' 타겟(기갑 등)에게 가하는 병력 피해량을 결정합니다. 적의 장갑을 관통하는 데 사용됩니다.

*   **정찰력 (Reconnaissance)**: 적을 발견하는 능력입니다. 이 능력치가 높을수록 적을 더 멀리서 탐지할 수 있습니다. (현재는 `detectionRange`로 구현)
*   **내구력 (Strength)**: 부대의 HP와 같은 개념입니다. 이 수치가 0이 되면 부대는 파괴됩니다.

*   **장갑 (Armor)**: 적의 공격으로부터 부대를 보호하는 능력입니다. 특히 대인 공격력에 의한 피해를 크게 감소시키며, 대물 공격력에 의한 피해도 일부 막아냅니다. 상위 부대의 장갑 수치는 소속된 모든 분대의 장갑 평균값으로 계산됩니다.
*   **조직력 (Organization)**: 부대의 전투 지속력을 나타냅니다. 조직력이 높은 부대는 전투 시 받는 피해의 대부분을 흡수하여 내구력 손실을 최소화합니다. 조직력이 0이 되면 부대는 전투를 효율적으로 수행할 수 없으며, 받는 내구력 피해가 급증합니다. 전투 중에는 조직력 회복이 매우 느려집니다.
*   **기갑화율 (Hardness)**: 부대가 얼마나 '기갑화'되었는지를 나타내는 비율(0%~100%)입니다. 보병은 0%, 기갑은 100%에 가깝습니다. 공격자는 방어자의 기갑화율을 보고 대인/대물 공격력의 효율을 조절합니다.

---

### 2. 유닛 타입별 특성 (Unit Type Specializations)

모든 부대의 기본 구성 단위는 분대(Squad)이며, 각 분대는 고유한 타입을 가집니다.

*   **보병 (Infantry)**: 부대의 최대 조직력을 크게 증가시켜 전투 지속력을 높입니다.
*   **정찰 (Recon)**: 정찰력이 매우 높아 넓은 시야를 제공합니다.
*   **기갑 (Armor)**: 높은 장갑, 화력, 공격력을 모두 갖춘 강력한 유닛입니다.
*   **포병 (Artillery)**: 화력에 극도로 특화되어 있어 적의 조직력을 파괴하는 데 매우 효과적입니다.
*   **공병 (Engineer)**: 대물 공격력이 매우 높아 적의 장갑화된 유닛이나 방어 시설을 파괴하는 데 특화되어 있습니다.

---

### 3. 전투 및 피해 계산 시스템 (Combat & Damage Calculation)

전투는 턴(Turn) 기반으로 진행되며, 각 중대는 자신의 공격 주기(`attackCooldown`)마다 공격을 수행합니다.

1.  **공격력 계산**:
    *   공격자는 먼저 방어자의 `기갑화율`을 확인합니다.
    *   `대인 공격력`과 `대물 공격력`을 기갑화율에 맞춰 조합하여 '유효 공격력'을 계산합니다.
    *   '유효 공격력'에서 방어자의 `장갑` 수치를 빼서 최종 '총 공격력'을 결정합니다.

2.  **피해 분배 (조직력의 보호막 역할)**:
    *   방어자의 `조직력`은 보호막처럼 작동하여 '총 공격력'의 일정 비율을 흡수합니다. 이 흡수율은 조직력이 높을수록(최대 90%) 높고, 낮을수록(최소 10%) 낮아집니다.
    *   조직력이 흡수한 피해는 조직력(초록색 바)을 감소시킵니다.
    *   조직력이 흡수하지 못한 나머지 피해는 `내구력`(주황색 바)을 직접 감소시킵니다.

3.  **화력의 역할**:
    *   공격자의 `화력`은 위의 피해 계산과 별개로, 방어자의 조직력에 직접적인 추가 피해를 입힙니다.

4.  **전투 유형**:
    *   **정면 전투 (빨간색 선)**: 두 중대가 서로를 공격 대상으로 지정한 경우입니다.
    *   **측면 전투 (파란색 선)**: 한 중대가 자신을 공격하지 않는 적을 일방적으로 공격하는 경우입니다.
    *   **자동 반격**: 측면 공격을 하던 중대가 다른 적에게 공격을 받으면, 자신을 공격하는 적이 사거리 내에 있을 경우 즉시 그 적을 향해 반격하여 정면 전투로 전환합니다.

---

### 4. 부대 역할 및 시각적 표현 (Unit Roles & Visual Rules)

이 게임에서 부대는 역할에 따라 '지휘 부대'와 '전투 부대'로 나뉩니다. 모든 부대는 사각형 아이콘으로 표시되며, 아이콘의 배경색은 소속된 팀(블루/레드)을 나타냅니다.

*   **전투 부대 (Combat Unit)**: **중대(Company)**가 이 게임의 실질적인 전투 수행 단위입니다. 모든 공격, 방어, 피해 계산은 중대를 기준으로 이루어집니다. 따라서 중대 아이콘은 불투명하게 표시되어 전장에서 명확하게 식별됩니다.

*   **지휘 부대 (Command Unit)**: **사단(Division)**, **여단(Brigade)**, **연대(Regiment)**, **대대(Battalion)**는 직접 전투를 수행하지 않는 지휘 부대입니다. 이들의 주된 역할은 하위 부대들을 하나의 단위로 묶어 관리하고, 소속된 부대들에게 지휘 보너스나 특수 능력(향후 추가될 기능)을 제공하는 것입니다.
    *   지휘 부대는 여러 목적(보병, 기갑, 포병 등)을 가진 중대들을 조합하여 편성할 수 있는 '컨테이너'와 같습니다.
    *   이러한 역할을 시각적으로 나타내기 위해, 지휘 부대의 아이콘은 **매우 반투명하게** 표시되어 실제 전투 부대와 명확히 구분됩니다.

### 5. 진형 시스템 (Formation System)

*   **본부(HQ) 중심**: 모든 지휘 부대는 '본부(HQ)' 역할을 하는 중대를 가집니다. 지휘 부대의 실제 위치는 항상 본부 중대의 위치를 따라갑니다.
*   **역할 기반 배치**: 휘하의 다른 부대들은 '선봉', '주력', '예비' 등의 역할을 부여받습니다.
*   **기본 진형**: 지휘 부대에 이동 명령을 내리면, 본부 중대가 목표 지점으로 이동하고 나머지 부대들은 본부를 중심으로 자신의 역할에 맞는 기본 진형을 유지하며 자동으로 따라갑니다. 부대는 항상 특정 방향(이동 방향 또는 적 방향)을 바라봅니다.
*   **커스텀 진형**: 플레이어가 지휘 부대 휘하의 부대(예: 대대)를 직접 선택하여 이동시키면, 그 상위 부대는 '커스텀 진형' 상태가 됩니다. 이 상태에서는 부대들이 기본 진형으로 돌아가지 않고, 사용자가 수정한 상대적인 배치를 유지한 채로 함께 움직입니다.
*   **진형 복귀**: 상위 부대를 선택하고 '기본 진형으로 복귀' 버튼을 누르면, 모든 하위 부대들은 다시 기본 진형 위치로 재배치됩니다.

### 6. 시각적 표현 (Visuals)

*   **규모별 크기 및 기호**: 부대의 규모(Echelon)가 클수록 아이콘의 크기가 커지며, 각 아이콘 위에는 부대의 규모를 나타내는 표준 군대 기호가 표시됩니다 (XX: 사단, X: 여단, ||: 대대, |: 중대 등).
*   **상태 표시**: 부대 아이콘 위의 주황색 바는 **내구력**을, 초록색 바는 **조직력**을 나타냅니다.




Game Terminology Glossary

This file explains the key terms used in the game's code and logic.

--- Squad Mechanics ---

x 주 경계 대상 (Primary Combat Target): A squad's highest priority enemy squad. The squad orients itself towards this target. It's typically the nearest enemy squad within recognition range.

x 보조 경계 대상 (Secondary Combat Targets): Enemy squads that have designated this squad as their 'Primary Combat Target'. This is used for defensive engagements when not in a head-on battle.

x 정면 전투 상태 (Head-on Battle): A state where two opposing squads have designated each other as their Primary Combat Target. This is visualized with arrows pointing at each other.

x 주 경계 방향 (Primary Direction): The main forward-facing direction of a squad. It aligns with the 'Target Direction' and influences the squad's formation and defensive orientation.

x 보조 경계 방향 (Secondary Directions): Additional directions, typically to the flanks, that the squad monitors, in addition to its primary direction.

x 목표 이동 방향 (Target Direction): The actual direction the squad is moving, or the direction towards the Primary Combat Target. The 'Primary Direction' smoothly interpolates towards this angle.

x 스쿼드 전체 목표 지점 (Squad Destination): A single destination point for the entire squad, as opposed to individual unit destinations. Used for formation movement.

x 진형 위치 (Formation Positions): The relative positions that individual units (Nemos) should maintain within the squad's formation while moving.

x 스쿼드의 가상 중심 (Squad Center): A logical center point that acts as the anchor for the squad's formation. When a squad moves, this virtual center travels to the destination.

x 조직력 (Organization): A metric representing a squad's combat effectiveness, calculated based on the average health of its units. Represented by the green part of the squad's health bar.

x 내구도 (Durability): A metric representing the total combined health of all units in a squad. Represented by the brown part of the squad's health bar.

x 스쿼드 규모 (Squad Sizes): Classification of a squad's size based on its composition (SQUAD, TROOP, PLATOON, COMPANY).

--- Unit & General Mechanics ---

x 적 감지 범위 (Recognition Range): The maximum distance at which a unit can detect an enemy and automatically engage in combat.

x 공격 이동 (Attack Move): A command ('A' key + click) that orders units to move to a location while automatically attacking any enemies they encounter along the way.

x On-hand / Off-hand 무기: 'On-hand' refers to a primary weapon held by a unit. 'Off-hand' refers to secondary weapons mounted on the unit's body that can rotate and fire independently.

x 발사 반동 (Recoil Offset): A visual effect where a weapon platform recoils backward upon firing.

x 고스트 유닛/건물 (Ghost Unit/Building): A translucent preview of a unit or building that follows the mouse cursor before placement, allowing the player to see where it will be built.

x 채광 명령 (Mine Key): A state ('M' key or UI button) that prepares a worker unit to receive a mining command on a mineral patch.