class InfoPanels {
    constructor(gameUI) {
        this.gameUI = gameUI;
        
        this.compositionPanel = this.createPanel('composition-panel');
        this.statsPanel = this.createPanel('stats-panel');
        this.provinceInfoPanel = this.createPanel('province-info-panel');
        this.battlePanel = this.createPanel('battle-panel');
    }

    createPanel(id) {
        const div = document.createElement('div');
        div.id = id;
        document.body.appendChild(div);
        this.gameUI.addUIElementListener(div);
        if (id !== 'battle-panel') this.updatePanel(div, null);
        return div;
    }

    updatePanel(panel, content) {
        if (!content) {
            panel.innerHTML = '';
            panel.style.display = 'none';
        } else {
            panel.innerHTML = content;
            panel.style.display = 'block';
        }
    }

    updateCompositionPanel(unit) {
        if (!unit) {
            this.updatePanel(this.compositionPanel, null);
            return;
        }

        const allCompanies = unit.getAllCompanies();
        const composition = {};

        for (const company of allCompanies) {
            const squads = company.getAllSquads();
            squads.forEach(squad => {
                if (!composition[squad.type]) {
                    composition[squad.type] = { active: 0, total: 0 };
                }
                composition[squad.type].total++;
                if (!squad.isDestroyed) {
                    composition[squad.type].active++;
                }
            });
        }
        let html = `<h3>부대 구성</h3>`;
        if (Object.keys(composition).length > 0) {
            html += '<ul>';
            Object.entries(composition).forEach(([type, counts]) => {
                const typeNameMap = {
                    'INFANTRY': '보병', 'ARMOR': '기갑', 'RECON': '정찰', 'ARTILLERY': '포병', 'ENGINEER': '공병'
                };
                const displayName = typeNameMap[type] || type;
                html += `<li>${displayName}: ${counts.active} / ${counts.total}</li>`;
            });
            html += '</ul>';
        }
        this.updatePanel(this.compositionPanel, html);
    }

    updateStatsPanel(unit) {
        if (!unit) {
            this.updatePanel(this.statsPanel, null);
            return;
        }

        const statsToShow = {
            '조직력': `${Math.floor(unit.organization)} / ${Math.floor(unit.maxOrganization)}`,
            '내구력': `${Math.floor(unit.currentStrength)} / ${Math.floor(unit.baseStrength)}`,
            '---': '---',
            '이동 속도': unit.moveSpeed.toFixed(1),
            '직접 화력': unit.directFirepower.toFixed(1),
            '간접 화력': unit.indirectFirepower.toFixed(1),
            '대인 공격': unit.softAttack.toFixed(1),
            '대물 공격': unit.hardAttack.toFixed(1),
            '장갑': unit.armor.toFixed(2),
            '기갑화율': `${(unit.hardness * 100).toFixed(0)}%`,
            '정찰': unit.reconnaissance.toFixed(1),
            '조직 방어': unit.organizationDefense.toFixed(1),
            '단위 방어': unit.unitDefense.toFixed(1),
        };

        let html = `<h3>${unit.name} 능력치</h3><ul>`;
        Object.entries(statsToShow).forEach(([name, value]) => {
            if (name === '---') {
                html += `<li style="margin: 5px 0; border-top: 1px solid #ccc;"></li>`;
            } else {
                html += `<li><span>${name}</span><span>${value}</span></li>`;
            }
        });
        html += '</ul>';
        this.updatePanel(this.statsPanel, html);
    }

    updateProvinceInfoPanel(province) {
        if (!province) {
            this.updatePanel(this.provinceInfoPanel, null);
            return;
        }

        const ownerName = province.owner ? province.owner.name : '중립';
        const ownerColor = province.owner ? province.owner.color.replace('0.3', '1.0') : '#888';

        let html = `<h3>프로빈스 정보</h3><ul>`;
        html += `<li><span>ID</span><span>${province.id}</span></li>`;
        html += `<li><span>크기</span><span>${province.tiles.length} 타일</span></li>`;
        html += `<li><span>소유</span><span style="color: ${ownerColor}; font-weight: bold;">${ownerName}</span></li>`;

        if (province.resources && Object.keys(province.resources).length > 0) {
            html += `<li style="margin-top: 10px; border-top: 1px solid #ccc;"></li><h4>자원</h4>`;
            Object.entries(province.resources).forEach(([key, amount]) => {
                const resourceName = RESOURCE_TYPES[key]?.name || key;
                html += `<li><span>${resourceName}</span><span>${amount}</span></li>`;
            });
        }
        html += '</ul>';
        this.updatePanel(this.provinceInfoPanel, html);
    }

    updateBattlePanel(battle) {
        if (!battle || battle.unitA.isDestroyed || battle.unitB.isDestroyed) {
            this.battlePanel.style.display = 'none';
            return;
        }

        const midX = (battle.unitA.x + battle.unitB.x) / 2;
        const midY = (battle.unitA.y + battle.unitB.y) / 2;
        const screenPos = this.gameUI.camera.worldToScreen(midX, midY);

        this.battlePanel.style.display = 'block';
        this.battlePanel.style.left = `${screenPos.x}px`;
        this.battlePanel.style.top = `${screenPos.y}px`;
        this.battlePanel.style.transform = 'translate(-50%, -50%)';

        this.battlePanel.innerHTML = `
            <div class="battle-indicator"></div>
            <div class="battle-details">
                <div class="battle-unit-display" style="color: ${battle.unitA.team === 'blue' ? '#6495ED' : '#FF6347'};">
                    ${this.getUnitBattleHTML(battle.unitA)}
                </div>
                <div class="battle-unit-display" style="color: ${battle.unitB.team === 'blue' ? '#6495ED' : '#FF6347'}; text-align: right;">
                    ${this.getUnitBattleHTML(battle.unitB)}
                </div>
            </div>
        `;
    }

    getUnitBattleHTML(unit) {
        // Simplified for brevity, logic same as original
        const orgPercent = (unit.organization / unit.maxOrganization * 100).toFixed(1);
        const strPercent = (unit.currentStrength / unit.baseStrength * 100).toFixed(1);
        return `<h4>${unit.name}</h4><div>Org: ${Math.floor(unit.organization)}</div><div>Str: ${Math.floor(unit.currentStrength)}</div>`;
    }
}