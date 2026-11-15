function init_achievements() {
	const progression = syncProgressionFromActivity();
	renderProgressionSummary(progression.state);
	renderAchievementCollection(progression.state);
	renderBadgeCollection(progression.state);
}