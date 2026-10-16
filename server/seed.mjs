import { writeFileSync,existsSync } from 'node:fs';
import { join } from 'node:path';
import { INBOX,list,put,now,settings,saveRecords } from './store.mjs';

export const exampleRecords=[
 {title:"New employee onboarding",department:"HR",priority:'normal',status:"open",content:"SYNTHETIC EXAMPLE\nPrepare onboarding materials for three new employees. Contact: lea.example@example.org. The HR team is responsible. Onboarding is planned for next week."},
 {title:"Packaging line maintenance",department:"Operations",priority:"high",status:"open",content:"SYNTHETIC EXAMPLE\nThe packaging line needs scheduled maintenance. Prepare the internal request and notify the responsible specialist. Contact: +41 79 123 45 67. The date has not been confirmed."},
 {title:"Update documentation",department:"Quality",priority:'normal',status:"in progress",content:"SYNTHETIC EXAMPLE\nInternal documentation has been revised. Merge the changes and prepare them for review. Document version: 2.1."}
];
const node=(id,kind,label,x,y,config={})=>({id,type:'flux',position:{x,y},data:{kind,label,config}});
const edge=(source,target,sourceHandle)=>({id:`${source}-${target}-${sourceHandle||'out'}`,source,target,...(sourceHandle?{sourceHandle}:{})});
export function seed(){
  put('settings',settings());
  if(!existsSync(join(INBOX,'beispiel-posteingang.json')))writeFileSync(join(INBOX,'beispiel-posteingang.json'),JSON.stringify(exampleRecords,null,2));
  if(getSeeded())return;
  saveRecords(exampleRecords.map(record=>({...record,source:"Synthetic sample data",classification:'internal',metadata:{department:record.department,priority:record.priority,status:record.status,synthetic:true}})));
  const stamp=now();
  for(const c of [
    {id:'inbox',name:"Local inbox",type:'folder',description:"Your files and synthetic sample data",config:{path:INBOX}},
    {id:'sample-api',name:"Internal example service",type:'http',description:"Local API with synthetic work requests",config:{url:`http://127.0.0.1:${process.env.PORT||4310}/api/sample/requests`,method:'GET'}},
    {id:'demo-program',name:"Program export",type:'program',description:"Registered JSON export as a local program",config:{programId:'demo-export'}}
  ])put('connectors',{...c,createdAt:stamp});
  const policy={allowCloud:false,redactCloud:true};const schedule={enabled:false,intervalMinutes:60};
  put('workflows',{id:'document-flow',name:"Import and store documents",description:"Import files, redact sensitive information and store the results.",category:"Data processing",policy,schedule,updatedAt:stamp,nodes:[node('start','trigger',"Start workflow",0,180),node('source','source',"Read inbox",270,180,{connectorId:'inbox'}),node('redact','redact',"Redact data",550,180),node('clean','transform',"Process content",830,180,{operation:'clean'}),node('store','store',"Save knowledge",1110,100),node('out','output',"View result",1110,300)],edges:[edge('start','source'),edge('source','redact'),edge('redact','clean'),edge('clean','store'),edge('clean','out')]});
  put('workflows',{id:'ai-briefing',name:"Summarise documents",description:"Connect your own model and create a summary with sources.",category:"AI assistance",policy,schedule,updatedAt:stamp,nodes:[node('start','trigger',"Start workflow",0,150),node('source','source',"Read documents",280,150,{connectorId:'inbox'}),node('model','model',"Create summary",560,150,{prompt:"Write a concise internal summary in English: open tasks, owners and unresolved questions. Cite the source documents."}),node('store','store',"Save summary",840,150)],edges:[edge('start','source'),edge('source','model'),edge('model','store')]});
  put('workflows',{id:'api-flow',name:"Collect API data automatically",description:"Connect local services and route important records.",category:'Integration',policy,schedule,updatedAt:stamp,nodes:[node('start','trigger',"Start workflow",0,180),node('source','source',"Read service",280,180,{connectorId:'sample-api'}),node('branch','condition',"High priority?",560,180,{field:'priority',operator:'equals',value:"high"}),node('store','store',"Priority storage",870,70),node('out','output',"Other records",870,290)],edges:[edge('start','source'),edge('source','branch'),edge('branch','store','true'),edge('branch','out','false')]});
  put('settings',{...settings(),seeded:true});
}
function getSeeded(){return settings().seeded || list('workflows').length>0;}
