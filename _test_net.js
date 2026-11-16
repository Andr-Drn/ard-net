process.chdir('/home/claude/ard/ard-net');
const net=require('net'), fs=require('fs');
fs.writeFileSync('settings.json', JSON.stringify({isolir_portal_url:'http://192.168.10.185:3001/isolated', radius_secret:'rahasia-uji', cookie_secure:false}));
// ---- RouterOS tiruan (level kata-kata API mentah) ----
const store={ '/ip/pool':[], '/ppp/profile':[{'.id':'*0',name:'default'},{'.id':'*9',name:'10Mbps','local-address':'1.2.3.4'}],
  '/ip/firewall/address-list':[], '/ip/firewall/nat':[], '/ip/firewall/filter':[{'.id':'*f1',chain:'forward',action:'accept',comment:'fasttrack'}],
  '/radius':[], '/interface/pppoe-server/server':[{'.id':'*s1','service-name':'pppoe1',authentication:'pap,chap,mschap1,mschap2'}], '/ppp/aaa':[{'.id':'*a',  'use-radius':'no'}] };
let nid=100; const log=[];
async function ros(words){
  const m=words[0].match(/^(.*)\/(print|add|set|remove)$/); if(!m) throw new Error('perintah tak dikenal: '+words[0]);
  const path=m[1], op=m[2]; const arr=(store[path]=store[path]||[]);
  const attrs={}; for(const w of words.slice(1)){ if(w.startsWith('=')){ const k=w.slice(1,w.indexOf('=',1)); attrs[k]=w.slice(w.indexOf('=',1)+1);} }
  log.push(op+' '+path);
  if(op==='print'){ let r=arr; for(const w of words.filter(x=>x.startsWith('?'))){ const [k,v]=[w.slice(1,w.indexOf('=')),w.slice(w.indexOf('=')+1)]; r=r.filter(x=>String(x[k])===v);} return r.map(x=>({...x})); }
  if(op==='add'){ const pb=attrs['place-before']; delete attrs['place-before']; const row={'.id':'*'+(nid++),...attrs};
    const idx=pb?arr.findIndex(x=>x['.id']===pb):-1; if(pb&&idx<0) throw new Error('place-before tidak valid'); if(idx>=0) arr.splice(idx,0,row); else arr.push(row); return [{ret:row['.id']}]; }
  if(op==='set'){ const id=attrs['.id']; delete attrs['.id']; const row=id?arr.find(x=>x['.id']===id):arr[0]; if(!row) throw new Error('no such item '+id); Object.assign(row,attrs); return []; }
  if(op==='remove'){ store[path]=arr.filter(x=>x['.id']!==attrs['.id']); return []; }
}
class FakeClient{ constructor(o){ this.rosApi={on(){}, write:ros}; } on(){} async connect(){} close(){} }
let aaaCalls=[]; const pppoeServers=store['/interface/pppoe-server/server'];
require.cache[require.resolve('routeros-client',{paths:[process.cwd()]})]={id:'x',filename:'x',loaded:true,exports:{RouterOSClient:FakeClient}};
const srv=net.createServer(s=>s.end()).listen(8728,'127.0.0.1',async()=>{
  try{
    const D=require('better-sqlite3'); const db0=new D('database/billing.db'); db0.close();
  }catch(e){}
  const db=require('./config/database');
  db.prepare("INSERT INTO routers (name, host, user, password, port) VALUES ('RT-TEST','127.0.0.1','admin','x',8728)").run();
  const rid=db.prepare('SELECT id FROM routers').get().id;
  const m=require('./services/mikrotikService');
  console.log('--- buildPoolRanges ---');
  console.log(m.buildPoolRanges('172.16.0.2','172.16.15.254','172.16.10.1'));
  console.log(m.buildPoolRanges('10.10.99.2','10.10.99.254','10.10.99.1'));
  const show=(r)=>{ console.log(r.success?'SUKSES':'GAGAL','|',r.message); r.steps.forEach(s=>console.log('  ',s.status.padEnd(5),s.name,'—',s.detail.slice(0,120))); };
  console.log('\n=== SETUP #1 (paket+RADIUS) ==='); show(await m.setupPppoeNetwork(rid,{packages:true,radius:true}));
  console.log('\n=== SETUP #2 (ulang, harus idempoten) ==='); show(await m.setupPppoeNetwork(rid,{packages:true,radius:true}));
  db.prepare("INSERT INTO packages (name, price, speed_up, speed_down) VALUES ('10Mbps',150000,10,20)").run();
  db.prepare("INSERT INTO packages (name, price, speed_up, speed_down) VALUES ('Paket Tanpa Speed',99000,0,0)").run();
  console.log('\n=== SETUP #3 (setelah ada 2 paket) ==='); show(await m.setupPppoeNetwork(rid,{packages:true,radius:false}));
  console.log('\n--- isi router tiruan ---');
  console.log('pool   :',store['/ip/pool'].map(p=>p.name+'='+p.ranges));
  console.log('profil :',store['/ppp/profile'].map(p=>`${p.name}[${p['local-address']||'-'} / ${p['remote-address']||'-'} / ${p['rate-limit']||'-'}]`));
  console.log('nat    :',store['/ip/firewall/nat'].map(n=>n.comment));
  console.log('filter :',store['/ip/firewall/filter'].map(n=>n.comment+':'+n.action));
  console.log('radius :',store['/radius'].map(r=>`${r.address} secret=${r.secret} ${r.comment}`));
  console.log('aaa    :',JSON.stringify(store['/ppp/aaa'][0]),'| pppoe auth:',pppoeServers[0].authentication);
  console.log('urutan filter:',store['/ip/firewall/filter'].map(n=>n.comment).join(' > '));
  srv.close(); process.exit(0);
});
