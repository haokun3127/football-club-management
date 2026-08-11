# C14 Layout Design

Figma `93:1106` uses a 520px (1040rpx) dark summary card, not the current 520rpx card. The radar plot is a fixed 320px visual inside a 360px area. The current 520rpx hero and independently absolute score create insufficient vertical space and explain the observed overlap.

The page will retain the real `RadarMetricPoint[]` from `getCoachTeamAbilityOverview()`. The template will select either the radar composition (radar plus its API-derived overall result/trend) or a dedicated empty plot. Score/trend will not appear in the empty branch. C14 has no ranking-name contract, so its ranking card remains an explicit unavailable state.
