class TeamManager {
    constructor(team) {
        this.team = team;
        this.minerals = 0;
    }

    addMinerals(amount = 1) {
        this.minerals += amount;
    }

    getMinerals() {
        return this.minerals;
    }
}

const TeamManagers = {
    blue: new TeamManager('blue'),
    red: new TeamManager('red')
};

export { TeamManager, TeamManagers };
