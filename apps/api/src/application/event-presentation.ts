import type { ApiStore } from "../store.js";
import { buildTrainingContentTree } from "./training-content-catalog.js";
import { summarizeSelectedTraining } from "./training-content-summary.js";

type NamedObject = { id: string; name: string };
type TrainingSummary = ReturnType<typeof summarizeSelectedTraining>;

export interface EventPresentation {
  startsAt: string;
  endsAt: string;
  team: NamedObject | null;
  venue: NamedObject | null;
  coach: NamedObject | null;
  training: null | TrainingSummary & {
    state: "planned" | "not_arranged" | "unavailable";
    summary: string;
    abilityTags: string[];
  };
}

interface PresentationSource {
  id: string;
  clubId: string;
  type: string;
  timeRange: { startsAt: string; endsAt: string };
  primaryTeamId?: string;
  locationId?: unknown;
  ownerCoachId?: unknown;
}

/** Call only after event authorization. This projection never includes roster or private coach data. */
export async function presentEvent(
  store: ApiStore,
  event: PresentationSource,
  selectedTraining?: TrainingSummary,
): Promise<EventPresentation> {
  const team = store.listTeams(event.clubId).find(item => item.id === event.primaryTeamId);
  const venue = (await store.listVenues(event.clubId)).find(item => item.id === event.locationId);
  const coach = store.listCoaches(event.clubId).find(item => item.id === event.ownerCoachId);
  let training: EventPresentation["training"] = null;
  if (event.type === "training") {
    const session = store.getTrainingSessionByEvent(event.clubId, event.id);
    const plan = session?.sessionPlanId ? store.getSessionPlan(session.sessionPlanId) : null;
    let summary = selectedTraining;
    if (!summary) {
      const drills = store.listTrainingDrills(event.clubId);
      const metrics = await store.listAbilityMetrics(event.clubId);
      summary = summarizeSelectedTraining(plan, drills, buildTrainingContentTree({
        views: store.listMetricViews(event.clubId),
        viewNodes: store.listMetricViewNodes(event.clubId),
        metrics,
        drills,
      }));
    }
    const unavailable = Boolean(session?.sessionPlanId && (!plan || (plan.blocks.length > 0 && summary.count === 0)));
    training = {
      ...summary,
      state: unavailable ? "unavailable" : summary.count ? "planned" : "not_arranged",
      summary: summary.groups.flatMap(group => group.items.map(item => item.name)).join("、"),
      abilityTags: summary.groups.map(group => group.label).filter(label => label !== "未配置分类"),
    };
  }
  return {
    startsAt: event.timeRange.startsAt,
    endsAt: event.timeRange.endsAt,
    team: team ? { id: team.id, name: team.name } : null,
    venue: venue ? { id: venue.id, name: venue.name } : null,
    coach: coach ? { id: coach.id, name: coach.name } : null,
    training,
  };
}
