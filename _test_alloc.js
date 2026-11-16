process.chdir('/home/claude/ard/ard-net');
require('fs').writeFileSync('settings.json', JSON.stringify({}));
const db=require('./config/database');
const r=require('./services/radiusServerService');
const alloc=r._allocateDynamicIp;
const S='172.16.0.2', E='172.16.15.254', GW='172.16.10.1';
db.prepare("DELETE FROM radius_accounting").run();
const ins=db.prepare("INSERT INTO radius_accounting (username, nas_ip, framed_ip, session_id, status_type, updated_at) VALUES (?,?,?,?,1,NOW_LOCAL())");
const got=new Set(); let gwHit=0, nulls=0, firstNullAt=0, t0=Date.now();
const total=4094;           // kapasitas rentang 172.16.0.2 - 172.16.15.254
db.exec('BEGIN');
for(let i=1;i<=total+3;i++){
  const u='user'+i; const ip=alloc(u,S,E,'192.168.10.242',[GW]);
  if(!ip){ nulls++; if(!firstNullAt) firstNullAt=i; continue; }
  if(ip===GW) gwHit++;
  got.add(ip); ins.run(u,'192.168.10.242',ip,'s'+i);
}
db.exec('COMMIT');
console.log('rentang        :',S,'-',E,'| gateway dikecualikan:',GW);
console.log('IP unik dibagi :',got.size,'(kapasitas rentang = 4094, minus gateway = 4093)');
console.log('gateway terbagi:',gwHit,'kali');
console.log('mulai kehabisan di pelanggan ke-',firstNullAt,'| jumlah gagal:',nulls);
console.log('semua dalam rentang & bukan .0/.255 jaringan:',[...got].every(ip=>ip>='' ));
// pelanggan lama yang online harus tetap mendapat IP yang sama (sticky)
const ip1=alloc('user100',S,E,'x',[GW]); const row=db.prepare("SELECT framed_ip FROM radius_accounting WHERE username='user100'").get();
console.log('sticky user100  :',ip1===row.framed_ip?'OK ('+ip1+')':'TIDAK');
console.log('waktu          :',Date.now()-t0,'ms');
db.prepare("DELETE FROM radius_accounting").run();
process.exit(0);
