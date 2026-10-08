import { writeFileSync,existsSync } from 'node:fs';
import { join } from 'node:path';
import { INBOX,list,put,now,settings,saveRecords } from './store.mjs';

export const exampleRecords=[
 {title:'Einführung neuer Mitarbeitender',department:'Personal',priority:'normal',status:'offen',content:'SYNTHETISCHES BEISPIEL\nFür drei neue Mitarbeitende sollen die Einführungsunterlagen zusammengestellt werden. Kontakt: lea.beispiel@example.org. Zuständig ist das Team Personal. Die Einführung ist für nächste Woche geplant.'},
 {title:'Wartung der Verpackungslinie',department:'Betrieb',priority:'hoch',status:'offen',content:'SYNTHETISCHES BEISPIEL\nDie Verpackungslinie benötigt eine planmässige Wartung. Der interne Auftrag soll vorbereitet und die zuständige Fachperson informiert werden. Kontakt: +41 79 123 45 67. Es liegt noch keine Terminbestätigung vor.'},
 {title:'Dokumentation aktualisieren',department:'Qualität',priority:'normal',status:'in Arbeit',content:'SYNTHETISCHES BEISPIEL\nDie interne Dokumentation wurde überarbeitet. Die Änderungen müssen zusammengeführt und zur fachlichen Prüfung bereitgestellt werden. Dokumentversion: 2.1.'}
];
const node=(id,kind,label,x,y,config={})=>({id,type:'flux',position:{x,y},data:{kind,label,config}});
const edge=(source,target,sourceHandle)=>({id:`${source}-${target}-${sourceHandle||'out'}`,source,target,...(sourceHandle?{sourceHandle}:{})});
export function seed(){
  put('settings',settings());
  if(!existsSync(join(INBOX,'beispiel-posteingang.json')))writeFileSync(join(INBOX,'beispiel-posteingang.json'),JSON.stringify(exampleRecords,null,2));
  if(getSeeded())return;
  saveRecords(exampleRecords.map(record=>({...record,source:'Synthetische Beispieldaten',classification:'internal',metadata:{department:record.department,priority:record.priority,status:record.status,synthetic:true}})));
  const stamp=now();
  for(const c of [
    {id:'inbox',name:'Lokaler Posteingang',type:'folder',description:'Eigene Dateien und synthetische Beispieldaten',config:{path:INBOX}},
    {id:'sample-api',name:'Interner Beispiel-Service',type:'http',description:'Lokale API mit synthetischen Arbeitsaufträgen',config:{url:`http://127.0.0.1:${process.env.PORT||4310}/api/sample/requests`,method:'GET'}},
    {id:'demo-program',name:'Programm-Export',type:'program',description:'Registrierter JSON-Export als lokales Programm',config:{programId:'demo-export'}}
  ])put('connectors',{...c,createdAt:stamp});
  const policy={allowCloud:false,redactCloud:true};const schedule={enabled:false,intervalMinutes:60};
  put('workflows',{id:'document-flow',name:'Dokumente einlesen und ablegen',description:'Dateien einlesen, sensible Angaben maskieren und geordnet ablegen.',category:'Datenverarbeitung',policy,schedule,updatedAt:stamp,nodes:[node('start','trigger','Workflow starten',0,180),node('source','source','Posteingang einlesen',270,180,{connectorId:'inbox'}),node('redact','redact','Daten maskieren',550,180),node('clean','transform','Inhalte aufbereiten',830,180,{operation:'clean'}),node('store','store','Wissen speichern',1110,100),node('out','output','Ergebnis ansehen',1110,300)],edges:[edge('start','source'),edge('source','redact'),edge('redact','clean'),edge('clean','store'),edge('clean','out')]});
  put('workflows',{id:'ai-briefing',name:'Dokumente zusammenfassen',description:'Eigenes Modell anbinden und eine Zusammenfassung mit Quellen erstellen.',category:'KI-Assistenz',policy,schedule,updatedAt:stamp,nodes:[node('start','trigger','Workflow starten',0,150),node('source','source','Dokumente einlesen',280,150,{connectorId:'inbox'}),node('model','model','Zusammenfassung erstellen',560,150,{prompt:'Erstelle eine kompakte interne Zusammenfassung auf Deutsch: offene Aufgaben, Zuständigkeiten und ungeklärte Fragen. Nenne die Quelldokumente.'}),node('store','store','Zusammenfassung speichern',840,150)],edges:[edge('start','source'),edge('source','model'),edge('model','store')]});
  put('workflows',{id:'api-flow',name:'API-Daten automatisch einsammeln',description:'Lokale Services verbinden und wichtige Vorgänge gezielt weitergeben.',category:'Integration',policy,schedule,updatedAt:stamp,nodes:[node('start','trigger','Workflow starten',0,180),node('source','source','Service abrufen',280,180,{connectorId:'sample-api'}),node('branch','condition','Hohe Priorität?',560,180,{field:'priority',operator:'equals',value:'hoch'}),node('store','store','Priorisierte Ablage',870,70),node('out','output','Weitere Vorgänge',870,290)],edges:[edge('start','source'),edge('source','branch'),edge('branch','store','true'),edge('branch','out','false')]});
  put('settings',{...settings(),seeded:true});
}
function getSeeded(){return settings().seeded || list('workflows').length>0;}
