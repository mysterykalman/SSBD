#!/usr/bin/env python3
"""One-time pretrainer for Pam's frozen offline 20 Questions model."""
from __future__ import annotations
import argparse,csv,gzip,hashlib,json,os,sqlite3,struct,time,urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
QFILE=ROOT/'data/pam20q/canonical-questions.json'; WORK=ROOT/'.dev-data/pam20q'
RANK={'accepted':100,'external':80,'hierarchy':70,'ai':50}; UNKNOWN=255; SCALE=254
ALIASES={'alive':'living','food':'food_drink','air':'aircraft','fly':'flies','swim':'swims','fur':'fur_hair','big':'larger_than_person','danger':'dangerous','naturalPlace':'natural_place','sea':'watercraft','rail':'rail_vehicle','road':'road_vehicle','wearable':'clothing','upperBody':'clothing','legwear':'clothing','household':'home','indoors':'home','work':'school_office','school':'school_office','water':'water_associated','fruit':'fruit_food','vegetable':'vegetable_food','preparedFood':'prepared_food','specificPerson':'real_person','opens':'opens_closes'}

def conn(path):
 path.parent.mkdir(parents=True,exist_ok=True); d=sqlite3.connect(path); d.row_factory=sqlite3.Row
 d.executescript('''PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS concepts(concept_id TEXT PRIMARY KEY,name TEXT NOT NULL,rank INTEGER DEFAULT 0); CREATE TABLE IF NOT EXISTS questions(question_id TEXT PRIMARY KEY,text TEXT NOT NULL,qgroup TEXT NOT NULL,parents_json TEXT NOT NULL); CREATE TABLE IF NOT EXISTS cells(concept_id TEXT,question_id TEXT,probability REAL,confidence REAL,source_kind TEXT,source_ref TEXT,precedence INTEGER,PRIMARY KEY(concept_id,question_id)); CREATE TABLE IF NOT EXISTS evidence(id INTEGER PRIMARY KEY,concept_id TEXT,question_id TEXT,probability REAL,confidence REAL,source_kind TEXT,source_ref TEXT,accepted INTEGER DEFAULT 0); CREATE TABLE IF NOT EXISTS ai_batches(batch_key TEXT PRIMARY KEY,status TEXT,request_json TEXT,response_json TEXT,updated_at INTEGER); CREATE TABLE IF NOT EXISTS contradictions(concept_id TEXT,child_question_id TEXT,parent_question_id TEXT,child_probability REAL,parent_probability REAL,status TEXT,PRIMARY KEY(concept_id,child_question_id,parent_question_id));'''); return d

def load_questions(d,path):
 qs=json.loads(path.read_text())['questions']; ids={q['id'] for q in qs}
 if not 80<=len(qs)<=150: raise SystemExit(f'question count outside 80-150: {len(qs)}')
 for q in qs:
  if any(p not in ids for p in q.get('parents',[])): raise SystemExit(f"bad parent on {q['id']}")
  d.execute('INSERT OR REPLACE INTO questions VALUES(?,?,?,?)',(q['id'],q['text'],q['group'],json.dumps(q.get('parents',[]))))
 d.commit()

def norm(v):
 if v is None:return None
 if isinstance(v,(int,float)) and not isinstance(v,bool) and 0<=float(v)<=1:return float(v),.98
 s=str(v).strip().lower()
 if s in ('','unknown','blank','null','none','?'):return None
 if s in ('y','yes','true','1'):return .99,.995
 if s in ('n','no','false','0'):return .01,.995
 if s in ('s','sometimes','maybe','depends','it depends'):return .5,.9
 try:
  x=float(s); return (x,.98) if 0<=x<=1 else None
 except ValueError:return None

def put(d,c,q,p,conf,kind,ref=''):
 q=ALIASES.get(q,q)
 if not d.execute('SELECT 1 FROM questions WHERE question_id=?',(q,)).fetchone():return False
 cur=d.execute('SELECT precedence,confidence FROM cells WHERE concept_id=? AND question_id=?',(c,q)).fetchone(); prec=RANK[kind]
 if cur and (cur['precedence']>prec or (cur['precedence']==prec and cur['confidence']>=conf)):return False
 d.execute('INSERT OR REPLACE INTO cells VALUES(?,?,?,?,?,?,?)',(c,q,max(0,min(1,p)),max(0,min(1,conf)),kind,ref,prec)); return True

