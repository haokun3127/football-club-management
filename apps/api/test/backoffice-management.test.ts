import ExcelJS from "exceljs";
import {assessmentWorkflow} from "../src/application/assessment-workflow.js";
import {AssessmentMappingRepository} from "../src/persistence/assessment-mapping-repository.js";
import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashBackofficePassword } from "../src/auth/backoffice.js";
import { createProductionMembershipResolver } from "../src/auth/context.js";
import { readBackofficeConfig } from "../src/runtime/backoffice.js";
import { createPlatformPersistence } from "../src/persistence/platform-persistence.js";
import { PersistentApiStore } from "../src/store.js";
import { buildServer } from "../src/server.js";
const clubId = "club-chongqing-talent",
  password = "synthetic-management-password",
  headers = {
    "x-fcm-environment": "develop",
    origin: "https://club.example",
    referer: "https://club.example/__env/develop/backoffice/",
  };
const passwordHash = hashBackofficePassword(password);
async function fixture(databasePath = ":memory:", seed = true) {
  const p = await createPlatformPersistence({
    databasePath,
    seed,
    identityKeyring: {
      activeVersion: "test",
      keys: [
        {
          version: "test",
          digestKey: "a".repeat(64),
          encryptionKey: "b".repeat(64),
        },
      ],
    },
  });
  const store = new PersistentApiStore(p.repositories);
  const server = buildServer(store, {
    logger: false,
    membershipResolver: createProductionMembershipResolver(
      p.repositories.users,
      p.repositories.memberships,
    ),
    runtimeConfig: {
      environment: "develop",
      databasePath,
      backoffice: readBackofficeConfig(
        "develop",
        "https://club.example/__env/develop/backoffice",
      )!,
    },
  });
  await p.repositories.backofficeAuth.provision({
    clubId,
    userId: "user-admin-1",
    username: "manager",
    passwordHash: await passwordHash,
  });
  const signed = await server.inject({
    method: "POST",
    url: "/backoffice/api/login",
    headers,
    payload: { clubId, username: "manager", password },
  });
  expect(signed.statusCode).toBe(200);
  const cookie = String(signed.headers["set-cookie"]).split(";")[0]!;
  return {
    p,
    store,
    server,
    request: (
      method: "GET" | "POST" | "PUT",
      path: string,
      payload?: unknown,
      extra = {},
    ) =>
      server.inject({
        method,
        url: `/backoffice/api/${path}`,
        headers: { ...headers, cookie, ...extra },
        ...(payload === undefined ? {} : { payload }),
      }),
    close: async () => {
      await server.close();
      p.database.close();
    },
  };
}
const saveBody = (values: unknown, expectedRevision: string | null = null) => ({
  values,
  expectedRevision,
  requestId: randomUUID(),
});
describe("browser backoffice management", () => {
  it('builds actual workbench tasks, upcoming leave counts and scoped demand totals',async()=>{
    const f=await fixture();try{
      const original=(await f.request('GET','resources/events')).json().rows[0];const startsAt=new Date(Date.now()+86400000).toISOString(),endsAt=new Date(Date.now()+90000000).toISOString();
      const created=await f.request('POST','resources/events',saveBody({...original.values,title:'合成近期活动',startsAt,endsAt,status:'scheduled'}));expect(created.statusCode,created.body).toBe(200);
      const originalPerson=(await f.request('GET','resources/participants')).json().rows[0];const person=await f.request('POST','resources/participants',saveBody({...originalPerson.values,eventId:created.json().id,status:'excused'}));expect(person.statusCode,person.body).toBe(200);
      const response=await f.request('GET','workbench');expect(response.statusCode,response.body).toBe(200);expect(response.json().upcoming.find((row:{id:string})=>row.id===created.json().id)).toMatchObject({title:'合成近期活动',leaveCount:1});expect(response.json().pendingServices).toBeNull();expect(response.json().counts.students).toBe(f.store.listStudents(clubId).length);
    }finally{await f.close()}
  });

  it('retains distinct legacy source identities for identical payloads and replays stable raw ids',async()=>{
    const f=await fixture();try{
      const config=f.store.getDataCapabilityConfig(clubId),mapping=config.tableMappings[0]!;const input={connectionId:mapping.connectionId,tableMappingId:mapping.id,sourceName:'合成来源',records:[{rowNumber:2,rowHash:'same-payload',externalRecordId:'first',raw:{name:'same'}},{rowNumber:3,rowHash:'same-payload',externalRecordId:'second',raw:{name:'same'}}]};
      const staged=f.store.stageExternalImport(clubId,input);expect(new Set(staged.records.map(row=>row.id)).size).toBe(2);expect(f.store.stageExternalImport(clubId,input).records.map(row=>row.id)).toEqual(staged.records.map(row=>row.id));
    }finally{await f.close()}
  });

  it("encrypts scout previews, reopens confirmation and prevents identity or grant bypass",async()=>{
    const directory=mkdtempSync(join(tmpdir(),'backoffice-scout-import-')),path=join(directory,'facts.sqlite');let f=await fixture(path);
    try{
      f.p.repositories.backofficeManagement.replaceGrants(clubId,'user-admin-1',['sensitive','export']);
      const book=new ExcelJS.Workbook();book.addWorksheet('导入').addRows([['externalId','name','identityNumber'],['11010519491231002X','合成批量球探','11010519491231002X'],['invalid','错误身份','110105194912310021']]);
      const input={resourceKey:'scouts',sourceName:'合成加密来源',fileName:'scouts.xlsx',blankPolicy:'preserve',contentBase64:Buffer.from(await book.xlsx.writeBuffer()).toString('base64'),requestId:randomUUID()};
      const before=f.store.listStudents(clubId).length;let response=await f.request('POST','imports/preview',input);expect(response.statusCode,response.body).toBe(200);let batch=response.json();expect(batch.rows.map((row:{status:string})=>row.status)).toEqual(['pending','failed']);expect(response.body).not.toContain('11010519491231002X');expect(response.body).not.toContain('110105194912310021');expect(f.store.listStudents(clubId)).toHaveLength(before);
      for(const table of ['external_raw_records','backoffice_import_batches','backoffice_mutations','backoffice_audit','backoffice_import_secrets']){expect(JSON.stringify(f.p.database.prepare(`SELECT * FROM ${table}`).all())).not.toContain('11010519491231002X');expect(JSON.stringify(f.p.database.prepare(`SELECT * FROM ${table}`).all())).not.toContain('110105194912310021');}
      await f.close();f=await fixture(path,false);response=await f.request('POST',`imports/${batch.id}/confirm`,{expectedRevision:batch.revision,rowNumbers:[2,3],requestId:randomUUID()});expect(response.statusCode,response.body).toBe(200);batch=response.json();expect(batch.rows.map((row:{status:string})=>row.status)).toEqual(['success','failed']);expect(f.store.scoutPlayers.list(clubId).filter(row=>row.name==='合成批量球探')).toHaveLength(1);
      const repeated=await f.request('POST','imports/preview',{...input,requestId:randomUUID()});expect(repeated.statusCode,repeated.body).toBe(200);expect(repeated.json().rows[0].status).toBe('duplicate');expect(f.store.listStudents(clubId)).toHaveLength(before+1);
      const download=await f.request('POST',`imports/${batch.id}/failures-export`,{requestId:randomUUID()});expect(download.statusCode,download.body).toBe(200);const failed=new ExcelJS.Workbook();await failed.xlsx.load(Buffer.from(download.json().contentBase64,'base64'));expect(JSON.stringify(failed.getWorksheet('失败行')!.getRows(1,2)?.map(row=>row.values))).not.toContain('110105194912310021');
      f.p.repositories.backofficeManagement.replaceGrants(clubId,'user-admin-1',['export']);expect((await f.request('GET',`imports/${batch.id}`)).statusCode).toBe(403);expect((await f.request('POST',`imports/${batch.id}/confirm`,{expectedRevision:batch.revision,rowNumbers:[2],requestId:randomUUID()})).statusCode).toBe(403);
    }finally{await f.close();rmSync(directory,{recursive:true,force:true})}
  }, 15000);

  it("shares parent consultations, requires explicit acceptance and persists private service work across restart",async()=>{
    const directory=mkdtempSync(join(tmpdir(),'backoffice-services-')),path=join(directory,'facts.sqlite');let f=await fixture(path);
    try{
      expect((await f.request('GET','resources/service-catalog')).statusCode).toBe(403);
      f.p.repositories.backofficeManagement.replaceGrants(clubId,'user-admin-1',['service','sensitive','export']);
      const catalog=await f.request('POST','resources/service-catalog',saveBody({name:'合成私教',type:'private',introduction:'合成服务说明',status:'active',responsibleCoachIds:['coach-1']}));expect(catalog.statusCode,catalog.body).toBe(200);const serviceId=catalog.json().id;
      const parentRequest=f.store.createPrivateLessonRequest(clubId,'student-1',{coachName:'陈教练',date:'2026-10-11',timeSlot:'上午',goals:['控球'],note:'家长真实咨询',requestedByUserId:'user-parent-1'});
      let record=(await f.request('GET',`resources/consultations/${parentRequest.id}`)).json().record;
      let response=await f.request('PUT',`resources/consultations/${record.id}`,saveBody({...record.values,serviceId,responsibleCoachId:'coach-1'},record.revision));expect(response.statusCode,response.body).toBe(200);record=response.json();expect(f.store.listPrivateLessonRequests(clubId,'student-1').find(row=>row.id===record.id)?.status).toBe('pending');
      expect((await f.request('PUT',`resources/consultations/${record.id}`,saveBody({...record.values,status:'confirmed'},record.revision))).json().error.code).toBe('explicit_acceptance_required');
      const ledger=f.store.getLessonLedger(clubId,'student-1');response=await f.request('PUT',`resources/consultations/${record.id}`,saveBody({...record.values,status:'confirmed',acceptanceEvidence:'双方沟通后明确承接',internalNotes:'内部意见不可公开'},record.revision));expect(response.statusCode,response.body).toBe(200);record=response.json();
      const publicRequest=f.store.listPrivateLessonRequests(clubId,'student-1').find(row=>row.id===record.id)!;expect(publicRequest.status).toBe('confirmed');expect(JSON.stringify(publicRequest)).not.toContain('内部意见');expect(publicRequest.note).toBe('家长真实咨询');expect(f.store.getLessonLedger(clubId,'student-1')).toEqual(ledger);
      const scout=await f.request('POST','scouts',{name:'合成球探',identityNumber:'11010519491231002X',requestId:randomUUID()});expect(scout.statusCode,scout.body).toBe(200);
      const work=await f.request('POST','resources/scout-work',saveBody({name:'合成观察',scoutPlayerId:scout.json().id,responsibleCoachId:'coach-1',stage:'observing',source:'合成选材',observedAt:'2026-10-10T01:00:00Z',evidence:'观察证据',opinion:'内部球探意见'}));expect(work.statusCode,work.body).toBe(200);
      const foreign=await f.request('POST','resources/scout-work',saveBody({...work.json().values,scoutPlayerId:'foreign'}));expect(foreign.statusCode).toBe(400);
      const analysis=await f.request('POST','bi-snapshots',{topic:'services',filters:{studentId:'student-1'},requestId:randomUUID()});expect(analysis.statusCode,analysis.body).toBe(200);const snapshot=analysis.json();expect(snapshot.data.rows.some((row:{id:string})=>row.id===record.id)).toBe(true);expect(JSON.stringify(snapshot.data.rows)).not.toContain('内部意见不可公开');
      f.p.repositories.backofficeManagement.replaceGrants(clubId,'user-admin-1',['service','export']);expect((await f.request('GET',`resources/consultations/${record.id}`)).body).not.toContain('内部意见');expect((await f.request('GET','resources/scout-work')).statusCode).toBe(403);
      await f.close();f=await fixture(path,false);const additional=f.store.createPrivateLessonRequest(clubId,'student-1',{coachName:'陈教练',date:'2026-10-12',timeSlot:'下午',goals:['传球']});expect(additional.id).not.toBe(record.id);expect((await f.request('GET',`resources/consultations/${record.id}`)).json().record.values.status).toBe('confirmed');expect(f.store.listPrivateLessonRequests(clubId).find(row=>row.id===record.id)?.status).toBe('confirmed');
      f.p.repositories.backofficeManagement.replaceGrants(clubId,'user-admin-1',[]);expect((await f.request('GET',`bi-snapshots/${snapshot.id}`)).statusCode).toBe(403);expect((await f.request('POST',`bi-snapshots/${snapshot.id}/export`,{factVersion:snapshot.factVersion,requestId:randomUUID()})).statusCode).toBe(403);
    }finally{await f.close();rmSync(directory,{recursive:true,force:true})}
  });

  it("maintains enabled presentation content without exposing drafts or arbitrary optional routes",async()=>{
    const directory=mkdtempSync(join(tmpdir(),'backoffice-content-')),path=join(directory,'facts.sqlite');let f=await fixture(path);
    try{
      const theme=await f.request('POST','resources/branding',saveBody({name:'合成队徽',logoUrl:'https://club.example/logo.svg',primaryColor:'#123456',status:'active'}));expect(theme.statusCode,theme.body).toBe(200);
      expect((await f.request('POST','resources/branding',saveBody({...theme.json().values,name:'另一启用主题'}))).statusCode).toBe(409);
      expect((await f.request('POST','resources/banners',saveBody({name:'错误链接',imageUrl:'javascript:alert(1)',sortOrder:1,status:'active'}))).statusCode).toBe(400);
      const banner=await f.request('POST','resources/banners',saveBody({name:'合成展示',imageUrl:'/public/banner.png',sortOrder:1,status:'active'}));expect(banner.statusCode,banner.body).toBe(200);
      await f.request('POST','resources/banners',saveBody({name:'过期内容',imageUrl:'/public/old.png',sortOrder:0,status:'active',endsAt:'2020-01-01T00:00:00Z'}));
      const feature=await f.request('POST','resources/optional-features',saveBody({key:'records',name:'训练记录',sortOrder:1,status:'active'}));expect(feature.statusCode,feature.body).toBe(200);
      expect((await f.request('POST','resources/optional-features',saveBody({key:'arbitrary',name:'任意功能',sortOrder:2,status:'active'}))).statusCode).toBe(400);
      await f.request('POST','resources/share-templates',saveBody({name:'停用草稿',title:'不可展示',status:'inactive'}));
      const {clubPresentation}=await import('../src/application/backoffice-content.js');let projection=clubPresentation(f.store,clubId);expect(projection.banners).toHaveLength(1);expect(projection.shareTemplates).toHaveLength(0);expect(projection.optionalFeatures[0]?.path).toBe('/pages/parent/training-history/index');
      const capabilities=await f.store.getClubCapabilities(clubId,{clientId:'app-client-cq-talent-wechat-main'});expect(capabilities?.client?.theme).toMatchObject({logoUrl:'https://club.example/logo.svg',primaryColor:'#123456'});
      const openapi=(await f.server.inject('/openapi.json')).json();expect(openapi.paths['/clubs/{clubId}/app-clients/{clientId}/content/presentation']).toBeDefined();
      await f.close();f=await fixture(path,false);projection=clubPresentation(f.store,clubId);expect(projection.banners[0]?.id).toBe(banner.json().id);expect(projection.branding?.primaryColor).toBe('#123456');
    }finally{await f.close();rmSync(directory,{recursive:true,force:true})}
  });

  it("previews typed Excel rows, confirms shared facts and safely replays/reopens partial batches",async()=>{
    const directory=mkdtempSync(join(tmpdir(),"backoffice-import-")),path=join(directory,"facts.sqlite");let f=await fixture(path);
    const excel=async(rows:unknown[][])=>{const book=new ExcelJS.Workbook();const sheet=book.addWorksheet("导入");rows.forEach(row=>sheet.addRow(row));return Buffer.from(await book.xlsx.writeBuffer()).toString("base64")};
    try{
      const template=await f.request("GET","import-templates/students");expect(template.statusCode).toBe(200);const book=new ExcelJS.Workbook();await book.xlsx.load(Buffer.from(template.json().contentBase64,"base64"));expect(book.getWorksheet("字段说明")).toBeDefined();
      const before=f.store.listStudents(clubId).length;
      const body={resourceKey:"students",sourceName:"合成来源",fileName:"synthetic.xlsx",blankPolicy:"preserve",requestId:randomUUID(),contentBase64:await excel([["externalId","name","birthDate"],["first","合成导入学员","2017-01-01"],["bad","缺日期",""]])};
      const preview=await f.request("POST","imports/preview",body);expect(preview.statusCode,preview.body).toBe(200);let batch=preview.json();expect(batch.rows.map((row:{status:string})=>row.status)).toEqual(["pending","failed"]);expect(f.store.listStudents(clubId)).toHaveLength(before);expect((await f.request("POST","imports/preview",body)).json().id).toBe(batch.id);
      const confirmation={expectedRevision:batch.revision,rowNumbers:[2,3],requestId:randomUUID()},confirmed=await f.request("POST",`imports/${batch.id}/confirm`,confirmation);expect(confirmed.statusCode,confirmed.body).toBe(200);batch=confirmed.json();expect(batch.rows.map((row:{status:string})=>row.status)).toEqual(["success","failed"]);expect(f.store.listStudents(clubId)).toHaveLength(before+1);
      expect((await f.request("POST",`imports/${batch.id}/confirm`,confirmation)).json().rows[0].resultId).toBe(batch.rows[0].resultId);expect(f.store.listStudents(clubId)).toHaveLength(before+1);
      const repeated=(await f.request("POST","imports/preview",{...body,requestId:randomUUID()})).json();expect(repeated.rows[0].action).toBe("duplicate");expect(repeated.rows[0].status).toBe("duplicate");
      const id=batch.rows[0].resultId;let existing=(await f.request("GET",`resources/students/${id}`)).json().record;
      const changed={...body,requestId:randomUUID(),contentBase64:await excel([["externalId","name"],["first","导入更新"]])};let update=(await f.request("POST","imports/preview",changed)).json();expect(update.rows[0].action).toBe("update");
      await f.request("PUT",`resources/students/${id}`,saveBody({...existing.values,name:"并发编辑"},existing.revision));
      const stale=await f.request("POST",`imports/${update.id}/confirm`,{expectedRevision:update.revision,rowNumbers:[2],requestId:randomUUID()});expect(stale.json().rows[0]).toMatchObject({status:"failed",error:"revision_conflict"});expect(f.store.listStudents(clubId).find(s=>s.id===id)?.name).toBe("并发编辑");
      update=(await f.request("POST","imports/preview",{...changed,requestId:randomUUID()})).json();const saved=await f.request("POST",`imports/${update.id}/confirm`,{expectedRevision:update.revision,rowNumbers:[2],requestId:randomUUID()});expect(saved.json().rows[0].status,saved.body).toBe("success");expect(f.store.listStudents(clubId).find(s=>s.id===id)?.birthDate).toBe("2017-01-01");
      expect((await f.request("POST","imports/preview",{...body,requestId:randomUUID(),mapping:{notes:"name"}})).statusCode).toBe(400);
      const foreign=await f.request("POST","imports/preview",{...changed,requestId:randomUUID(),contentBase64:await excel([["externalId","targetId","expectedRevision","name"],["other","foreign-student","unknown","越界"]])});expect(foreign.json().rows[0].error).toBe("invalid_reference");
      await f.close();f=await fixture(path,false);expect((await f.request("GET",`imports/${batch.id}`)).json().rows[0].resultId).toBe(id);expect(f.store.listStudents(clubId).find(s=>s.id===id)?.name).toBe("导入更新");
    }finally{await f.close();rmSync(directory,{recursive:true,force:true})}
  });

  it("exports only explicitly permitted fields against the viewed snapshot and audits the download",async()=>{
    const f=await fixture();try{
      let list=(await f.request("GET","resources/students?search=李明")).json();const body={fields:["name","birthDate"],search:"李明",snapshot:list.snapshot,requestId:randomUUID()};expect((await f.request("POST","exports/students",body)).statusCode).toBe(403);
      f.p.repositories.backofficeManagement.replaceGrants(clubId,"user-admin-1",["export"]);const response=await f.request("POST","exports/students",body);expect(response.statusCode,response.body).toBe(200);expect(response.json().rowCount).toBe(list.total);const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(Buffer.from(response.json().contentBase64,"base64"));expect(workbook.getWorksheet("明细")!.getRow(1).values).toEqual([,"externalId","targetId","expectedRevision","name","birthDate"]);expect(workbook.getWorksheet("导出条件")!.getRow(4).getCell(2).value).toBe(list.snapshot);
      expect((await f.request("POST","exports/students",{...body,fields:["notes"],requestId:randomUUID()})).statusCode).toBe(403);expect((await f.request("POST","exports/students",{...body,snapshot:"changed",requestId:randomUUID()})).statusCode).toBe(409);
      expect(f.p.repositories.backofficeManagement.history(clubId,"exports","students")).toHaveLength(1);expect((await f.request("POST","exports/students",body)).statusCode).toBe(200);expect(f.p.repositories.backofficeManagement.history(clubId,"exports","students")).toHaveLength(1);
      f.p.repositories.backofficeManagement.replaceGrants(clubId,"user-admin-1",[]);expect((await f.request("POST","exports/students",body)).statusCode).toBe(403);
    }finally{await f.close()}
  });

  it("keeps BI cards, details and exports on one persisted fact snapshot after shared corrections",async()=>{
    const directory=mkdtempSync(join(tmpdir(),"backoffice-bi-")),path=join(directory,"facts.sqlite");let f=await fixture(path);
    try{
      f.p.repositories.backofficeManagement.replaceGrants(clubId,"user-admin-1",["export"]);
      const body={topic:"training",filters:{studentId:"student-1",teamId:"team-u10-dev",from:"2026-07-01",to:"2026-07-01"},requestId:randomUUID()};const response=await f.request("POST","bi-snapshots",body);expect(response.statusCode,response.body).toBe(200);const snapshot=response.json();expect(snapshot.data.rows).toHaveLength(1);expect(snapshot.data.cards.find((card:{key:string})=>card.key==="people").value).toBe(1);expect(snapshot.data.rows[0].values).toMatchObject({counted:true,source:"系统默认"});expect((await f.request("POST","bi-snapshots",body)).json().id).toBe(snapshot.id);
      const row=(await f.request("GET","training-records")).json().find((row:{studentId:string;eventId:string})=>row.studentId==="student-1"&&row.eventId==="event-training-1");const corrected=await f.request("PUT","training-records",{eventId:row.eventId,studentId:row.studentId,expectedRevision:row.record.revision,counted:false,reason:"合成统计更正",requestId:randomUUID()});expect(corrected.statusCode,corrected.body).toBe(200);
      const original=(await f.request("GET",`bi-snapshots/${snapshot.id}`)).json();expect(original.stale).toBe(true);expect(original.data).toEqual(snapshot.data);
      const download=await f.request("POST",`bi-snapshots/${snapshot.id}/export`,{factVersion:snapshot.factVersion,requestId:randomUUID()});expect(download.statusCode,download.body).toBe(200);expect(download.json().factVersion).toBe(snapshot.factVersion);const book=new ExcelJS.Workbook();await book.xlsx.load(Buffer.from(download.json().contentBase64,"base64"));expect(book.getWorksheet("指标")!.getRow(3).getCell(2).value).toBe(1);expect(book.getWorksheet("明细")!.rowCount).toBe(snapshot.data.rows.length+1);
      const current=(await f.request("POST","bi-snapshots",{...body,requestId:randomUUID()})).json();expect(current.factVersion).not.toBe(snapshot.factVersion);expect(current.data.cards.find((card:{key:string})=>card.key==="people").value).toBe(0);expect(current.data.rows[0].values.source).toBe("人工更正");
      expect((await f.request("POST","bi-snapshots",{...body,requestId:randomUUID(),filters:{teamId:"foreign-team"}})).statusCode).toBe(400);expect((await f.request("POST","bi-snapshots",{...body,requestId:randomUUID(),topic:"sql"})).statusCode).toBe(400);expect((await f.request("POST",`bi-snapshots/${snapshot.id}/export`,{factVersion:"wrong",requestId:randomUUID()})).statusCode).toBe(409);
      await f.close();f=await fixture(path,false);expect((await f.request("GET",`bi-snapshots/${snapshot.id}`)).json()).toMatchObject({factVersion:snapshot.factVersion,data:snapshot.data,stale:true});f.p.repositories.backofficeManagement.replaceGrants(clubId,"user-admin-1",[]);expect((await f.request("POST",`bi-snapshots/${snapshot.id}/export`,{factVersion:snapshot.factVersion,requestId:randomUUID()})).statusCode).toBe(403);
    }finally{await f.close();rmSync(directory,{recursive:true,force:true})}
  });

  it("imports training corrections and assessment drafts without publishing facts or touching credit ledgers",async()=>{
    const f=await fixture();vi.stubEnv("FCM_ASSESSMENT_PUBLICATION_CLUBS",clubId);
    const excel=async(rows:unknown[][])=>{const book=new ExcelJS.Workbook(),sheet=book.addWorksheet("导入");rows.forEach(row=>sheet.addRow(row));return Buffer.from(await book.xlsx.writeBuffer()).toString("base64")};
    const preview=async(resourceKey:string,rows:unknown[][])=>f.request("POST","imports/preview",{resourceKey,sourceName:"合成过程来源",fileName:"synthetic.xlsx",blankPolicy:"preserve",contentBase64:await excel(rows),requestId:randomUUID()});
    try{
      const ledger=f.store.getLessonLedger(clubId,"student-1"),current=f.store.trainingRecords.get(clubId,"event-training-1","student-1");
      let response=await preview("training-records",[["externalId","eventId","studentId","recordRevision","counted","reason"],["training","event-training-1","student-1",current?.revision??0,false,"合成历史复核"]]);expect(response.statusCode,response.body).toBe(200);let batch=response.json();expect(batch.rows[0].status,response.body).toBe("pending");expect(f.store.trainingRecords.get(clubId,"event-training-1","student-1")).toEqual(current);
      response=await f.request("POST",`imports/${batch.id}/confirm`,{expectedRevision:batch.revision,rowNumbers:[2],requestId:randomUUID()});expect(response.json().rows[0].status,response.body).toBe("success");expect(f.store.trainingRecords.get(clubId,"event-training-1","student-1")?.counted).toBe(false);expect(f.store.getLessonLedger(clubId,"student-1")).toEqual(ledger);
      // Restore a real counted course before importing assessment entries.
      const corrected=f.store.trainingRecords.get(clubId,"event-training-1","student-1")!;expect((await f.request("PUT","training-records",{eventId:"event-training-1",studentId:"student-1",expectedRevision:corrected.revision,counted:true,reason:"合成参与确认",requestId:randomUUID()})).statusCode).toBe(200);
      f.p.repositories.backofficeManagement.replaceGrants(clubId,"user-admin-1",["assessment_entry"]);const now=new Date().toISOString();await f.p.repositories.coaches.save({id:"import-admin-coach",clubId,userId:"user-admin-1",name:"合成教学身份",specialties:[],status:"active",createdAt:now,updatedAt:now});f.store.refreshBackofficeFacts(clubId);await f.store.saveCoachAssignment({id:"import-admin-assignment",clubId,teamId:"team-u10-dev",coachId:"import-admin-coach",role:"assistant_coach",createdAt:now,updatedAt:now});
      const create=await f.request("POST","assessment-tasks",{title:"合成导入任务",termLabel:"合成周期",templateVersionId:"assessment-template-version-technical-1",teamIds:["team-u10-dev"],startsOn:"2020-01-01",dueOn:"2099-12-31",requestId:randomUUID()});expect(create.statusCode,create.body).toBe(200);const taskId=create.json().taskIds[0],detail=(await f.request("GET",`assessment-tasks/${taskId}`)).json(),item=detail.items[0],facts=f.store.listAssessmentRawResults(clubId).length;
      response=await preview("assessment-drafts",[["externalId","taskId","studentId","testItemId","eventId","draftRevision","value","unit"],["assessment",taskId,"student-1",item.id,"event-training-1",0,4,"score"]]);expect(response.statusCode,response.body).toBe(200);batch=response.json();expect(batch.rows[0].status,response.body).toBe("pending");expect(f.store.assessmentWorkflow.get(clubId,taskId,"student-1")).toBeNull();expect(f.store.listAssessmentRawResults(clubId)).toHaveLength(facts);
      response=await f.request("POST",`imports/${batch.id}/confirm`,{expectedRevision:batch.revision,rowNumbers:[2],requestId:randomUUID()});expect(response.json().rows[0].status,response.body).toBe("success");expect(f.store.assessmentWorkflow.get(clubId,taskId,"student-1")?.revision).toBe(1);expect(f.store.listAssessmentRawResults(clubId)).toHaveLength(facts);
      const duplicate=await preview("assessment-drafts",[["externalId","taskId","studentId","testItemId","eventId","draftRevision","value","unit"],["d1",taskId,"student-1",item.id,"event-training-1",1,4,"score"],["d2",taskId,"student-1",item.id,"event-training-1",1,4,"score"]]);const grouped=duplicate.json();const declined=await f.request("POST",`imports/${grouped.id}/confirm`,{expectedRevision:grouped.revision,rowNumbers:[2,3],requestId:randomUUID()});expect(declined.json().rows.every((row:{status:string})=>row.status==='failed')).toBe(true);expect(f.store.assessmentWorkflow.get(clubId,taskId,"student-1")?.revision).toBe(1);
      const updated=(await preview("assessment-drafts",[["externalId","taskId","studentId","testItemId","eventId","draftRevision","value","unit"],["audit-failure",taskId,"student-1",item.id,"event-training-1",1,5,"score"]])).json();const confirmation={expectedRevision:updated.revision,rowNumbers:[2],requestId:randomUUID()},repo=f.p.repositories.backofficeManagement,originalAudit=repo.audit.bind(repo);
      const audit=vi.spyOn(repo,'audit').mockImplementation((...args:Parameters<typeof repo.audit>)=>{if(args[1]==='imports'&&args[4]==='confirm_draft')throw new Error('synthetic audit failure');return originalAudit(...args)});
      const rollback=await f.request('POST',`imports/${updated.id}/confirm`,confirmation);expect(rollback.json().rows[0].status).toBe('failed');expect(f.store.assessmentWorkflow.get(clubId,taskId,'student-1')?.revision).toBe(1);expect(f.p.database.prepare('SELECT target_id FROM external_record_links WHERE raw_record_id=?').get(updated.rows[0].rawId)).toBeUndefined();audit.mockRestore();
      const retry=await f.request('POST',`imports/${updated.id}/confirm`,confirmation);expect(retry.json().rows[0].status,retry.body).toBe('success');expect(f.store.assessmentWorkflow.get(clubId,taskId,'student-1')?.revision).toBe(2);expect(f.store.listAssessmentRawResults(clubId)).toHaveLength(facts);
      const wrong=await preview("assessment-drafts",[["externalId","taskId","studentId","testItemId","eventId","draftRevision","value","unit"],["wrong",taskId,"student-1",item.id,"event-training-1",2,4,"seconds"]]);expect(wrong.json().rows[0].error).toBe("assessment_unit_mismatch");
    }finally{vi.unstubAllEnvs();await f.close()}
  });

  it("dispatches pinned tasks atomically and separates teaching from model authorization",async()=>{
    const directory=mkdtempSync(join(tmpdir(),"backoffice-handling-")),path=join(directory,"facts.sqlite");let f=await fixture(path);vi.stubEnv("FCM_ASSESSMENT_PUBLICATION_CLUBS",clubId);try{
      const catalog=(await f.request("GET","task-catalog")).json(),version=catalog.versions[0];expect(version).toBeDefined();
      const other=catalog.teams.find((t:{id:string;studentIds:string[]})=>t.id!=="team-u10-dev"&&t.studentIds.length),teamIds=["team-u10-dev",...(other?[other.id]:[])];
      const body={title:"合成多队任务",termLabel:"合成周期",templateVersionId:version.id,teamIds,startsOn:"2020-01-01",dueOn:"2099-12-31",requestId:randomUUID(),selections:[{teamId:"team-u10-dev",studentIds:["student-1"]}]};
      const created=await f.request("POST","assessment-tasks",body);expect(created.statusCode,created.body).toBe(200);expect(created.json().taskIds).toHaveLength(teamIds.length);expect((await f.request("POST","assessment-tasks",body)).json()).toEqual(created.json());
      const id=created.json().taskIds[0],before=f.store.listAssessmentTasks(clubId).length;
      expect((await f.request("POST","assessment-tasks",{...body,requestId:randomUUID(),teamIds:["team-u10-dev","wrong-team"]})).statusCode).toBe(400);expect(f.store.listAssessmentTasks(clubId)).toHaveLength(before);
      let detail=(await f.request("GET",`assessment-tasks/${id}`)).json();expect(detail.summary.templateVersionId).toBe(version.id);expect(detail.canWrite).toBe(false);
      expect((await f.request("PUT",`assessment-tasks/${id}/students/student-1/handling`,{expectedRevision:0,reason:"合成原因"})).statusCode).toBe(403);
      f.p.repositories.backofficeManagement.replaceGrants(clubId,"user-admin-1",["assessment_entry"]);
      expect((await f.request("PUT",`assessment-tasks/${id}/students/student-1/handling`,{expectedRevision:0,reason:"合成原因"})).statusCode).toBe(403);
      const now=new Date().toISOString();await f.p.repositories.coaches.save({id:"coach-admin-synthetic",clubId,userId:"user-admin-1",name:"合成教学身份",specialties:[],status:"active",createdAt:now,updatedAt:now});f.store.refreshBackofficeFacts(clubId);
      await f.store.saveCoachAssignment({id:"assignment-admin-synthetic",clubId,teamId:"team-u10-dev",coachId:"coach-admin-synthetic",role:"assistant_coach",createdAt:now,updatedAt:now});
      detail=(await f.request("GET",`assessment-tasks/${id}`)).json();expect(detail.canWrite).toBe(true);expect(detail.actingCoach.id).toBe("coach-admin-synthetic");
      const count=f.store.listAssessmentRawResults(clubId).length;
      const handled=await f.request("PUT",`assessment-tasks/${id}/students/student-1/handling`,{expectedRevision:0,reason:"合成伤病不测评"});expect(handled.statusCode,handled.body).toBe(200);expect(handled.json().revision).toBe(1);
      detail=(await f.request("GET",`assessment-tasks/${id}`)).json();expect(detail.summary.notAssessedStudents).toBe(1);expect(detail.summary.processedStudents).toBe(1);expect(detail.summary.completedStudents).toBe(0);expect(f.store.listAssessmentRawResults(clubId)).toHaveLength(count);
      const analysis=(await f.request("POST","bi-snapshots",{topic:"assessment",filters:{studentId:"student-1"},requestId:randomUUID()})).json();expect(analysis.data.cards.find((card:{key:string})=>card.key==="notAssessed").value).toBe(1);expect(analysis.data.cards.find((card:{key:string})=>card.key==="measured").value).toBe(0);
      await f.close();f=await fixture(path,false);detail=(await f.request("GET",`assessment-tasks/${id}`)).json();expect(detail.states.find((state:{studentId:string})=>state.studentId==="student-1").state.notAssessed.reason).toBe("合成伤病不测评");expect(f.store.listAssessmentRawResults(clubId)).toHaveLength(count);
      const rejected=await f.request("POST",`assessment-tasks/${id}/publications`,{students:[{studentId:"student-1",expectedRevision:1}]});expect(rejected.json().results[0]).toMatchObject({success:false,error:{code:"assessment_not_assessed"}});
      expect((await f.request("PUT",`assessment-tasks/${id}/students/student-1/handling`,{expectedRevision:0,reason:null})).statusCode).toBe(409);
      expect((await f.request("PUT",`assessment-tasks/${id}/students/student-1/handling`,{expectedRevision:1,reason:null})).json().revision).toBe(2);
      expect((await f.request("GET","models")).statusCode).toBe(403);
    }finally{vi.unstubAllEnvs();await f.close();rmSync(directory,{recursive:true,force:true})}
  });

  it("versions explicit standards with units, age references and manual comparisons",async()=>{
    const directory=mkdtempSync(join(tmpdir(),"backoffice-standard-")),path=join(directory,"facts.sqlite");let f=await fixture(path);try{
      f.p.repositories.backofficeManagement.replaceGrants(clubId,"user-admin-1",["assessment"]);
      const item=f.store.listAssessmentTestItems(clubId).find(i=>i.valueKind==="score_0_100")!;
      const definition={name:"合成培养目标",version:"1",targetType:"project",targetId:item.id,unit:"score",direction:"higher",minimum:80,maximum:100,applicability:"仅合成验证",ageMinimum:8,ageMaximum:10,effectiveFrom:"2026-01-01",basis:"trial",reference:""};
      const body={definition,expectedRevision:null,requestId:randomUUID()},created=await f.request("POST","standards",body);expect(created.statusCode,created.body).toBe(200);let standard=created.json();expect(standard.issues).toContain("age_reference_required");
      expect((await f.request("POST",`standards/${standard.id}/transitions`,{action:"publish",expectedRevision:standard.revision,requestId:randomUUID()})).statusCode).toBe(400);
      expect((await f.request("POST",`standards/${standard.id}/compare`,{value:80,unit:"s"})).statusCode).toBe(400);
      const comparison=await f.request("POST",`standards/${standard.id}/compare`,{value:80,unit:"score"});expect(comparison.json()).toMatchObject({manualSelectionRequired:true,meetsReference:true,basis:"trial"});
      const updated=await f.request("PUT",`standards/${standard.id}`,{...body,expectedRevision:standard.revision,requestId:randomUUID(),definition:{...definition,ageReferenceDate:"2026-01-01",basis:"official",reference:"Synthetic test only"}});expect(updated.statusCode,updated.body).toBe(200);standard=updated.json();expect(standard.issues).toEqual([]);
      const published=await f.request("POST",`standards/${standard.id}/transitions`,{action:"publish",expectedRevision:standard.revision,requestId:randomUUID()});expect(published.statusCode,published.body).toBe(200);standard=published.json();
      expect((await f.request("PUT",`standards/${standard.id}`,{...body,expectedRevision:standard.revision,requestId:randomUUID()})).statusCode).toBe(409);
      const clone=await f.request("POST","standards",{...body,requestId:randomUUID(),sourceId:standard.id,sourceRevision:standard.revision,definition:{...standard.definition,version:"2"}});expect(clone.statusCode,clone.body).toBe(200);const next=clone.json();
      expect((await f.request("POST",`standards/${next.id}/transitions`,{action:"publish",expectedRevision:next.revision,requestId:randomUUID()})).statusCode).toBe(200);
      expect((await f.request("GET",`standards/${standard.id}`)).json().record.status).toBe("archived");
      await f.close();f=await fixture(path,false);expect((await f.request("GET",`standards/${standard.id}`)).json().record.status).toBe("archived");expect((await f.request("GET",`standards/${next.id}`)).json().record.definition.version).toBe("2");
    }finally{await f.close();rmSync(directory,{recursive:true,force:true})}
  });

  it("persists model drafts, isolates scales, validates the graph and freezes published versions",async()=>{
    const directory=mkdtempSync(join(tmpdir(),"backoffice-model-")),path=join(directory,"facts.sqlite");let f=await fixture(path);
    try {
      expect((await f.request("GET","models")).statusCode).toBe(403);
      f.p.repositories.backofficeManagement.replaceGrants(clubId,"user-admin-1",["assessment"]);
      const item=f.store.listAssessmentTestItems(clubId).find(item=>item.valueKind==="score_0_100")!,inputMetric=f.store.listAbilityMetrics(clubId).find(metric=>metric.id===item.metricId)!,outputMetric=f.store.listAbilityMetrics(clubId).find(metric=>metric.metricKind==="computed"&&metric.maxScore)!;
      const now=new Date().toISOString(),mappingRepo=new AssessmentMappingRepository(f.p.database),rawId="model-synthetic-raw",gradeId="model-synthetic-grade";
      const rawDefinition={name:"合成映射",stage:"raw_score" as const,unit:"score",minimum:0,maximum:100,applicability:"仅合成测试",basis:"official" as const,reference:"Synthetic test only",rules:[{lower:0,upper:100,lowerInclusive:true,upperInclusive:true,score:50}]};
      mappingRepo.save({id:rawId,clubId,testItemId:item.id,status:"active",definition:rawDefinition,createdAt:now,updatedAt:now});mappingRepo.save({id:gradeId,clubId,testItemId:item.id,status:"active",definition:{...rawDefinition,stage:"score_grade",rules:[{lower:0,upper:100,lowerInclusive:true,upperInclusive:true,grade:"A"}]},createdAt:now,updatedAt:now});
      const definition={name:"合成模型",version:"test-v1",applicability:"仅合成验证",basis:"trial",reference:"",inputs:[{testItemId:item.id,scoreMappingVersionId:rawId,gradeMappingVersionId:gradeId}],outputs:[{metricId:outputMetric.id,method:"normalized_weighted_sum",inputs:[{metricId:inputMetric.id,weight:1}],rounding:"two_decimals",inputScale:100,maxScore:outputMetric.maxScore}]};
      const body={definition,expectedRevision:null,requestId:randomUUID()};
      const saved=await f.request("POST","models",body);expect(saved.statusCode,saved.body).toBe(200);let model=saved.json();expect(model.issues).toEqual([]);
      expect((await f.request("POST","models",body)).json().id).toBe(model.id);
      expect(f.store.listAbilityMetrics(clubId).find(metric=>metric.id===outputMetric.id)?.maxScore).toBe(outputMetric.maxScore);
      const trial=await f.request("POST",`models/${model.id}/trial`,{values:[{testItemId:item.id,value:{kind:"score_0_100",score:50}}]});expect(trial.statusCode,trial.body).toBe(200);expect(trial.json().outputs[0].value.value).toBe(outputMetric.maxScore!/2);
      expect((await f.request("POST",`models/${model.id}/transitions`,{action:"publish",expectedRevision:model.revision,requestId:randomUUID()})).statusCode).toBe(409);
      const altered=await f.request("PUT",`models/${model.id}`,{...body,requestId:randomUUID(),expectedRevision:model.revision,definition:{...definition,outputs:[]}});expect(altered.statusCode,altered.body).toBe(200);model=altered.json();
      expect(f.store.listMetricDependencies(clubId).filter(edge=>edge.graphVersionId===`graph-${model.id}`)).toHaveLength(0);
      const formal={...definition,basis:"official",reference:"Synthetic test only, not deployed"};
      model=(await f.request("PUT",`models/${model.id}`,{...body,requestId:randomUUID(),expectedRevision:model.revision,definition:formal})).json();
      const stale=await f.request("PUT",`models/${model.id}`,{...body,requestId:randomUUID(),expectedRevision:"stale"});expect(stale.statusCode).toBe(409);
      const published=await f.request("POST",`models/${model.id}/transitions`,{action:"publish",expectedRevision:model.revision,requestId:randomUUID()});expect(published.statusCode,published.body).toBe(200);model=published.json();expect(model.status).toBe("active");
      const calculationRevision=model.revision,display=model.display,displayBody={groups:[{name:"合成展示组",metricIds:[inputMetric.id,outputMetric.id]}],expectedRevision:display.revision,requestId:randomUUID()};
      const organized=await f.request("PUT",`models/${model.id}/display`,displayBody);expect(organized.statusCode,organized.body).toBe(200);expect(organized.json().groups).toEqual(displayBody.groups);
      expect((await f.request("GET",`models/${model.id}`)).json().record.revision).toBe(calculationRevision);
      expect((await f.request("PUT",`models/${model.id}/display`,displayBody)).json()).toEqual(organized.json());
      expect((await f.request("PUT",`models/${model.id}/display`,{...displayBody,requestId:randomUUID()})).statusCode).toBe(409);
      expect((await f.request("PUT",`models/${model.id}/display`,{...displayBody,requestId:randomUUID(),expectedRevision:organized.json().revision,groups:[{name:"合成组",metricIds:["wrong-metric"]}]})).statusCode).toBe(400);

      const reused=await f.request("POST","models",{...body,requestId:randomUUID(),definition:{...formal,name:"合成模型复用",inputs:[],outputs:[],references:[{versionId:model.id,metricId:outputMetric.id,selection:"same_assessment"}]}});expect(reused.statusCode,reused.body).toBe(200);const reusedModel=reused.json();expect(reusedModel.definition.inputs).toEqual(definition.inputs);expect(reusedModel.issues).toEqual([]);
      const reuseTrial=await f.request("POST",`models/${reusedModel.id}/trial`,{values:[{testItemId:item.id,value:{kind:"score_0_100",score:50}}]});expect(reuseTrial.statusCode,reuseTrial.body).toBe(200);expect(reuseTrial.json().outputs[0].value.value).toBe(outputMetric.maxScore!/2);
      expect((await f.request("POST",`models/${reusedModel.id}/transitions`,{action:"publish",expectedRevision:reusedModel.revision,requestId:randomUUID()})).statusCode).toBe(200);
      expect(f.store.listAbilityMetrics(clubId).find(metric=>metric.id===outputMetric.id)?.maxScore).toBe(outputMetric.maxScore);
      expect((await f.request("POST","models",{...body,requestId:randomUUID(),definition:{...formal,references:[{versionId:model.id,metricId:outputMetric.id,selection:"same_assessment"}]}})).statusCode).toBe(400);
      expect((await f.request("POST","models",{...body,requestId:randomUUID(),definition:{...formal,inputs:[],outputs:[],references:[{versionId:model.id,metricId:outputMetric.id,selection:"latest"}]}})).statusCode).toBe(400);

      expect((await f.request("PUT",`models/${model.id}`,{...body,requestId:randomUUID(),expectedRevision:model.revision})).statusCode).toBe(409);
      const clone=await f.request("POST","models",{...body,requestId:randomUUID(),templateId:model.templateId,sourceId:model.id,sourceRevision:model.revision,definition:{...formal,version:"test-v2"}});expect(clone.statusCode,clone.body).toBe(200);
      const next=clone.json();const nextPublish=await f.request("POST",`models/${next.id}/transitions`,{action:"publish",expectedRevision:next.revision,requestId:randomUUID()});expect(nextPublish.statusCode,nextPublish.body).toBe(200);
      expect((await f.request("GET",`models/${model.id}`)).json().record.status).toBe("archived");
      expect((await f.request("POST",`models/${reusedModel.id}/trial`,{values:[{testItemId:item.id,value:{kind:"score_0_100",score:50}}]})).json().outputs[0].value.value).toBe(outputMetric.maxScore!/2);

      await f.close();f=await fixture(path,false);
      expect((await f.request("GET",`models/${next.id}`)).json().record.definition).toEqual({...formal,version:"test-v2"});
      expect((await f.request("GET",`models/${model.id}`)).json().record.display.groups).toEqual(displayBody.groups);

      const invalid=await f.request("POST","models",{...body,requestId:randomUUID(),definition:{...definition,version:"cycle",outputs:[{...definition.outputs[0],inputs:[{metricId:outputMetric.id,weight:1}]}]}});expect(invalid.statusCode,invalid.body).toBe(200);expect(invalid.json().issues).toContainEqual({code:"model_graph_invalid"});
      expect((await f.request("POST",`models/${invalid.json().id}/trial`,{values:[{testItemId:item.id,value:{kind:"score_0_100",score:50}}]})).statusCode).toBe(400);
      expect((await f.request("POST","models",{...body,requestId:randomUUID(),definition:{...definition,outputs:[{...definition.outputs[0],method:"eval"}]}})).statusCode).toBe(400);
    } finally {await f.close();rmSync(directory,{recursive:true,force:true});}
  });

  it("publishes mapped raw facts through the common workflow and reopens both version lineages", async()=>{
    const directory=mkdtempSync(join(tmpdir(),"backoffice-mapped-facts-")),path=join(directory,"facts.sqlite");
    let f=await fixture(path);
    vi.stubEnv("FCM_ASSESSMENT_PUBLICATION_CLUBS",clubId);
    try {
      const now=new Date().toISOString(),metric=f.store.listAbilityMetrics(clubId).find(metric=>metric.metricKind==="atomic" && metric.valueKind==="score_0_100")!;
      const item={id:"synthetic-mapped-speed",clubId,metricId:metric.id,name:"合成速度",valueKind:"duration_seconds" as const,unit:"s",precision:3,minimumValue:0,maximumValue:10,createdAt:now,updatedAt:now};
      f.p.repositories.dataCapability.saveAssessmentTestItem(item);
      const mappings=new AssessmentMappingRepository(f.p.database);
      const raw={id:"synthetic-raw-v1",clubId,testItemId:item.id,status:"active" as const,createdAt:now,updatedAt:now,definition:{name:"合成原始映射",stage:"raw_score" as const,unit:"s",minimum:0,maximum:10,applicability:"合成测试",basis:"official" as const,reference:"Synthetic test only, not deployed",rules:[{lower:0,upper:10,lowerInclusive:true,upperInclusive:true,score:90}]}};
      const grade={...raw,id:"synthetic-grade-v1",definition:{...raw.definition,name:"合成等级映射",stage:"score_grade" as const,unit:"score",maximum:100,rules:[{lower:0,upper:100,lowerInclusive:true,upperInclusive:true,grade:"A"}]}};
      mappings.save(raw);mappings.save(grade);
      f.p.repositories.dataCapability.saveAssessmentTemplate({id:"synthetic-mapped-template",catalogScope:{scope:"club",clubId},name:"合成映射模板",status:"active",createdAt:now,updatedAt:now});
      f.p.repositories.dataCapability.saveAssessmentTemplateVersion({id:"synthetic-mapped-template-v1",clubId,templateId:"synthetic-mapped-template",version:"1",status:"active",createdAt:now,updatedAt:now});
      f.p.repositories.dataCapability.saveAssessmentMetricBinding({id:"synthetic-mapped-binding",clubId,templateVersionId:"synthetic-mapped-template-v1",metricId:metric.id,testItemId:item.id,role:"input",scoreMappingVersionId:raw.id,gradeMappingVersionId:grade.id,maxScore:100,sortOrder:1,createdAt:now,updatedAt:now});
      f.store.refreshBackofficeFacts(clubId);
      const task={id:"synthetic-mapped-task",clubId,teamId:"team-u10-dev",templateId:"synthetic-mapped-template",termLabel:"合成周期",title:"合成映射任务",startsOn:"2020-01-01",dueOn:"2099-12-31",studentIds:["student-1"],testItemIds:[item.id]};
      await f.store.saveAssessmentTask(task);f.store.assessmentWorkflow.pin(clubId,task.id,"synthetic-mapped-template-v1");
      f.p.repositories.backofficeManagement.replaceGrants(clubId,"user-admin-1",["assessment_entry"]);
      await f.p.repositories.coaches.save({id:"mapped-admin-coach",clubId,userId:"user-admin-1",name:"合成教学身份",specialties:[],status:"active",createdAt:now,updatedAt:now});f.store.refreshBackofficeFacts(clubId);
      await f.store.saveCoachAssignment({id:"mapped-admin-assignment",clubId,teamId:task.teamId,coachId:"mapped-admin-coach",role:"assistant_coach",createdAt:now,updatedAt:now});
      const count=f.store.listAssessmentRawResults(clubId).length;
      const saved=await f.request("PUT",`assessment-tasks/${task.id}/students/student-1/entries`,{expectedRevision:0,entries:[{testItemId:item.id,value:{kind:"duration_seconds",seconds:4.123},eventId:"event-training-1"}]});expect(saved.statusCode,saved.body).toBe(200);
      expect(f.store.listAssessmentRawResults(clubId)).toHaveLength(count);
      const response=await f.request("POST",`assessment-tasks/${task.id}/publications`,{students:[{studentId:"student-1",expectedRevision:1}]});expect(response.statusCode,response.body).toBe(200);expect(response.json().results[0].success).toBe(true);const published=response.json().results[0];
      const fact=f.store.listAssessmentRawResults(clubId).find(raw=>raw.assessmentId===published.assessmentId)!;
      expect(fact.value).toEqual({kind:"duration_seconds",seconds:4.123});
      expect(fact.mapping).toMatchObject({rawScoreVersionId:raw.id,gradeVersionId:grade.id,integerScore:90,grade:"A"});
      expect(f.store.listMetricRecords(clubId).find(record=>record.rawResultId===fact.id)?.value).toEqual({kind:"measurement",value:90,unit:"score"});
      mappings.save({...raw,status:"archived"});mappings.save({...grade,status:"archived"});
      const replay=await f.request("POST",`assessment-tasks/${task.id}/publications`,{students:[{studentId:"student-1",expectedRevision:1}]});expect(replay.json().results[0].replayed).toBe(true);
      expect((await f.request("GET",`assessment-tasks/${task.id}`)).json().results).toContainEqual(expect.objectContaining({id:fact.id,mapping:fact.mapping}));
      await f.close();f=await fixture(path,false);
      expect(f.store.listAssessmentRawResults(clubId).find(raw=>raw.id===fact.id)?.mapping).toEqual(fact.mapping);
      expect(f.store.assessmentWorkflow.version(clubId,task.id)).toBe("synthetic-mapped-template-v1");
    } finally {vi.unstubAllEnvs();await f.close();rmSync(directory,{recursive:true,force:true});}
  });

  it("persists project metadata and metric definitions, protecting shared and referenced definitions", async () => {
    const f = await fixture();
    try {
      f.p.repositories.backofficeManagement.replaceGrants(
        clubId,
        "user-admin-1",
        ["assessment"],
      );
      const dimensions = f.store.listDevelopmentDimensions(clubId);
      const createdMetric = await f.request(
        "POST",
        "resources/metrics",
        saveBody({
          name: "合成原子评分",
          code: "synthetic-atomic-score",
          dimensionId: dimensions[0]!.id,
          valueKind: "measurement",
          metricKind: "atomic",
          unit: "score",
          maxScore: 100,
          sourceKinds: ["assessment"],
          status: "active",
        }),
      );
      expect(createdMetric.statusCode, createdMetric.body).toBe(200);
      const metricId = createdMetric.json().id;
      expect(
        f.store
          .listAbilityMetrics(clubId)
          .find((metric) => metric.id === metricId)?.maxScore,
      ).toBe(100);
      const values = {
        name: "合成速度采集",
        metricId,
        valueKind: "duration_seconds",
        unit: "s",
        precision: 3,
        minimumValue: 0,
        maximumValue: 10,
        direction: "lower",
        applicability: "仅合成验证",
        tags: ["测试"],
        protocol: "合成测量协议",
        status: "active",
      };
      const createdItem = await f.request(
        "POST",
        "resources/testitems",
        saveBody(values),
      );
      expect(createdItem.statusCode, createdItem.body).toBe(200);
      const itemId = createdItem.json().id;
      const canonical = (await f.store.listAssessmentTestItems(clubId)).find(
        (item) => item.id === itemId,
      );
      expect(canonical).toMatchObject({
        unit: "s",
        precision: 3,
        tags: ["测试"],
        direction: "lower",
      });
      const reopened = new PersistentApiStore(f.p.repositories);
      expect(
        (await reopened.listAssessmentTestItems(clubId)).find(
          (item) => item.id === itemId,
        ),
      ).toMatchObject(canonical!);
      expect(
        reopened
          .listAbilityMetrics(clubId)
          .some((metric) => metric.id === metricId),
      ).toBe(true);
      const boundMetric = await f.request(
        "PUT",
        `resources/metrics/${metricId}`,
        saveBody(
          { ...createdMetric.json().values, unit: "m" },
          createdMetric.json().revision,
        ),
      );
      expect(boundMetric.statusCode).toBe(409);
      const mapping = await f.request("POST", "mappings", {
        testItemId: itemId,
        definition: {
          name: "合成规则",
          stage: "raw_score",
          unit: "s",
          minimum: 0,
          maximum: 10,
          applicability: "合成验证",
          basis: "trial",
          reference: "",
          rules: [
            {
              lower: 0,
              upper: 10,
              lowerInclusive: true,
              upperInclusive: true,
              score: 80,
            },
          ],
        },
        expectedRevision: null,
        requestId: randomUUID(),
      });
      expect(mapping.statusCode, mapping.body).toBe(200);
      expect(
        (
          await f.request(
            "PUT",
            `resources/testitems/${itemId}`,
            saveBody(
              { ...values, protocol: "改变使用中的协议" },
              createdItem.json().revision,
            ),
          )
        ).statusCode,
      ).toBe(409);
      const inactive = await f.request(
        "PUT",
        `resources/testitems/${itemId}`,
        saveBody(
          { ...values, status: "inactive" },
          createdItem.json().revision,
        ),
      );
      expect(inactive.statusCode, inactive.body).toBe(200);
      expect(
        (await f.request("GET", "options/testitems"))
          .json()
          .some((item: { value: string }) => item.value === itemId),
      ).toBe(false);
      const shared = (await f.request("GET", "resources/metrics"))
        .json()
        .rows.find((row: { readOnly?: boolean }) => row.readOnly);
      if (shared)
        expect(
          (
            await f.request(
              "PUT",
              `resources/metrics/${shared.id}`,
              saveBody(
                { ...shared.values, name: "错误改共享定义" },
                shared.revision,
              ),
            )
          ).statusCode,
        ).toBe(403);
    } finally {
      await f.close();
    }
  });

  it("keeps mapping drafts separate from published facts and freezes formal versions", async () => {
    const f = await fixture();
    try {
      expect((await f.request("GET", "mappings")).statusCode).toBe(403);
      f.p.repositories.backofficeManagement.replaceGrants(
        clubId,
        "user-admin-1",
        ["assessment"],
      );
      const item = (await f.request("GET", "mapping-items")).json()[0];
      const definition = {
        name: "合成试算规则",
        stage: "raw_score",
        unit: item.unit ?? "score",
        minimum: 0,
        maximum: 100,
        applicability: "合成测试对象",
        basis: "trial",
        reference: "",
        rules: [
          {
            lower: 0,
            upper: 50,
            lowerInclusive: true,
            upperInclusive: false,
            score: 70,
          },
          {
            lower: 50,
            upper: 100,
            lowerInclusive: true,
            upperInclusive: true,
            score: 90,
          },
        ],
      };
      const body = {
        testItemId: item.id,
        definition,
        expectedRevision: null,
        requestId: randomUUID(),
      };
      const facts = await f.store.listPlayerAssessments(clubId);
      const created = await f.request("POST", "mappings", body);
      expect(created.statusCode, created.body).toBe(200);
      const draft = created.json();
      expect((await f.request("POST", "mappings", body)).json()).toEqual(draft);
      expect(
        (
          await f.request("POST", `mappings/${draft.id}/trial`, {
            value: 50,
            unit: definition.unit,
          })
        ).json().score,
      ).toBe(90);
      expect(
        (
          await f.request("POST", `mappings/${draft.id}/trial`, {
            value: 50,
            unit: "wrong",
          })
        ).statusCode,
      ).toBe(400);
      const transition = {
        action: "publish",
        expectedRevision: draft.revision,
        requestId: randomUUID(),
      };
      expect(
        (
          await f.request(
            "POST",
            `mappings/${draft.id}/transitions`,
            transition,
          )
        ).statusCode,
      ).toBe(409);
      expect(await f.store.listPlayerAssessments(clubId)).toEqual(facts);
      const updated = await f.request("PUT", `mappings/${draft.id}`, {
        ...body,
        definition: {
          ...definition,
          basis: "official",
          reference: "Explicit synthetic test standard, not deployed",
        },
        expectedRevision: draft.revision,
        requestId: randomUUID(),
      });
      expect(updated.statusCode, updated.body).toBe(200);
      const publishBody = {
        ...transition,
        expectedRevision: updated.json().revision,
        requestId: randomUUID(),
      };
      const published = await f.request(
        "POST",
        `mappings/${draft.id}/transitions`,
        publishBody,
      );
      expect(published.statusCode, published.body).toBe(200);
      expect(published.json().status).toBe("active");
      expect(
        (
          await f.request(
            "POST",
            `mappings/${draft.id}/transitions`,
            publishBody,
          )
        ).json(),
      ).toEqual(published.json());
      expect(
        (
          await f.request("PUT", `mappings/${draft.id}`, {
            ...body,
            expectedRevision: published.json().revision,
            requestId: randomUUID(),
          })
        ).statusCode,
      ).toBe(409);
      const copied = await f.request("POST", "mappings", {
        ...body,
        sourceId: draft.id,
        sourceRevision: published.json().revision,
        requestId: randomUUID(),
      });
      expect(copied.statusCode, copied.body).toBe(200);
      expect(copied.json().id).not.toBe(draft.id);
      const inactive = await f.request(
        "POST",
        `mappings/${draft.id}/transitions`,
        {
          action: "deactivate",
          expectedRevision: published.json().revision,
          requestId: randomUUID(),
        },
      );
      expect(inactive.statusCode, inactive.body).toBe(200);
      expect(inactive.json().status).toBe("archived");
      expect(
        (await f.request("GET", `mappings/${draft.id}`)).json().history,
      ).toHaveLength(4);
      expect(
        (
          await f.request("POST", "mappings", {
            ...body,
            testItemId: "foreign",
            requestId: randomUUID(),
          })
        ).statusCode,
      ).toBe(400);
      f.p.repositories.backofficeManagement.replaceGrants(
        clubId,
        "user-admin-1",
        [],
      );
      expect((await f.request("POST", "mappings", body)).statusCode).toBe(403);
      expect(await f.store.listPlayerAssessments(clubId)).toEqual(facts);
      const document = (await f.server.inject("/openapi.json")).json();
      expect(
        document.paths["/backoffice/api/mappings/{id}/trial"].post.requestBody,
      ).toBeDefined();
    } finally {
      await f.close();
    }
  });

  it("refreshes canonical facts for a newly registered club without touching another club", async () => {
    const f = await fixture();
    try {
      const existing = (await f.p.repositories.clubs.list())[0]!;
      const otherClub = "club-browser-other";
      await f.p.repositories.clubs.save({
        ...existing,
        id: otherClub,
        code: "browser-other",
        name: "合成第二俱乐部",
      });
      await f.p.repositories.memberships.save({
        id: "member-browser-other",
        clubId: otherClub,
        userId: "user-admin-1",
        roles: ["admin"],
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await f.p.repositories.backofficeAuth.provision({
        clubId: otherClub,
        userId: "user-admin-1",
        username: "manager",
        passwordHash: await passwordHash,
      });
      const signed = await f.server.inject({
        method: "POST",
        url: "/backoffice/api/login",
        headers,
        payload: { clubId: otherClub, username: "manager", password },
      });
      const cookie = String(signed.headers["set-cookie"]).split(";")[0]!;
      const original = f.store.listStudents(clubId);
      const created = await f.request(
        "POST",
        "resources/students",
        saveBody({ name: "其他俱乐部学员", birthDate: "2015-01-01" }),
        { cookie },
      );
      expect(created.statusCode, created.body).toBe(200);
      expect(
        f.store
          .listStudents(otherClub)
          .find((student) => student.id === created.json().id)?.name,
      ).toBe("其他俱乐部学员");
      expect(f.store.listStudents(clubId)).toEqual(original);
      const reopened = new PersistentApiStore(f.p.repositories);
      expect(
        reopened
          .listStudents(otherClub)
          .some((student) => student.id === created.json().id),
      ).toBe(true);
    } finally {
      await f.close();
    }
  });

  it("maintains club plans with derived metadata, replay, shared catalog protection and used-version preservation", async () => {
    const f = await fixture();
    try {
      const drill = f.store.listTrainingDrills(clubId)[0]!;
      const input = {
        name: "后台公共计划",
        blocks: [{ drillId: drill.id, plannedMinutes: 12, notes: "合成说明" }],
        expectedRevision: null,
        requestId: randomUUID(),
      };
      const created = await f.request("POST", "plans", input);
      expect(created.statusCode, created.body).toBe(200);
      const plan = created.json();
      expect((await f.request("POST", "plans", input)).json()).toEqual(plan);
      expect(plan.estimatedMinutes).toBe(12);
      expect(
        f.store.listSessionPlans(clubId).find((p) => p.id === plan.id)
          ?.blocks[0]?.notes,
      ).toBe("合成说明");
      f.p.repositories.sessionPlans.save({
        ...f.store.listSessionPlans(clubId)[0]!,
        id: "plan-synthetic-shared",
        name: "合成共享计划",
        catalogScope: { scope: "system" },
      });
      const shared = (await f.request("GET", "plans"))
        .json()
        .find((p: { scope: string }) => p.scope === "system");
      expect(shared).toBeDefined();
      expect(
        (
          await f.request("PUT", `plans/${shared.id}`, {
            ...input,
            expectedRevision: shared.revision,
            requestId: randomUUID(),
          })
        ).statusCode,
      ).toBe(403);
      const event = (await f.request("GET", "resources/events"))
        .json()
        .rows.find(
          (row: { values: { type: string } }) => row.values.type === "training",
        );
      expect(
        (
          await f.request(
            "PUT",
            `resources/events/${event.id}`,
            saveBody(
              { ...event.values, sessionPlanId: plan.id },
              event.revision,
            ),
          )
        ).statusCode,
      ).toBe(200);
      const attempted = await f.request("PUT", `plans/${plan.id}`, {
        ...input,
        name: "会改历史的修改",
        expectedRevision: plan.revision,
        requestId: randomUUID(),
      });
      expect(attempted.statusCode).toBe(409);
      expect(
        (await f.request("GET", `plans/${plan.id}`)).json().record.name,
      ).toBe(input.name);
      const copy = await f.request("POST", "plans", {
        ...input,
        name: "复制版本",
        sourceId: shared.id,
        sourceRevision: shared.revision,
        requestId: randomUUID(),
      });
      expect(copy.statusCode, copy.body).toBe(200);
      expect(copy.json().id).not.toBe(shared.id);
      const used = (await f.request("GET", `plans/${plan.id}`)).json().record;
      const stopped = await f.request("PUT", `plans/${plan.id}`, {
        ...input,
        status: "inactive",
        expectedRevision: used.revision,
        requestId: randomUUID(),
      });
      expect(stopped.statusCode, stopped.body).toBe(200);
      expect(stopped.json().status).toBe("inactive");
      expect(
        (await f.request("GET", "options/plans"))
          .json()
          .some((p: { value: string }) => p.value === plan.id),
      ).toBe(false);
      expect(
        f.store.listSessionPlans(clubId).find((p) => p.id === plan.id)?.blocks,
      ).toEqual(used.blocks);
      expect(
        new PersistentApiStore(f.p.repositories)
          .listSessionPlans(clubId)
          .find((p) => p.id === plan.id)?.status,
      ).toBe("inactive");
    } finally {
      await f.close();
    }
  });

  it("keeps scout identity private, naturally retries and enrolls the same student", async () => {
    const f = await fixture();
    try {
      expect((await f.request("GET", "scouts")).statusCode).toBe(403);
      f.p.repositories.backofficeManagement.replaceGrants(
        clubId,
        "user-admin-1",
        ["sensitive"],
      );
      const input = {
        name: "合成球探",
        identityNumber: "11010519491231002X",
        requestId: randomUUID(),
      };
      const created = await f.request("POST", "scouts", input);
      expect(created.statusCode, created.body).toBe(200);
      expect(created.body).not.toContain(input.identityNumber);
      expect((await f.request("POST", "scouts", input)).json().id).toBe(
        created.json().id,
      );
      const id = created.json().id;
      expect(
        (await f.request("GET", "resources/students"))
          .json()
          .rows.some((row: { id: string }) => row.id === id),
      ).toBe(false);
      expect(
        (
          await f.request("POST", `scouts/${id}/enroll`, {
            requestId: randomUUID(),
          })
        ).json().status,
      ).toBe("enrolled");
      expect(
        (await f.request("GET", `resources/students/${id}`)).statusCode,
      ).toBe(200);
      expect(
        f.p.repositories.backofficeManagement.history(clubId, "scouts", id),
      ).toHaveLength(2);
      expect(
        JSON.stringify(
          f.p.database.prepare("SELECT after_json FROM backoffice_audit").all(),
        ),
      ).not.toContain(input.identityNumber);
    } finally {
      await f.close();
    }
  });
  it("keeps training corrections independent of append-only finance and rejects forged associations", async () => {
    const f = await fixture();
    try {
      const denied = await f.request("GET", "resources/credits");
      expect(denied.statusCode).toBe(403);
      f.p.repositories.backofficeManagement.replaceGrants(
        clubId,
        "user-admin-1",
        ["finance"],
      );
      const student = (await f.request("GET", "resources/students")).json()
        .rows[0];
      const credit = await f.request(
        "POST",
        "resources/credits",
        saveBody({
          studentId: student.id,
          occurredAt: new Date().toISOString(),
          entryType: "adjustment",
          lessonDelta: 3,
          note: "后台合成调整",
        }),
      );
      expect(credit.statusCode, credit.body).toBe(200);
      expect(
        (
          await f.request(
            "PUT",
            `resources/credits/${credit.json().id}`,
            saveBody(credit.json().values, credit.json().revision),
          )
        ).statusCode,
      ).toBe(403);
      const before = f.p.database
        .prepare("SELECT * FROM lesson_credit_ledger ORDER BY id")
        .all();
      const row = (await f.request("GET", "training-records")).json()[0];
      expect(row).toBeDefined();
      const corrected = await f.request("PUT", "training-records", {
        eventId: row.eventId,
        studentId: row.studentId,
        expectedRevision: row.record?.revision ?? 0,
        counted: false,
        reason: "后台更正测试",
        requestId: randomUUID(),
      });
      expect(corrected.statusCode, corrected.body).toBe(200);
      expect(corrected.json().history.at(-1).actorUserId).toBe("user-admin-1");
      expect(
        f.p.database
          .prepare("SELECT * FROM lesson_credit_ledger ORDER BY id")
          .all(),
      ).toEqual(before);
      expect(
        (
          await f.request("PUT", "training-records", {
            eventId: row.eventId,
            studentId: row.studentId,
            expectedRevision: row.record?.revision ?? 0,
            counted: true,
            reason: "旧版本",
            requestId: randomUUID(),
          })
        ).statusCode,
      ).toBe(409);
    } finally {
      await f.close();
    }
  });

  it("lists explicit resource projections and exposes the same schemas in OpenAPI", async () => {
    const f = await fixture();
    try {
      for (const key of [
        "students",
        "teams",
        "coaches",
        "members",
        "assignments",
        "events",
        "venues",
        "terms",
        "articles",
        "drills",
        "memberships",
      ]) {
        const response = await f.request("GET", `resources/${key}`);
        expect(response.statusCode, `${key}: ${response.body}`).toBe(200);
        expect(response.json().fields.length).toBeGreaterThan(0);
      }
      expect((await f.request("GET", "resources/parents")).statusCode).toBe(
        403,
      );
      expect(
        (await f.request("GET", "resources/students?clubId=other")).statusCode,
      ).toBe(400);
      expect(
        (
          await f.request("GET", "resources/students", undefined, {
            "x-user-id": "user-admin-1",
            authorization: "Bearer fake",
          })
        ).statusCode,
      ).toBe(401);
      const document = (await f.server.inject("/openapi.json")).json();
      expect(
        document.paths["/backoffice/api/resources/students/{id}"].put
          .requestBody,
      ).toBeDefined();
    } finally {
      await f.close();
    }
  });
  it("commits profile, history and replay atomically, rejects stale writes and rolls back failed audit", async () => {
    const f = await fixture();
    try {
      const row = (await f.request("GET", "resources/students")).json().rows[0];
      const input = saveBody(
        { ...row.values, name: "后台更新测试" },
        row.revision,
      );
      const first = await f.request(
        "PUT",
        `resources/students/${row.id}`,
        input,
      );
      expect(first.statusCode, first.body).toBe(200);
      const replay = await f.request(
        "PUT",
        `resources/students/${row.id}`,
        input,
      );
      expect(replay.json()).toEqual(first.json());
      expect(
        f.store.listStudents(clubId).find((s) => s.id === row.id)?.name,
      ).toBe("后台更新测试");
      const detail = (
        await f.request("GET", `resources/students/${row.id}`)
      ).json();
      expect(detail.history).toHaveLength(1);
      expect(detail.history[0].before.name).toBe(row.values.name);
      expect(
        (
          await f.request(
            "PUT",
            `resources/students/${row.id}`,
            saveBody({ ...row.values, name: "过期修改" }, row.revision),
          )
        ).statusCode,
      ).toBe(409);
      expect(
        (
          await f.request("PUT", `resources/students/${row.id}`, {
            ...input,
            values: { ...input.values, name: "不同提交" },
          })
        ).statusCode,
      ).toBe(409);
      f.p.database.exec(
        "CREATE TRIGGER fail_audit BEFORE INSERT ON backoffice_audit BEGIN SELECT RAISE(ABORT,'private audit diagnostic'); END",
      );
      const failed = await f.request(
        "PUT",
        `resources/students/${row.id}`,
        saveBody(
          { ...first.json().values, name: "回滚" },
          first.json().revision,
        ),
      );
      expect(failed.statusCode).toBe(500);
      expect(failed.body).not.toContain("private audit diagnostic");
      expect(
        (await f.request("GET", `resources/students/${row.id}`)).json().record,
      ).toEqual(first.json());
      expect(
        f.store.listStudents(clubId).find((s) => s.id === row.id)?.name,
      ).toBe("后台更新测试");
    } finally {
      await f.close();
    }
  });
  it("separates sensitive permission, trims history and retry after revocation, rejects cross-club references", async () => {
    const f = await fixture();
    try {
      const row = (await f.request("GET", "resources/students")).json().rows[0];
      expect(row.values).not.toHaveProperty("notes");
      const denied = await f.request(
        "PUT",
        `resources/students/${row.id}`,
        saveBody(
          { ...row.values, notes: "private teaching note" },
          row.revision,
        ),
      );
      expect(denied.statusCode).toBe(403);
      f.p.repositories.backofficeManagement.replaceGrants(
        clubId,
        "user-admin-1",
        ["sensitive"],
      );
      const sensitive = (
        await f.request("GET", `resources/students/${row.id}`)
      ).json().record;
      const input = saveBody(
        { ...sensitive.values, notes: "private teaching note" },
        sensitive.revision,
      );
      expect(
        (await f.request("PUT", `resources/students/${row.id}`, input))
          .statusCode,
      ).toBe(200);
      f.p.repositories.backofficeManagement.replaceGrants(
        clubId,
        "user-admin-1",
        [],
      );
      expect(
        (await f.request("PUT", `resources/students/${row.id}`, input)).body,
      ).not.toContain("private teaching note");
      expect(
        (await f.request("GET", `resources/students/${row.id}`)).body,
      ).not.toContain("private teaching note");
      const team = (await f.request("GET", "resources/teams")).json().rows[0];
      expect(
        (
          await f.request(
            "PUT",
            `resources/teams/${team.id}`,
            saveBody(
              { ...team.values, defaultCoachId: "foreign-coach" },
              team.revision,
            ),
          )
        ).statusCode,
      ).toBe(400);
      expect((await f.request("GET", "resources/parents")).statusCode).toBe(
        403,
      );
      const membership =
        (await f.p.repositories.memberships.findActiveByClubAndUser(
          clubId,
          "user-admin-1",
        ))!;
      await f.p.repositories.memberships.save({
        ...membership,
        roles: ["parent"],
      });
      expect((await f.request("GET", "resources/students")).statusCode).toBe(
        401,
      );
    } finally {
      await f.close();
    }
  });
  it("persists documents and profiles across reopen without exposing draft articles", async () => {
    const root = mkdtempSync(join(tmpdir(), "fcm-management-")),
      path = join(root, "data.sqlite");
    let f = await fixture(path);
    let studentId = "",
      venueId = "";
    try {
      const created = await f.request(
        "POST",
        "resources/students",
        saveBody({ name: "新建学员", birthDate: "2015-01-02" }),
      );
      expect(created.statusCode, created.body).toBe(200);
      studentId = created.json().id;
      const venue = await f.request(
        "POST",
        "resources/venues",
        saveBody({
          name: "回读场地",
          type: "football",
          address: "测试地址",
          tags: [],
          facilities: [],
          latitude: 29.5,
          longitude: 106.5,
          status: "active",
        }),
      );
      expect(venue.statusCode, venue.body).toBe(200);
      venueId = venue.json().id;
      const draft = await f.request(
        "POST",
        "resources/articles",
        saveBody({
          title: "未发布测试",
          subtitle: "摘要",
          category: "notice",
          status: "draft",
        }),
      );
      expect(draft.statusCode, draft.body).toBe(200);
      expect(
        f.store
          .listContentArticles(clubId)
          .some((a) => a.id === draft.json().id),
      ).toBe(false);
      await f.close();
      f = await fixture(path, false);
      expect(
        (await f.request("GET", `resources/students/${studentId}`)).json()
          .record.values.name,
      ).toBe("新建学员");
      expect(f.store.listStudents(clubId).some((s) => s.id === studentId)).toBe(
        true,
      );
      expect(
        f.store.listVenues(clubId).find((v) => v.id === venueId)?.name,
      ).toBe("回读场地");
      expect(
        (await f.request("GET", `resources/venues/${venueId}`)).json().history,
      ).toHaveLength(1);
    } finally {
      await f.close();
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("creates training/match/other canonical extensions and validates time and type", async () => {
    const f = await fixture();
    try {
      for (const type of ["training", "match", "other"]) {
        const values = {
          title: `测试${type}`,
          type,
          startsAt: "2026-11-01T09:00:00.000Z",
          endsAt: "2026-11-01T10:00:00.000Z",
          status: "scheduled",
          ...(type === "training"
            ? { kind: "team" }
            : type === "match"
              ? { matchType: "friendly", opponentName: "测试对手" }
              : {}),
        };
        const response = await f.request(
          "POST",
          "resources/events",
          saveBody(values),
        );
        expect(response.statusCode, response.body).toBe(200);
        const id = response.json().id;
        if (type === "training")
          expect(
            f.p.repositories.trainingSessions.getByEvent(clubId, id)?.kind,
          ).toBe("team");
        if (type === "match")
          expect(
            f.p.repositories.matches
              .listMatches(clubId)
              .find((m) => m.eventId === id)?.opponentName,
          ).toBe("测试对手");
        const edit = await f.request(
          "PUT",
          `resources/events/${id}`,
          saveBody(
            { ...response.json().values, type: "other" },
            response.json().revision,
          ),
        );
        expect(edit.statusCode).toBe(type === "other" ? 200 : 400);
      }
      const response = await f.request(
        "POST",
        "resources/events",
        saveBody({
          title: "错误时间",
          type: "other",
          startsAt: "2026-11-01T10:00:00Z",
          endsAt: "2026-11-01T09:00:00Z",
          status: "scheduled",
        }),
      );
      expect(response.statusCode).toBe(400);
    } finally {
      await f.close();
    }
  });
});
