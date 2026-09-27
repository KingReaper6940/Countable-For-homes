import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { AuditEvent, Claim, Coverage, Evidence, HousingEvent, ProjectDetail, ProjectSummary, Relationship, Scope, SourceRecord } from './types';
import { candidateBlockers, extractClaims, findBuildingLabel, supportedQuote } from './rules';

type Row = Record<string, unknown>;
const DATA_DIR = join(process.cwd(), 'data');
const STATE_DIR = join(process.cwd(), '.countable');
const SNAPSHOT = join(DATA_DIR, 'permits.snapshot.json');
const MANIFEST = join(DATA_DIR, 'source-manifest.json');
const OCCUPANCY_EVIDENCE = join(DATA_DIR, 'occupancy-evidence.json');
const DB_PATH = process.env.COUNTABLE_DB_PATH && isAbsolute(process.env.COUNTABLE_DB_PATH) ? process.env.COUNTABLE_DB_PATH : process.env.COUNTABLE_DB_PATH ? join(/* turbopackIgnore: true */ process.cwd(), process.env.COUNTABLE_DB_PATH) : join(STATE_DIR, 'countable.db');
const UPLOAD_DIR = join(STATE_DIR, 'uploads');
const sourceUrl = 'https://data.wprdc.org/dataset/pli-permits';

let connection: Database.Database | undefined;
function db(): Database.Database {
  if (connection) return connection;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  connection = new Database(DB_PATH);
  connection.pragma('journal_mode = WAL');
  connection.pragma('foreign_keys = ON');
  connection.exec(`
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, scope TEXT NOT NULL, name TEXT NOT NULL, subtitle TEXT NOT NULL, parcel TEXT NOT NULL, address TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, permit_id TEXT NOT NULL, type TEXT NOT NULL, description TEXT NOT NULL, work_type TEXT NOT NULL, issue_date TEXT, parcel TEXT NOT NULL, address TEXT NOT NULL, status TEXT NOT NULL, building_label TEXT, source_url TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS claims (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, record_id TEXT NOT NULL, kind TEXT NOT NULL, units INTEGER NOT NULL, quote TEXT NOT NULL, review_status TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS relationships (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, from_record_id TEXT NOT NULL, to_record_id TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL, reason TEXT NOT NULL, source_quote TEXT);
    CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, type TEXT NOT NULL, label TEXT NOT NULL, text TEXT NOT NULL, source_ref TEXT NOT NULL, page_ref TEXT, synthetic INTEGER NOT NULL, extraction_status TEXT NOT NULL, created_at TEXT NOT NULL, original_file_name TEXT, sha256 TEXT);
    CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, kind TEXT NOT NULL, building_label TEXT, units INTEGER, event_date TEXT, status TEXT NOT NULL, source_record_ids TEXT NOT NULL, evidence_ids TEXT NOT NULL, review_decision_id TEXT, pending_evidence_id TEXT);
    CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, action TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT NOT NULL, reason TEXT NOT NULL, at TEXT NOT NULL, details TEXT NOT NULL);
  `);
  const evidenceCols=(connection.prepare('PRAGMA table_info(evidence)').all() as {name:string}[]).map(x=>x.name);
  if (!evidenceCols.includes('original_file_name')) connection.exec('ALTER TABLE evidence ADD COLUMN original_file_name TEXT');
  if (!evidenceCols.includes('sha256')) connection.exec('ALTER TABLE evidence ADD COLUMN sha256 TEXT');
  const eventCols=(connection.prepare('PRAGMA table_info(events)').all() as {name:string}[]).map(x=>x.name);
  if (!eventCols.includes('pending_evidence_id')) connection.exec('ALTER TABLE events ADD COLUMN pending_evidence_id TEXT');
  removeLegacySandbox(connection);
  seed(connection);
  seedCityOccupancyEvidence(connection);
  return connection;
}