def inventory(d,path):
 with path.open(newline='',encoding='utf-8-sig') as f:
  for i,r in enumerate(csv.DictReader(f),1):
   c=str(r.get('concept_id') or r.get('id') or r.get('name') or '').strip(); n=str(r.get('name') or r.get('concept') or c).strip()
   if c and n:d.execute('INSERT OR IGNORE INTO concepts VALUES(?,?,?)',(c,n,int(float(r.get('rank') or i))))
 d.commit()

def cols(d,t):return {r[1] for r in d.execute('PRAGMA table_info("'+t.replace('"','""')+'")')}

def accepted_sqlite(d,path):
 s=sqlite3.connect(path); s.row_factory=sqlite3.Row; valid={r[0] for r in d.execute('SELECT question_id FROM questions')}; wide=valid|set(ALIASES)
 for (t,) in s.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"):
  cs=cols(s,t); idc=next((x for x in ('concept_id','id','key') if x in cs),None); namec=next((x for x in ('name','concept','label','display_name') if x in cs),None)
  if not idc and not namec:continue
  normed='question_id' in cs and any(x in cs for x in ('answer','value','response','probability')); vc=next((x for x in ('answer','value','response','probability') if x in cs),None)
  for r in s.execute('SELECT * FROM "'+t.replace('"','""')+'"'):
   c=str(r[idc] if idc else r[namec]).strip(); n=str(r[namec] if namec else c).strip()
   if not c:continue
   d.execute('INSERT OR IGNORE INTO concepts VALUES(?,?,0)',(c,n))
   pairs=[(str(r['question_id']),r[vc])] if normed else [(q,r[q]) for q in cs&wide]
   for q,v in pairs:
    x=norm(v)
    if x and put(d,c,q,*x,'accepted',f'sqlite:{t}'):
     d.execute('INSERT INTO evidence(concept_id,question_id,probability,confidence,source_kind,source_ref,accepted) VALUES(?,?,?,?,?,?,1)',(c,ALIASES.get(q,q),x[0],x[1],'accepted',f'sqlite:{t}'))
 d.commit(); s.close()

def external(d,paths):
 names={r['name'].casefold():r['concept_id'] for r in d.execute('SELECT concept_id,name FROM concepts')}
 for p in paths:
  fh=None
  if p.suffix.lower() in ('.jsonl','.ndjson'): rows=(json.loads(x) for x in p.read_text().splitlines() if x.strip())
  else: fh=p.open(newline='',encoding='utf-8-sig'); rows=csv.DictReader(fh)
  for r in rows:
   c=str(r.get('concept_id') or '').strip() or names.get(str(r.get('concept') or r.get('name') or '').strip().casefold(),''); q=str(r.get('question_id') or r.get('trait') or '').strip()
   if not c or not q:continue
   x=norm(r.get('probability') if r.get('probability') not in (None,'') else r.get('answer'))
   if not x:continue
   p0,cf=x; cf=float(r.get('confidence') or cf); src=str(r.get('source') or p.name)
   d.execute('INSERT INTO evidence(concept_id,question_id,probability,confidence,source_kind,source_ref) VALUES(?,?,?,?,?,?)',(c,ALIASES.get(q,q),p0,cf,'external',src))
   if cf>=.75:put(d,c,q,p0,cf,'external',src)
  if fh:fh.close()
 d.commit()

def hierarchy(d):
 parents={r['question_id']:json.loads(r['parents_json']) for r in d.execute('SELECT * FROM questions')}; changed=True
 while changed:
  changed=False
  for r in list(d.execute('SELECT concept_id,question_id,probability,confidence FROM cells WHERE probability>=.9')):
   for par in parents.get(r['question_id'],[]):
    cur=d.execute('SELECT probability,precedence FROM cells WHERE concept_id=? AND question_id=?',(r['concept_id'],par)).fetchone()
    if cur and cur['probability']<=.25:
     d.execute('INSERT OR REPLACE INTO contradictions VALUES(?,?,?,?,?,?)',(r['concept_id'],r['question_id'],par,r['probability'],cur['probability'],'flagged'))
     if cur['precedence']>=RANK['external']:continue
    if put(d,r['concept_id'],par,max(.9,min(.995,r['probability']*.995)),min(.97,r['confidence']),'hierarchy','child:'+r['question_id']):changed=True
 d.commit()

