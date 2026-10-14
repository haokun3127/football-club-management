import type { DatabaseSync } from "node:sqlite";
import type { TrainingTemplate, TrainingTemplateStore } from "../application/training-templates.js";
export class TrainingTemplateRepository implements TrainingTemplateStore {
  constructor(private readonly database: DatabaseSync) {}
  list(clubId: string): TrainingTemplate[] {
    return (this.database.prepare("SELECT payload_json FROM training_templates WHERE club_id=? ORDER BY updated_at DESC,id").all(clubId) as Array<{payload_json:string}>).map(row => JSON.parse(row.payload_json) as TrainingTemplate);
  }
  save(value: TrainingTemplate) {
    this.database.prepare("INSERT INTO training_templates(id,club_id,owner_user_id,visibility,payload_json,updated_at) VALUES(?,?,?,?,?,?)").run(value.id,value.clubId,value.ownerUserId,value.visibility,JSON.stringify(value),value.updatedAt);
    return this.list(value.clubId).find(item => item.id === value.id)!;
  }
}
