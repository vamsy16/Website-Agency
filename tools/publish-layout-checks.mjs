// Publish layout/verification gate diagnostics only, never raw prospect measurements.
import fs from 'node:fs';
import path from 'node:path';
const rows=[];
if(fs.existsSync('reports')) for(const slug of fs.readdirSync('reports')) {
  const dir=path.join('reports',slug); if(!fs.statSync(dir).isDirectory()) continue;
  const read=name=>{try{return JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));}catch{return null;}};
  const qa=read('qa.json'), verify=read('verify.json');
  rows.push({slug,layout:qa,verification:verify?{ok:verify.ok,blockers:verify.blockers,failedChecks:verify.checks?.filter(c=>!c.ok)}:null});
}
fs.mkdirSync('deliverables/runs',{recursive:true});
fs.writeFileSync(`deliverables/runs/layout-checks-${process.env.GITHUB_RUN_ID||'local'}.json`,JSON.stringify(rows,null,2)+'\n');