def unknown(d,c,weak):
 return [{'question_id':r['question_id'],'question':r['text']} for r in d.execute('''SELECT q.question_id,q.text,c.confidence,c.precedence FROM questions q LEFT JOIN cells c ON c.question_id=q.question_id AND c.concept_id=? WHERE c.concept_id IS NULL OR (c.precedence<? AND c.confidence<?) ORDER BY q.rowid''',(c,RANK['external'],weak))]

def openai_call(payload,model,key):
 answer={'type':'object','properties':{'question_id':{'type':'string'},'yes_probability':{'type':'number','minimum':0,'maximum':1},'confidence':{'type':'number','minimum':0,'maximum':1}},'required':['question_id','yes_probability','confidence'],'additionalProperties':False}
 schema={'type':'object','properties':{'concepts':{'type':'array','items':{'type':'object','properties':{'concept':{'type':'string'},'answers':{'type':'array','items':answer}},'required':['concept','answers'],'additionalProperties':False}}},'required':['concepts'],'additionalProperties':False}
 body={'model':model,'store':False,'input':[{'role':'system','content':'Pretrain a classic 20 Questions model. Estimate ordinary-human YES likelihood, not pedantic encyclopedic truth. Tomato/vegetable follows common usage; fictional characters can count as people if ordinary players would treat them that way. Answer every supplied question only.'},{'role':'user','content':json.dumps(payload,separators=(',',':'))}], 'text':{'format':{'type':'json_schema','name':'pam20q_batch','strict':True,'schema':schema}}}
 req=urllib.request.Request('https://api.openai.com/v1/responses',data=json.dumps(body).encode(),headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'},method='POST')
 raw=json.loads(urllib.request.urlopen(req,timeout=300).read()); text=raw.get('output_text')
 if not text:
  text=next(c['text'] for i in raw.get('output',[]) for c in i.get('content',[]) if isinstance(c.get('text'),str))
 return json.loads(text)

def apply_ai(d,batch,payload,ref):
 ids={x['concept']:x['concept_id'] for x in batch}; allowed={x['concept_id']:{q['question_id'] for q in x['questions']} for x in batch}
 for item in payload.get('concepts',[]):
  c=ids.get(item.get('concept'))
  if not c:continue
  for a in item.get('answers',[]):
   q=a.get('question_id')
   if q not in allowed[c]:continue
   p=float(a['yes_probability']); cf=float(a['confidence'])
   if put(d,c,q,p,cf,'ai',ref):d.execute('INSERT INTO evidence(concept_id,question_id,probability,confidence,source_kind,source_ref) VALUES(?,?,?,?,?,?)',(c,q,p,cf,'ai',ref))
 d.commit()

def ai(d,model,batch_n,weak,max_batches,dry):
 key=os.getenv('OPENAI_API_KEY','')
 if not dry and not key:raise SystemExit('OPENAI_API_KEY required')
 batch=[]; calls=0
 for c in d.execute('SELECT concept_id,name FROM concepts ORDER BY rank,concept_id'):
  qs=unknown(d,c['concept_id'],weak)
  if qs:batch.append({'concept_id':c['concept_id'],'concept':c['name'],'questions':qs})
  if len(batch)<batch_n:continue
  calls+=process_batch(d,batch,model,key,dry); batch=[]
  if max_batches and calls>=max_batches:return
 if batch and (not max_batches or calls<max_batches):process_batch(d,batch,model,key,dry)

def process_batch(d,batch,model,key,dry):
 h=hashlib.sha256(json.dumps(batch,sort_keys=True,separators=(',',':')).encode()).hexdigest()[:24]; old=d.execute('SELECT status,response_json FROM ai_batches WHERE batch_key=?',(h,)).fetchone()
 if old and old['status']=='complete':apply_ai(d,batch,json.loads(old['response_json']),'cache:'+h); return 0
 payload={'task':'Estimate ordinary-human YES probabilities for every supplied question.','concepts':batch}; d.execute('INSERT OR REPLACE INTO ai_batches VALUES(?,?,?,?,?)',(h,'pending',json.dumps(payload),None,int(time.time()))); d.commit()
 if dry:return 1
 out=openai_call(payload,model,key); d.execute("UPDATE ai_batches SET status='complete',response_json=?,updated_at=? WHERE batch_key=?",(json.dumps(out,separators=(',',':')),int(time.time()),h)); apply_ai(d,batch,out,f'openai:{model}:{h}'); return 1

def compile_model(d,out):
 out.mkdir(parents=True,exist_ok=True); cc=list(d.execute('SELECT concept_id,name FROM concepts ORDER BY rank,concept_id')); qq=list(d.execute('SELECT question_id,text FROM questions ORDER BY rowid')); ci={x['concept_id']:i for i,x in enumerate(cc)}; qi={x['question_id']:i for i,x in enumerate(qq)}; mat=bytearray([UNKNOWN])*(len(cc)*len(qq))
 for r in d.execute('SELECT concept_id,question_id,probability FROM cells'):
  if r['concept_id'] in ci and r['question_id'] in qi:mat[ci[r['concept_id']]*len(qq)+qi[r['question_id']]]=max(0,min(SCALE,round(r['probability']*SCALE)))
 raw=b'PAM20Q1\0'+struct.pack('<II',len(cc),len(qq))+bytes(mat); gz=gzip.compress(raw,compresslevel=9,mtime=0); mp=out/'pam20q.v1.bin.gz'; mp.write_bytes(gz); sha=hashlib.sha256(gz).hexdigest(); man={'format':'pam20q-dense-u8-gzip','version':1,'concept_count':len(cc),'question_count':len(qq),'matrix_file':mp.name,'unknown_sentinel':UNKNOWN,'probability_scale':{'min':0,'max':SCALE,'decode':'p = byte / 254; 255 = unknown'},'concepts':[{'id':x['concept_id'],'name':x['name']} for x in cc],'questions':[{'id':x['question_id'],'text':x['text']} for x in qq],'sha256':sha}; (out/'pam20q.v1.manifest.json').write_text(json.dumps(man,separators=(',',':'),ensure_ascii=False)); return len(gz),len(raw),sha

def report(d,compiled,path):
 c=d.execute('SELECT COUNT(*) FROM concepts').fetchone()[0]; q=d.execute('SELECT COUNT(*) FROM questions').fetchone()[0]; counts={r['source_kind']:r['n'] for r in d.execute('SELECT source_kind,COUNT(*) n FROM cells GROUP BY source_kind')}; resolved=sum(counts.values()); x={'total_concepts':c,'canonical_question_count':q,'total_concept_question_cells':c*q,'cells_seeded_from_accepted_pam_data':counts.get('accepted',0),'cells_inferred_from_hierarchy':counts.get('hierarchy',0),'cells_supported_by_external_sources':counts.get('external',0),'cells_estimated_by_ai':counts.get('ai',0),'unresolved_cells':c*q-resolved,'contradiction_count':d.execute('SELECT COUNT(*) FROM contradictions').fetchone()[0],'compiled_artifact_size_bytes':compiled[0] if compiled else None,'compiled_raw_matrix_bytes':compiled[1] if compiled else None,'compiled_sha256':compiled[2] if compiled else None}; path.write_text(json.dumps(x,indent=2)+'\n'); print(json.dumps(x,indent=2))

def main():
 p=argparse.ArgumentParser(); p.add_argument('--work-dir',type=Path,default=WORK); p.add_argument('--questions',type=Path,default=QFILE); p.add_argument('--source-db',type=Path); p.add_argument('--inventory-csv',type=Path,default=ROOT/'docs/pam-knowledge-fill/all-concepts.csv'); p.add_argument('--external',type=Path,action='append',default=[]); p.add_argument('--model',default=os.getenv('PAM20Q_MODEL','gpt-6-astra')); p.add_argument('--batch-concepts',type=int,default=40); p.add_argument('--weak-confidence',type=float,default=.70); p.add_argument('--max-ai-batches',type=int); p.add_argument('--dry-run-ai',action='store_true'); p.add_argument('--skip-ai',action='store_true'); p.add_argument('--reset',action='store_true'); a=p.parse_args(); a.work_dir.mkdir(parents=True,exist_ok=True); dbp=a.work_dir/'build.sqlite'
 if a.reset and dbp.exists():dbp.unlink()
 d=conn(dbp); load_questions(d,a.questions)
 if a.inventory_csv.exists():inventory(d,a.inventory_csv)
 if a.source_db:accepted_sqlite(d,a.source_db)
 external(d,a.external); hierarchy(d)
 if not a.skip_ai:ai(d,a.model,a.batch_concepts,a.weak_confidence,a.max_ai_batches,a.dry_run_ai)
 if not a.dry_run_ai:hierarchy(d)
 compiled=None if a.dry_run_ai else compile_model(d,a.work_dir/'compiled'); report(d,compiled,a.work_dir/'report.json')
if __name__=='__main__':main()