function removeLegacySandbox(sql:Database.Database) {
  const projectId='development-10c-sandbox';
  const legacy=sql.prepare('SELECT scope FROM projects WHERE id=?').get(projectId) as {scope:string}|undefined;
  if (!legacy || !['synthetic','retired'].includes(legacy.scope)) return;
  const fileIds=(sql.prepare('SELECT id FROM evidence WHERE project_id=? AND original_file_name IS NOT NULL').all(projectId) as {id:string}[]).map(row=>row.id);
  sql.transaction(()=>{
    for (const table of ['audit','events','evidence','relationships','claims','records']) sql.prepare(`DELETE FROM ${table} WHERE project_id=?`).run(projectId);
    sql.prepare("DELETE FROM projects WHERE id=? AND scope IN ('synthetic','retired')").run(projectId);
  })();
  // Uploads use generated UUIDs in this one workspace directory. No other file is touched.
  const uploadRoot=resolve(UPLOAD_DIR);
  for (const id of fileIds) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) continue;
    const path=resolve(uploadRoot,`${id}.pdf`);
    if (dirname(path)===uploadRoot && existsSync(path)) unlinkSync(path);
  }
}

function snapshot(): { retrievedAt?: string; sourceUrl?: string; records: Record<string, unknown>[] } | null {
  if (!existsSync(SNAPSHOT)) return null;
  try { return JSON.parse(readFileSync(SNAPSHOT, 'utf8')); } catch { return null; }
}

function recordSourceUrls(): Map<string,string> {
  if (!existsSync(MANIFEST)) return new Map();
  try {
    const manifest=JSON.parse(readFileSync(MANIFEST,'utf8')) as {queries?:{permit_id:string;url:string}[]};
    return new Map((manifest.queries??[]).map(q=>[q.permit_id,q.url]));
  } catch { return new Map(); }
}

