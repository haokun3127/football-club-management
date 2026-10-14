import type { ApiStore } from "../store.js";
export function coachTeamRole(store:ApiStore,clubId:string,coachId:string,teamId:string) {
  const team=store.listTeams(clubId).find(item=>item.id===teamId&&item.status==="active");
  if(!team)return null;
  if(team.defaultCoachId===coachId)return "head_coach";
  return store.listCoachAssignments(clubId).find(item=>item.teamId===teamId&&item.coachId===coachId)?.role ?? null;
}
