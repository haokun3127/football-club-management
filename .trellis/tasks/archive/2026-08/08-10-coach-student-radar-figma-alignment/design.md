# C13 design

C13 reads the existing scoped coach-team list then the scoped student-radar endpoint. The selected route id is intersected with team members, falling back to the first real member. The API normalizer preserves only the optional source `record.occurredAt`; it never infers it. A monotonically increasing request token guards both prior successes and failures. Figma feedback has no BFF contract, so C13 shows an unavailable state instead of manufacturing a coach comment.