function seed(sql: Database.Database) {
  const snap = snapshot();
  if (!snap?.records?.length) return;
  const sourceUrls=recordSourceUrls();
  sql.prepare('INSERT OR REPLACE INTO meta(key,value) VALUES (?,?)').run('snapshotAt', snap.retrievedAt ?? '');
  sql.prepare('INSERT OR REPLACE INTO meta(key,value) VALUES (?,?)').run('sourceUrl', snap.sourceUrl ?? sourceUrl);
  const projects = [
    { id:'development-10c',scope:'real',name:'Bedford Phase 2A',subtitle:'Multi-building development · Bedford Dwellings',parcel:'0010C00100000000',address:'2702 Lucas Ct' },
    { id:'conversion-12k',scope:'real',name:'South 20th Street conversion',subtitle:'Office to residential · South Side Flats',parcel:'0012K00286000000',address:'142 S 20th St' },
    { id:'cohort-two-unit',scope:'real',name:'Two-unit alteration claim',subtitle:'Additional review cohort · increment unresolved',parcel:'0026J00180000000',address:'Source address in permit record' },
    { id:'cohort-conversion',scope:'real',name:'Multifamily conversion claim',subtitle:'Additional review cohort · housing loss unverified',parcel:'0051G00233000000',address:'Source address in permit record' },
    { id:'cohort-revoked',scope:'real',name:'Revoked three-unit application',subtitle:'Additional review cohort · no verified addition',parcel:'0009N00031000000',address:'Source address in permit record' },
  ];
  const projectByPermit:Record<string,string>={
    'BDA-2024-00844':'cohort-two-unit','BP-2023-03827':'cohort-conversion','BP-2022-11140':'cohort-revoked',
  };
  const pInsert = sql.prepare('INSERT OR IGNORE INTO projects(id,scope,name,subtitle,parcel,address) VALUES (@id,@scope,@name,@subtitle,@parcel,@address)');
  const rInsert = sql.prepare('INSERT OR IGNORE INTO records(id,project_id,permit_id,type,description,work_type,issue_date,parcel,address,status,building_label,source_url) VALUES (@id,@projectId,@permitId,@type,@description,@workType,@issueDate,@parcel,@address,@status,@buildingLabel,@sourceUrl)');
  const rUpdate = sql.prepare('UPDATE records SET type=@type,description=@description,work_type=@workType,issue_date=@issueDate,parcel=@parcel,address=@address,status=@status,building_label=@buildingLabel,source_url=@sourceUrl WHERE id=@id');
  const cInsert = sql.prepare('INSERT OR IGNORE INTO claims(id,project_id,record_id,kind,units,quote,review_status) VALUES (@id,@projectId,@recordId,@kind,@units,@quote,@reviewStatus)');
  const cExists = sql.prepare('SELECT 1 FROM claims WHERE record_id=? AND kind=? AND units=? AND quote=? LIMIT 1');
  const relInsert = sql.prepare('INSERT OR IGNORE INTO relationships(id,project_id,from_record_id,to_record_id,type,status,reason,source_quote) VALUES (@id,@projectId,@fromRecordId,@toRecordId,@type,@status,@reason,@sourceQuote)');
  const eventInsert = sql.prepare('INSERT OR IGNORE INTO events(id,project_id,kind,building_label,units,event_date,status,source_record_ids,evidence_ids,review_decision_id) VALUES (@id,@projectId,@kind,@buildingLabel,@units,@eventDate,@status,@sourceRecordIds,@evidenceIds,@reviewDecisionId)');
  sql.transaction(() => {
    for (const p of projects) pInsert.run(p);
    for (const raw of snap.records) {
      const permitId = String(raw.permit_id ?? '');
      const base = projectByPermit[permitId] ?? (permitId.startsWith('BP-2020') || permitId.startsWith('EP-2021') ? 'conversion-12k' : 'development-10c');
      const targets = [base];
      for (const projectId of targets) {
        const rec: SourceRecord = {
          id:`${projectId}:${permitId}`,permitId,type:String(raw.permit_type ?? ''),description:String(raw.work_description ?? ''),
          workType:String(raw.work_type ?? ''),issueDate:raw.issue_date ? String(raw.issue_date) : null,
          parcel:String(raw.parcel_num ?? ''),address:String(raw.address ?? ''),status:String(raw.status ?? ''),
          buildingLabel:findBuildingLabel(String(raw.work_description ?? '')),
          sourceUrl:sourceUrls.get(permitId)??sourceUrl,
        };
        const prior=sql.prepare('SELECT * FROM records WHERE id=?').get(rec.id) as Row|undefined;
        const sourceChanged=!!prior && (String(prior.description)!==rec.description || String(prior.status)!==rec.status || String(prior.issue_date??'')!==String(rec.issueDate??''));
        const metadataChanged=!!prior && (String(prior.building_label??'')!==String(rec.buildingLabel??'') || String(prior.source_url)!==rec.sourceUrl);
        if (prior && (sourceChanged || metadataChanged)) {
          rUpdate.run(rec);
          if (sourceChanged) {
            sql.prepare("UPDATE events SET status='evidence-awaiting-review',review_decision_id=NULL WHERE project_id=? AND status='verified-addition'").run(projectId);
            sql.prepare("UPDATE relationships SET status='proposed' WHERE project_id=? AND status='approved' AND (from_record_id=? OR to_record_id=?)").run(projectId,rec.id,rec.id);
            sql.prepare("UPDATE claims SET review_status='proposed' WHERE record_id=? AND review_status='approved'").run(rec.id);
            const priorClaims=sql.prepare("SELECT id,quote,review_status FROM claims WHERE record_id=?").all(rec.id) as {id:string;quote:string;review_status:string}[];
            for (const oldClaim of priorClaims) if (!supportedQuote(rec.description,oldClaim.quote)) {
              sql.prepare("UPDATE claims SET review_status='rejected' WHERE id=?").run(oldClaim.id);
              addAudit(projectId,'source_claim_superseded','claim',oldClaim.id,'The source description changed and no longer contains this quote',{quote:oldClaim.quote});
            }
            addAudit(projectId,'source_updated','record',rec.id,'Source permit changed; prior conclusions require re-review',{oldStatus:prior.status,newStatus:rec.status});
          }
        } else if (!prior) rInsert.run({ ...rec, projectId, buildingLabel:rec.buildingLabel });
        for (const claim of extractClaims(rec)) if (!cExists.get(rec.id,claim.kind,claim.units,claim.quote)) cInsert.run({ ...claim, projectId, recordId:rec.id, reviewStatus:claim.reviewStatus });
      }
    }
    for (const projectId of ['development-10c']) {
      const r = (x:string) => `${projectId}:${x}`;
      const rels: Omit<Relationship,'status'>[] = [
        {id:`${projectId}:parent-a3`,fromRecordId:r('BDA-2024-03554'),toRecordId:r('BP-2024-13992'),type:'parent-project',reason:'Parent states 70 units across eight buildings; A3 is one separately permitted building.',sourceQuote:'70 NEW UNITS IN 8 NEW BUILDINGS'},
        {id:`${projectId}:parent-a4`,fromRecordId:r('BDA-2024-03554'),toRecordId:r('BP-2024-13991'),type:'parent-project',reason:'A4 is a distinct building on the same parcel.',sourceQuote:'70 NEW UNITS IN 8 NEW BUILDINGS'},
        {id:`${projectId}:parent-a7`,fromRecordId:r('BDA-2024-03554'),toRecordId:r('BP-2024-13989'),type:'parent-project',reason:'A7 is a distinct building on the same parcel.',sourceQuote:'70 NEW UNITS IN 8 NEW BUILDINGS'},
        {id:`${projectId}:parent-a8`,fromRecordId:r('BDA-2024-03554'),toRecordId:r('BP-2025-00108'),type:'parent-project',reason:'A8 is a distinct building on the same parcel.',sourceQuote:'70 NEW UNITS IN 8 NEW BUILDINGS'},
        {id:`${projectId}:trade-a3`,fromRecordId:r('SSP-2025-03861'),toRecordId:r('BP-2024-13992'),type:'supporting-trade',reason:'Sprinkler text explicitly references the A3 building permit and repeats nine apartments.',sourceQuote:'BP-2024-13992'},
        {id:`${projectId}:temporary-a3`,fromRecordId:r('BDA-2026-05107'),toRecordId:r('BP-2024-13992'),type:'occupancy-related',reason:'Temporary-use application references A3 permit; applicability and conditions require review.',sourceQuote:'BP-2024-13992'},
      ];
      for (const rel of rels) relInsert.run({ ...rel, projectId, status:'proposed' });
      const evId = `${projectId}:A3:addition`;
      eventInsert.run({id:evId,projectId,kind:'addition',buildingLabel:'A3',units:9,eventDate:null,status:'evidence-awaiting-review',sourceRecordIds:JSON.stringify([r('BP-2024-13992')]),evidenceIds:'[]',reviewDecisionId:null});
      for (const [label,permitId,units] of [['A4','BP-2024-13991',9],['A7','BP-2024-13989',9],['A8','BP-2025-00108',13]] as const) {
        eventInsert.run({id:`${projectId}:${label}:addition`,projectId,kind:'addition',buildingLabel:label,units,eventDate:null,status:'evidence-awaiting-review',sourceRecordIds:JSON.stringify([r(permitId)]),evidenceIds:'[]',reviewDecisionId:null});
      }
    }
    relInsert.run({id:'conversion-12k:trade',projectId:'conversion-12k',fromRecordId:'conversion-12k:EP-2021-10918',toRecordId:'conversion-12k:BP-2020-11373',type:'supporting-trade',status:'proposed',reason:'Electrical record repeats the building description and does not establish a second addition.',sourceQuote:'ADD A DWELLING UNIT'});
    eventInsert.run({id:'conversion-12k:conversion:addition',projectId:'conversion-12k',kind:'addition',buildingLabel:null,units:1,eventDate:null,status:'documented-permitted-change',sourceRecordIds:JSON.stringify(['conversion-12k:BP-2020-11373']),evidenceIds:'[]',reviewDecisionId:null});
  })();
}

