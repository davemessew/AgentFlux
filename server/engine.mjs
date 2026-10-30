import { list,get,put,uid,now,saveRecords } from './store.mjs';
import { ingest,redact,complete,normalize } from './connectors.mjs';
import { NODE_KINDS,cleanWorkflow,workflowIssues } from '../shared/workflow.mjs';
import { executeAgentStep } from './agents.mjs';
import { validateDelivery, executionRevision, newInputs, inputKeys, checkpoint, deliver } from './delivery.mjs';

import { TASK_REPORT_PROMPT, taskReport } from './task-reports.mjs';

export let publish=()=>{};
export function setPublisher(fn){publish=fn;}
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const activeRuns=new Map();
const MAX_ACTIVE_RUNS=4;
const MAX_RUN_MS=10*60*1000;

export function validateWorkflow(w){
  if(!object(w) || typeof w.name!=='string' || !w.name.trim() || w.name.length>120)throw new Error('Workflow braucht einen Namen mit höchstens 120 Zeichen.');
  if(w.id!==undefined&&(typeof w.id!=='string'||!w.id||w.id.length>120))throw new Error('Ungültige Workflow-ID.');
  for(const key of ['policy','schedule'])if(w[key]!==undefined&&!object(w[key]))throw new Error(`Ungültige Workflow-Einstellung: ${key}.`);
  for(const [value,key] of [[w.policy?.allowCloud,'Cloud-Freigabe'],[w.policy?.redactCloud,'Maskierung'],[w.schedule?.enabled,'Zeitplan']])if(value!==undefined&&typeof value!=='boolean')throw new Error(`${key} muss ein Wahrheitswert sein.`);
  if(!Array.isArray(w.nodes)||w.nodes.length<1||w.nodes.length>40||!Array.isArray(w.edges)||w.edges.length>100)throw new Error('Workflow muss 1 bis 40 Schritte und maximal 100 Verbindungen enthalten.');
  validateDelivery(w.delivery);
  if(w.incremental!==undefined&&typeof w.incremental!=='boolean')throw new Error('Incremental mode must be a boolean.');
  const ids=new Set();
  for(const n of w.nodes){
    if(!object(n)||typeof n.id!=='string'||!n.id||n.id.length>120||ids.has(n.id)||!object(n.data)||!NODE_KINDS.includes(n.data.kind))throw new Error('Ungültiger oder doppelter Workflow-Schritt.');
    if(typeof n.data.label!=='string'||n.data.label.length>120||!object(n.position)||!Number.isFinite(n.position.x)||!Number.isFinite(n.position.y))throw new Error('Schritt benötigt eine Bezeichnung und gültige Position.');
    if(n.data.config!==undefined&&!object(n.data.config))throw new Error('Schritt-Konfiguration muss ein Objekt sein.');
    const c=n.data.config||{};
    for(const key of ['input','mode','query','connectorId','operation','field','operator','providerId','prompt','title','text','value','direction','responsePath','agentId'])if(c[key]!==undefined&&typeof c[key]!=='string'&&!(key==='value'&&['number','boolean'].includes(typeof c[key])))throw new Error(`Schritt-Konfiguration ${key} hat einen ungültigen Wert.`);
    if(c.skillIds!==undefined&&(!Array.isArray(c.skillIds)||c.skillIds.length>50||c.skillIds.some(id=>typeof id!=='string')))throw new Error('Skill-Auswahl muss eine Liste von Text-IDs sein.');
    if(c.useMemory!==undefined&&typeof c.useMemory!=='boolean')throw new Error('Speichernutzung muss ein Wahrheitswert sein.');
    if(c.limit!==undefined&&(!Number.isInteger(c.limit)||c.limit<1||c.limit>500))throw new Error('Datensatzlimit muss zwischen 1 und 500 liegen.');
    if(c.mapping!==undefined&&typeof c.mapping!=='string'&&!object(c.mapping))throw new Error('Feldzuordnung muss JSON oder ein Objekt sein.');
    if(c.temperature!==undefined&&(!Number.isFinite(c.temperature)||c.temperature<0||c.temperature>2))throw new Error('Temperatur muss zwischen 0 und 2 liegen.');
    if(c.maxTokens!==undefined&&(!Number.isInteger(c.maxTokens)||c.maxTokens<128||c.maxTokens>16384))throw new Error('Maximale Tokenzahl muss zwischen 128 und 16.384 liegen.');
    if(c.mode!==undefined&&n.data.kind==='model'&&!['batch','per-record'].includes(c.mode))throw new Error('Modellmodus muss batch oder per-record sein.');
    if(n.data.kind==='source') {
      if(c.mode!==undefined&&!['inline','library','connector'].includes(c.mode))throw new Error('Source mode must be inline, library or connector.');
      if(['inline','library'].includes(c.mode)&&c.connectorId)throw new Error('Inline and library sources cannot also use a connector.');
      if((c.mode==='connector'||(!c.mode&&c.connectorId))&&(c.text!==undefined||c.query!==undefined))throw new Error('Connector sources cannot also contain inline text or a library query.');
    }
    if(n.data.kind==='source'&&c.mode==='inline'&&(typeof c.text!=='string'||c.text.length>1000000))throw new Error('Inline-Quelle benötigt Text mit höchstens 1.000.000 Zeichen.');
    if(c.responsePath!==undefined&&(c.responsePath.length>500||(c.responsePath&&c.responsePath.split('.').some(part=>!part||['__proto__','prototype','constructor'].includes(part)))))throw new Error('Ungültiger Antwortpfad.');
    if(c.direction!==undefined&&!['asc','desc'].includes(c.direction))throw new Error('Sortierrichtung muss asc oder desc sein.');
    if(n.data.kind==='transform'&&c.operation!==undefined&&!['clean','deduplicate','fields','limit','filter','sort'].includes(c.operation))throw new Error('Transformationsart wird nicht unterstützt.');
    if((n.data.kind==='condition'||(n.data.kind==='transform'&&c.operation==='filter'))&&c.operator!==undefined&&!['equals','not_equals','contains','not_contains','exists','greater','less'].includes(c.operator))throw new Error('Bedingungsoperator wird nicht unterstützt.');
    ids.add(n.id);
  }
  const edgeIds=new Set();for(const e of w.edges){if(!object(e)||typeof e.id!=='string'||!e.id||e.id.length>120||edgeIds.has(e.id)||!ids.has(e.source)||!ids.has(e.target)||e.source===e.target)throw new Error('Verbindung verweist auf einen ungültigen oder doppelten Schritt.');edgeIds.add(e.id);if(e.sourceHandle!=null&&!['true','false'].includes(e.sourceHandle))throw new Error('Ungültiger Ausgang einer Verzweigung.');}
  const visited=new Set();let changed=true;while(changed){changed=false;for(const n of w.nodes)if(!visited.has(n.id)&&w.edges.filter(e=>e.target===n.id).every(e=>visited.has(e.source))){visited.add(n.id);changed=true;}}
  if(visited.size!==ids.size)throw new Error('Kreisförmige Workflows werden in dieser Version nicht unterstützt.');
  if(w.schedule?.enabled&&(!Number.isFinite(w.schedule.intervalMinutes)||w.schedule.intervalMinutes<1||w.schedule.intervalMinutes>525600))throw new Error('Zeitplan benötigt 1 bis 525.600 Minuten Intervall.');
  return w;
}
function fieldValue(r,key){const parts=String(key||'').split('.');if(parts.some(k=>['__proto__','prototype','constructor'].includes(k)))return undefined;const read=value=>parts.reduce((o,k)=>o&&Object.hasOwn(o,k)?o[k]:undefined,value);return read(r) ?? read(r.metadata);}
function redactRecord(value,onCount){if(typeof value==='string'){const result=redact(value);onCount(result.count);return result.text;}if(Array.isArray(value))return value.map(item=>redactRecord(item,onCount));if(object(value))return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,redactRecord(item,onCount)]));return value;}
function condition(r,c){const raw=fieldValue(r,c.field||'content');const value=raw==null?'':String(raw);const expected=String(c.value??'');switch(c.operator){case 'equals':return value.toLowerCase()===expected.toLowerCase();case 'not_equals':return value.toLowerCase()!==expected.toLowerCase();case 'contains':return value.toLowerCase().includes(expected.toLowerCase());case 'not_contains':return !value.toLowerCase().includes(expected.toLowerCase());case 'exists':return raw!==undefined&&raw!==null&&String(raw).trim()!=='';case 'greater':return Number(value)>Number(expected);case 'less':return Number(value)<Number(expected);default:throw new Error('Bedingungsoperator wird nicht unterstützt.');}}
function transform(records,c){
  if(c.operation==='limit')return records.slice(0,Math.max(1,Math.min(500,Number(c.limit)||10)));
  if(c.operation==='filter')return records.filter(r=>condition(r,c));
  if(c.operation==='sort'){const direction=c.direction==='desc'?-1:1;return [...records].sort((a,b)=>{const av=fieldValue(a,c.field),bv=fieldValue(b,c.field);if(av==null)return bv==null?0:-direction;if(bv==null)return direction;const an=Number(av),bn=Number(bv);return (Number.isFinite(an)&&Number.isFinite(bn)?an-bn:String(av).localeCompare(String(bv),'de',{numeric:true,sensitivity:'base'}))*direction;});}
  if(c.operation==='deduplicate'){const unique=new Map();for(const record of records){const previous=unique.get(record.content);unique.set(record.content,previous?{...previous,metadata:{...previous.metadata,inputKeys:inputKeys([previous,record])}}:record);}return [...unique.values()];}
  if(c.operation==='fields'){let mapping;try{mapping=typeof c.mapping==='string'?JSON.parse(c.mapping):c.mapping;}catch{throw new Error('Feldzuordnung ist kein gültiges JSON.');}if(!object(mapping)||Object.keys(mapping).length>100||Object.values(mapping).some(v=>typeof v!=='string'))throw new Error('Feldzuordnung benötigt höchstens 100 Textpfade.');return records.map(r=>{const data=Object.fromEntries(Object.entries(mapping).map(([k,v])=>[k,fieldValue(r,v)??'']));return {...r,title:String(data.title||r.title),content:JSON.stringify(data,null,2),metadata:{...r.metadata,...data}};});}
  if(c.operation!==undefined&&c.operation!=='clean')throw new Error('Transformationsart wird nicht unterstützt.');
  return records.map(r=>({...r,content:r.content.replace(/\r\n/g,'\n').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim()}));
}
const checkAbort=signal=>{if(signal?.aborted)throw signal.reason instanceof Error?signal.reason:new Error('Lauf abgebrochen.');};
export function startRun(workflow,trigger='manual',options={}){
  validateWorkflow(workflow);
  const snapshot=cleanWorkflow(workflow);
  const issues=workflowIssues(snapshot,{connectors:list('connectors'),providers:list('providers'),agents:list('agents'),skills:list('skills'),settings:(()=>{const s=get('settings','main')||{};return {...s,programsEnabled:s.programsEnabled===true};})()});
  if(issues.length)throw new Error(`Workflow ist nicht ausführbar: ${issues.map(i=>i.message).join(' ')}`);
  if(list('runs').some(r=>r.workflowId===snapshot.id&&r.status==='running'))throw new Error('Dieser Workflow läuft bereits.');
  if(activeRuns.size>=MAX_ACTIVE_RUNS)throw new Error('Maximal vier Workflows können gleichzeitig laufen.');
  const run=put('runs',{id:uid(),workflowId:snapshot.id,workflowName:snapshot.name,workflowSnapshot:snapshot,status:'running',trigger,startedAt:now(),steps:[],recordCount:0});
  const controller=new AbortController();const remaining=Number.isFinite(options.budget?.deadlineAt)?Math.max(0,options.budget.deadlineAt-Date.now()):MAX_RUN_MS;const limit=Math.min(MAX_RUN_MS,remaining);const timeout=setTimeout(()=>controller.abort(new Error(remaining<MAX_RUN_MS?'Zeitlimit des Agentenzyklus überschritten.':'Zeitlimit von 10 Minuten überschritten.')),limit);const signal=options.signal?AbortSignal.any([controller.signal,options.signal]):controller.signal;activeRuns.set(run.id,{controller,timeout});
  publish('run',run);void execute(snapshot,run,signal,options.budget);return run;
}
export function cancelRun(runId){const run=get('runs',runId);if(!run)return null;if(run.status!=='running')return run;run.cancellationNote='Bereits abgeschlossene Schreibvorgänge und externe POST-Anfragen bleiben bestehen.';put('runs',run);publish('run',run);const active=activeRuns.get(runId);if(active)active.controller.abort(new Error('Lauf durch Nutzer abgebrochen.'));return run;}
export function resultForRun(runId){return get('runResults',runId);}
async function execute(w,run,signal,budget){
  const outputs=new Map();const branches=new Map();const completed=new Set();let stored=0;
  const revision=executionRevision(w,w.nodes.filter(n=>n.data.kind==='source'&&n.data.config.connectorId).map(n=>get('connectors',n.data.config.connectorId)).filter(Boolean),w.nodes.filter(n=>n.data.kind==='model').map(n=>get('providers',n.data.config.providerId)).filter(Boolean));
  run.revision=revision;
  const update=()=>{put('runs',run);publish('run',run);};
  try {
    while(completed.size<w.nodes.length){
      checkAbort(signal);
      const node=w.nodes.find(n=>!completed.has(n.id)&&w.edges.filter(e=>e.target===n.id).every(e=>completed.has(e.source)));
      if(!node)throw new Error('Workflow kann nicht aufgelöst werden.');
      const incoming=w.edges.filter(e=>e.target===node.id);const active=incoming.filter(e=>outputs.has(e.source));
      const input=active.flatMap(e=>branches.has(e.source)?branches.get(e.source)[e.sourceHandle==='false'?'false':'true']:outputs.get(e.source)||[]);
      const step={nodeId:node.id,label:node.data.label,kind:node.data.kind,status:'running',inputCount:input.length,outputCount:0,startedAt:now(),durationMs:0,preview:[]};run.steps.push(step);const started=Date.now();update();
      if(incoming.length&&(active.length===0||input.length===0)){step.status='skipped';step.durationMs=Date.now()-started;completed.add(node.id);update();continue;}
      const c=node.data.config||{};let output=input;
      try{
        checkAbort(signal);
        switch(node.data.kind){
          case 'trigger':output=[{title:'Workflow-Start',content:c.input||'Manuell gestartet',source:'Trigger',metadata:{},classification:'internal'}];break;
          case 'source':
            if(c.mode==='library')output=list('records').filter(r=>!c.query||`${r.title} ${r.content}`.toLowerCase().includes(c.query.toLowerCase())).slice(0,Math.min(500,Number(c.limit)||500));
            else if(c.mode==='inline'){if(typeof c.text!=='string')throw new Error('Inline-Quelle benötigt config.text.');let data=c.text;try{data=JSON.parse(c.text);}catch{}output=normalize(data,node.data.label);}
            else{const connector=get('connectors',c.connectorId);if(!connector)throw new Error('Bitte eine Datenquelle auswählen.');if(run.trigger==='schedule'&&(connector.type==='program'||(connector.type==='http'&&(connector.config?.method||'GET').toUpperCase()==='POST')))throw new Error('Programme und HTTP-POST müssen manuell gestartet werden; Zeitpläne sind für lesende Quellen vorgesehen.');output=await ingest(connector,input,w.policy,{signal});}
            {const total=output.length;output=newInputs(w,revision,node.id,output);step.detail=`${output.length} new or changed · ${total-output.length} already delivered`;run.inputCount=(run.inputCount||0)+output.length;run.skippedCount=(run.skippedCount||0)+total-output.length;}break;
          case 'transform':output=transform(input,c);break;
          case 'condition':{const yes=input.filter(r=>condition(r,c));const no=input.filter(r=>!condition(r,c));branches.set(node.id,{true:yes,false:no});output=input;step.detail=`${yes.length} zutreffend · ${no.length} übrige`;break;}
          case 'redact':{let count=0;output=input.map(r=>redactRecord(r,n=>{count+=n;}));step.detail=`${count} Fundstellen maskiert`;break;}
          case 'model':{
            const provider=get('providers',c.providerId);if(!provider)throw new Error('Bitte ein Modell in diesem Schritt auswählen.');
            const callsUsed=Number(budget?.callsUsed??budget?.modelCallsUsed)||0;const tokensUsed=Number(budget?.tokensUsed)||0;if(budget&&Number.isFinite(budget.maxModelCalls)&&callsUsed>=budget.maxModelCalls)throw new Error('Modellaufrufbudget des Agentenzyklus ist ausgeschöpft.');if(budget&&Number.isFinite(budget.maxTokens)&&tokensUsed>=budget.maxTokens)throw new Error('Tokenbudget des Agentenzyklus ist ausgeschöpft.');const remainingTokens=budget&&Number.isFinite(budget.maxTokens)?budget.maxTokens-tokensUsed:Infinity;if(remainingTokens<128)throw new Error('Tokenbudget des Agentenzyklus reicht nicht für einen weiteren Modellaufruf.');const modelPrompt=c.outputFormat==='tasks'?`${c.prompt}\n${TASK_REPORT_PROMPT}`:c.prompt;const modelOptions={temperature:c.temperature??0.2,maxTokens:Math.min(c.maxTokens??2048,remainingTokens),signal};
            let responses=[];
            if(c.mode==='per-record'){if(input.length>50)throw new Error('Pro-Datensatz-Modellmodus ist auf 50 Datensätze pro Schritt begrenzt.');for(let index=0;index<input.length;index++){const record=input[index];checkAbort(signal);const used=Number(budget?.callsUsed??budget?.modelCallsUsed)||0;if(budget&&Number.isFinite(budget.maxModelCalls)&&used>=budget.maxModelCalls)throw new Error('Modellaufrufbudget des Agentenzyklus ist ausgeschöpft.');if(budget){budget.callsUsed=used+1;budget.modelCallsUsed=used+1;}responses.push(await complete(provider,modelPrompt,[record],w.policy,modelOptions));if(budget){budget.tokensUsed=(Number(budget.tokensUsed)||0)+responses.at(-1).tokens;if(budget.tokensUsed>budget.maxTokens)throw new Error('Tokenbudget des Agentenzyklus wurde durch diesen Modellaufruf überschritten.');}const rest=budget&&Number.isFinite(budget.maxTokens)?budget.maxTokens-budget.tokensUsed:Infinity;if(rest<128&&index<input.length-1)throw new Error('Tokenbudget des Agentenzyklus reicht nicht für alle Datensätze.');modelOptions.maxTokens=Number.isFinite(rest)?Math.min(c.maxTokens??2048,rest):modelOptions.maxTokens;}}
            else{if(budget){budget.callsUsed=callsUsed+1;budget.modelCallsUsed=callsUsed+1;}responses=[await complete(provider,modelPrompt,input,w.policy,modelOptions)];if(budget){budget.tokensUsed=(Number(budget.tokensUsed)||0)+responses[0].tokens;if(budget.tokensUsed>budget.maxTokens)throw new Error('Tokenbudget des Agentenzyklus wurde durch diesen Modellaufruf überschritten.');}}
            checkAbort(signal);if(c.outputFormat==='tasks')responses=responses.map((response,index)=>({...response,content:taskReport(response.content,c.mode==='per-record'?[input[index]]:input)}));if(c.mode==='per-record')output=responses.map((response,index)=>normalize({title:c.title||`KI-Ergebnis · ${input[index]?.title||index+1}`,content:response.content,classification:'internal',model:provider.model,sources:[input[index]?.source]},provider.name)[0]);else{const response=responses[0];output=normalize({title:c.title||'KI-Ergebnis',content:response.content,classification:'internal',model:provider.model,sources:input.map(r=>r.source)},provider.name);}step.detail=`${responses.reduce((n,r)=>n+r.tokens,0)} Tokens · ${responses.reduce((n,r)=>n+r.redactions,0)} Maskierungen`;break;
          }
          case 'agent':output=await executeAgentStep({config:c,records:input,policy:w.policy,signal,budget});checkAbort(signal);break;
          case 'store':checkAbort(signal);output=saveRecords(input.map(r=>({...r,metadata:{...r.metadata,workflowId:w.id,runId:run.id}})));stored+=output.length;run.recordCount=stored;publish('records',{count:output.length});break;
          case 'output':output=input;break;
          default:throw new Error('Schritttyp wird nicht unterstützt.');
        }
        checkAbort(signal);if(output.length>500)throw new Error('Workflow-Schritt erzeugte mehr als 500 Datensätze.');
        if(['model','agent'].includes(node.data.kind))output=output.map((record,index)=>({...record,metadata:{...record.metadata,inputKeys:inputKeys(c.mode==='per-record'?[input[index]]:input),sources:(c.mode==='per-record'?[input[index]]:input).map(r=>({source:r.source,title:r.title,sheet:r.metadata?.sheet,row:r.metadata?.row}))}}));
        outputs.set(node.id,output);step.status='completed';step.outputCount=output.length;step.preview=output.slice(0,3).map(r=>({title:r.title,content:String(r.content||'').slice(0,1500),source:r.source}));
      }catch(error){step.status=signal.aborted&&String(signal.reason?.message||'').includes('Nutzer')?'cancelled':'failed';step.error=error.message;throw error;}finally{step.durationMs=Date.now()-started;completed.add(node.id);update();}
    }
    const terminal=w.nodes.filter(n=>!w.edges.some(e=>e.source===n.id));const records=terminal.flatMap(n=>outputs.get(n.id)||[]).slice(0,500);
    if(terminal.flatMap(n=>outputs.get(n.id)||[]).length>500)throw new Error('Result exceeds the 500-record limit. No delivery was committed.');
    run.phase='delivering';update();
    run.delivery=await deliver(w,run,records,revision,signal);
    checkAbort(signal);
    put('runResults',{id:run.id,workflowId:run.workflowId,createdAt:now(),records,totalCount:records.length,truncated:false,delivery:run.delivery});
    checkpoint(w,revision,records);
    run.phase='completed';run.status='completed';run.recordCount=stored;run.outputCount=records.length;
  }catch(error){run.status=signal.aborted?(String(signal.reason?.message||'').includes('Zeitlimit')?'failed':'cancelled'):'failed';run.error=error.message;}
  finally{const terminal=w.nodes.filter(n=>!w.edges.some(e=>e.source===n.id));const allRecords=terminal.flatMap(n=>outputs.get(n.id)||[]);const records=allRecords.slice(0,500);if(allRecords.length>500&&run.status==='completed'){run.status='failed';run.error=`Workflow-Ergebnis enthält ${allRecords.length} Datensätze; gespeichert werden höchstens 500.`;}put('runResults',{id:run.id,workflowId:run.workflowId,createdAt:now(),records,totalCount:allRecords.length,truncated:allRecords.length>records.length,delivery:run.delivery});run.outputCount=records.length;clearTimeout(activeRuns.get(run.id)?.timeout);activeRuns.delete(run.id);run.finishedAt=now();run.durationMs=Date.now()-Date.parse(run.startedAt);update();}
}
