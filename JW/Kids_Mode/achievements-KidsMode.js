function updateAchievements() {
	const progression = syncProgressionFromActivity();
    renderProgressionSummary(progression.state);
    renderLatestAchievement(progression.state);
    return progression.state;
}

function displayLatestAchievement(state = loadProgressionState()) {
    renderLatestAchievement(state);
}

function updateBadges(state = loadProgressionState()) {
    reconcileBadgeState(state);
    saveProgressionState(state);
    renderBadgeCollection(state);
    return state;
}