function seedCityOccupancyEvidence(sql: Database.Database) {
  if (!existsSync(OCCUPANCY_EVIDENCE)) return;
  const priorRun=sql.prepare("SELECT value FROM meta WHERE key='cityOccupancyEvidenceVersion'").get() as {value:string}|undefined;
  if (priorRun?.value==='1') return;
  const source=JSON.parse(readFileSync(OCCUPANCY_EVIDENCE,'utf8')) as {
    projectId:string;eventId:string;evidence:{id:string;label:string;text:string;sourceRef:string;pageRef:string;originalSha256:string}[];
  };
  sql.transaction(()=>{
    const project=sql.prepare('SELECT id FROM projects WHERE id=?').get(source.projectId);
    const event=sql.prepare('SELECT evidence_ids FROM events WHERE id=? AND project_id=?').get(source.eventId,source.projectId) as {evidence_ids:string}|undefined;
    if (!project || !event || source.evidence.length!==2) return;
    const insert=sql.prepare("INSERT OR IGNORE INTO evidence(id,project_id,type,label,text,source_ref,page_ref,synthetic,extraction_status,created_at,original_file_name,sha256) VALUES (?,?, 'occupancy',?,?,?,?,0,'ready',?,NULL,?)");
    for (const evidence of source.evidence) insert.run(evidence.id,source.projectId,evidence.label,evidence.text,evidence.sourceRef,evidence.pageRef,new Date().toISOString(),evidence.originalSha256);
    const evidenceIds=[...new Set([...JSON.parse(event.evidence_ids) as string[],...source.evidence.map(item=>item.id)])];
    sql.prepare("UPDATE events SET evidence_ids=?,pending_evidence_id=?,status='evidence-awaiting-review',review_decision_id=NULL WHERE id=?").run(JSON.stringify(evidenceIds),source.evidence[1].id,source.eventId);
    addAudit(source.projectId,'source_evidence_added','event',source.eventId,'Two City occupancy certificates added for reviewer comparison',{evidenceIds:source.evidence.map(item=>item.id)});
    sql.prepare("INSERT OR REPLACE INTO meta(key,value) VALUES ('cityOccupancyEvidenceVersion','1')").run();
  })();
}

const mapRecord = (r:Row): SourceRecord => ({id:String(r.id),permitId:String(r.permit_id),type:String(r.type),description:String(r.description),workType:String(r.work_type),issueDate:r.issue_date ? String(r.issue_date) : null,parcel:String(r.parcel),address:String(r.address),status:String(r.status),buildingLabel:r.building_label ? String(r.building_label) : null,sourceUrl:String(r.source_url)});
const mapClaim = (r:Row): Claim => ({id:String(r.id),recordId:String(r.record_id),kind:r.kind as Claim['kind'],units:Number(r.units),quote:String(r.quote),reviewStatus:r.review_status as Claim['reviewStatus']});
const mapRel = (r:Row): Relationship => ({id:String(r.id),fromRecordId:String(r.from_record_id),toRecordId:String(r.to_record_id),type:r.type as Relationship['type'],status:r.status as Relationship['status'],reason:String(r.reason),sourceQuote:r.source_quote ? String(r.source_quote) : null});
const mapEvidence = (r:Row): Evidence => ({id:String(r.id),type:r.type as Evidence['type'],label:String(r.label),text:String(r.text),sourceRef:String(r.source_ref),pageRef:r.page_ref ? String(r.page_ref) : null,synthetic:Boolean(r.synthetic),extractionStatus:r.extraction_status as Evidence['extractionStatus'],createdAt:String(r.created_at),originalFileUrl:r.original_file_name?`/api/evidence/${r.id}/file`:null,sha256:r.sha256?String(r.sha256):null});
const mapAudit = (r:Row): AuditEvent => ({id:String(r.id),action:String(r.action),targetType:String(r.target_type),targetId:String(r.target_id),reason:String(r.reason),at:String(r.at),details:JSON.parse(String(r.details))});
const mapEvent = (r:Row,evidence:Evidence[]): HousingEvent => {
  const ev: HousingEvent = {id:String(r.id),kind:'addition',buildingLabel:r.building_label ? String(r.building_label) : null,units:r.units === null ? null : Number(r.units),eventDate:r.event_date ? String(r.event_date) : null,status:r.status as HousingEvent['status'],blockers:[],sourceRecordIds:JSON.parse(String(r.source_record_ids)),evidenceIds:JSON.parse(String(r.evidence_ids)),reviewDecisionId:r.review_decision_id ? String(r.review_decision_id) : null,pendingEvidenceId:r.pending_evidence_id ? String(r.pending_evidence_id) : null};
  ev.blockers = candidateBlockers(ev,evidence);
  return ev;
};

export function getCoverage(): Coverage {
  const sql = db();
  const snapAt = sql.prepare("SELECT value FROM meta WHERE key='snapshotAt'").get() as {value:string}|undefined;
  const count = sql.prepare("SELECT COUNT(*) n FROM records r JOIN projects p ON p.id=r.project_id WHERE p.scope='real'").get() as {n:number};
  const cases = sql.prepare("SELECT COUNT(DISTINCT p.id) n FROM projects p JOIN records r ON r.project_id=p.id WHERE p.scope='real'").get() as {n:number};
  return {snapshotAt:snapAt?.value || null,sourceUrl,recordCount:count.n,caseCount:cases.n,note:'Twelve selected permit records plus two City occupancy certificates for the South 20th Street case. This is not citywide coverage.'};
}

export function getProject(id:string): ProjectDetail | null {
  const sql=db();
  const p=sql.prepare('SELECT * FROM projects WHERE id=?').get(id) as Row|undefined;
  if (!p || p.scope!=='real') return null;
  const rows=(table:string)=>sql.prepare(`SELECT * FROM ${table} WHERE project_id=?`).all(id) as Row[];
  const records=rows('records').map(mapRecord);
  const claims=rows('claims').map(mapClaim);
  const relationships=rows('relationships').map(mapRel);
  const evidence=rows('evidence').map(mapEvidence);
  const events=rows('events').map(r=>mapEvent(r,evidence));
  const audit=(sql.prepare('SELECT * FROM audit WHERE project_id=? ORDER BY at DESC, rowid DESC').all(id) as Row[]).map(mapAudit);
  const verified=events.filter(e=>e.status==='verified-addition' && e.reviewDecisionId);
  const unresolved=events.flatMap(e=>e.blockers).filter((x,i,a)=>a.indexOf(x)===i);
  if (id==='development-10c') unresolved.push('Only four of the eight buildings named by the parent claim are in this snapshot; the parent total may have amendments.');
  if (id==='conversion-12k'&&!verified.length) unresolved.push('Compare the prior one-dwelling certificate with the newer two-dwelling certificate before reviewing the proposed +1 addition.');
  if (id==='cohort-two-unit') unresolved.push('Two-unit resulting residence is described; the net additional units are unknown.');
  if (id==='cohort-conversion') unresolved.push('An 11-to-8 description does not establish a completed housing-loss event.');
  if (id==='cohort-revoked') unresolved.push('Revoked application does not establish a completed addition or occupancy.');
  const claim=(kind:Claim['kind'],predicate?:(c:Claim)=>boolean)=>claims.find(c=>c.kind===kind&&c.reviewStatus!=='rejected'&&(!predicate||predicate(c)))?.units;
  const statusByRecord=new Map(records.map(r=>[r.id,r]));
  let claimSummary='Unit claim requires review; increment unknown';
  if (id==='development-10c') {
    const total=claim('project-total');
    const buildingCount=new Set(records.filter(r=>r.buildingLabel&&r.type.toUpperCase()==='BUILDING').map(r=>r.buildingLabel)).size;
    claimSummary=`Parent source claims ${total??'unknown'} units; ${buildingCount} distinct building permits sampled`;
  } else if (id==='conversion-12k') {
    const buildingClaim=(kind:Claim['kind'])=>claim(kind,c=>statusByRecord.get(c.recordId)?.type.toUpperCase()==='BUILDING');
    claimSummary=`${buildingClaim('addition')??'Unknown'} added dwelling; ${buildingClaim('resulting')??'unknown'} resulting units`;
  } else if (id==='cohort-two-unit') claimSummary=`${claim('resulting')??'Unknown'} resulting units; increment unknown`;
  else if (id==='cohort-conversion') claimSummary=`${claim('existing')??'Unknown'}-to-${claim('resulting')??'unknown'} conversion described; completed loss unverified`;
  else if (id==='cohort-revoked') claimSummary=`${claim('resulting')??'Unknown'}-unit change of use proposed; application revoked`;
  const summary:ProjectSummary={id,scope:p.scope as Scope,name:String(p.name),subtitle:String(p.subtitle),parcel:String(p.parcel),address:records[0]?.address??String(p.address),recordCount:records.length,claimSummary,reviewStatus:verified.length ? 'verified-addition' : events[0]?.status ?? 'unresolved',unresolved,verifiedUnits:verified.length ? verified.reduce((n,e)=>n+(e.units??0),0) : null};
  return {project:summary,records,claims,relationships,evidence,events,audit,mode:process.env.OPENAI_API_KEY ? 'live':'rules-only'};
}

export function listProjects() {
  const ids=(db().prepare("SELECT id FROM projects WHERE scope='real' ORDER BY id").all() as {id:string}[]).map(x=>x.id);
  return {projects:ids.map(id=>getProject(id)!.project),coverage:getCoverage(),mode:process.env.OPENAI_API_KEY ? 'live' as const : 'rules-only' as const};
}

export function findEvidence(id:string): {projectId:string;evidence:Evidence}|null {
  const row=db().prepare("SELECT e.* FROM evidence e JOIN projects p ON p.id=e.project_id WHERE e.id=? AND p.scope='real'").get(id) as Row|undefined;
  return row ? {projectId:String(row.project_id),evidence:mapEvidence(row)} : null;
}

export function addAudit(projectId:string,action:string,targetType:string,targetId:string,reason:string,details:Record<string,unknown>={}) {
  const entry={id:randomUUID(),projectId,action,targetType,targetId,reason,at:new Date().toISOString(),details:JSON.stringify(details)};
  db().prepare('INSERT INTO audit(id,project_id,action,target_type,target_id,reason,at,details) VALUES (@id,@projectId,@action,@targetType,@targetId,@reason,@at,@details)').run(entry);
  return entry.id;
}

export function saveEvidence(input:{projectId:string;type:'permit'|'occupancy'|'other';label:string;text:string;sourceRef:string;pageRef:string|null;synthetic:boolean;extractionStatus:'ready'|'manual-needed';originalFile?:{name:string;bytes:Buffer};relatedEventId?:string|null}):Evidence {
  const sql=db();
  const project=getProject(input.projectId);
  if (!project) throw new Error('Unknown project');
  if (input.synthetic) throw new Error('Invented evidence cannot be added to a real project.');
  if (input.relatedEventId && !project.events.some(e=>e.id===input.relatedEventId)) throw new Error('Related housing event is not in this project.');
  const id=randomUUID();
  const sha256=input.originalFile?createHash('sha256').update(input.originalFile.bytes).digest('hex'):null;
  const entry:Evidence={id,type:input.type,label:input.label,text:input.text,sourceRef:input.sourceRef,pageRef:input.pageRef,synthetic:input.synthetic,extractionStatus:input.extractionStatus,createdAt:new Date().toISOString(),originalFileUrl:input.originalFile?`/api/evidence/${id}/file`:null,sha256};
  if (input.originalFile) { mkdirSync(UPLOAD_DIR,{recursive:true}); writeFileSync(join(UPLOAD_DIR,`${id}.pdf`),input.originalFile.bytes,{flag:'wx'}); }
  sql.transaction(()=>{
    sql.prepare('INSERT INTO evidence(id,project_id,type,label,text,source_ref,page_ref,synthetic,extraction_status,created_at,original_file_name,sha256) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(entry.id,input.projectId,entry.type,entry.label,entry.text,entry.sourceRef,entry.pageRef,Number(entry.synthetic),entry.extractionStatus,entry.createdAt,input.originalFile?.name??null,sha256);
    if (input.relatedEventId) {
      const related=project.events.find(e=>e.id===input.relatedEventId)!;
      const evidenceIds=[...new Set([...related.evidenceIds,entry.id])];
      sql.prepare("UPDATE events SET evidence_ids=?,pending_evidence_id=?,status='evidence-awaiting-review',review_decision_id=NULL WHERE id=?").run(JSON.stringify(evidenceIds),entry.id,input.relatedEventId);
    }
    addAudit(input.projectId,'add_evidence','evidence',entry.id,'New evidence added for review',{label:entry.label,sourceRef:entry.sourceRef,relatedEventId:input.relatedEventId??null});
  })();
  return entry;
}

export function getOriginalPdf(id:string):{bytes:Buffer;fileName:string}|null {
  const row=db().prepare("SELECT e.original_file_name FROM evidence e JOIN projects p ON p.id=e.project_id WHERE e.id=? AND p.scope='real'").get(id) as {original_file_name:string|null}|undefined;
  if (!row?.original_file_name || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const path=join(UPLOAD_DIR,`${id}.pdf`);
  return existsSync(path)?{bytes:readFileSync(path),fileName:row.original_file_name}:null;
}

export function sqlConnection() { return db(); }
