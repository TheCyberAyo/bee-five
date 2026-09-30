const assert = require('node:assert/strict');
const { generateKeyPairSync, sign } = require('node:crypto');
const { mkdtempSync, readFileSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os'); const { resolve, join } = require('node:path');
const ts = require('../../../bee-five-web/node_modules/typescript');
const dir = mkdtempSync(join(tmpdir(),'bee-ad-ssv-'));
try {
 const source=readFileSync(resolve(__dirname,'../functions/admob-reward/verify.ts'),'utf8');
 writeFileSync(join(dir,'verify.cjs'),ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText);
 const {verifyAdMobCallback:verify}=require(join(dir,'verify.cjs'));
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
 const keys=[{keyId:123,pem:publicKey.export({type:'spki',format:'pem'})}];
 const now=Date.now();
 const raw=`ad_network=5450213213286189855&ad_unit=2005976804&custom_data=11111111-1111-4111-8111-111111111111&reward_amount=1&reward_item=XP&timestamp=${now}&transaction_id=valid_receipt_1&user_id=22222222-2222-4222-8222-222222222222`;
 const url=query=>`https://example.test/reward?${query}&signature=${sign('sha256',Buffer.from(query),privateKey).toString('base64url')}&key_id=123`;
 assert.equal(verify(url(raw),keys,now).unit,'2005976804');
 assert.throws(()=>verify(url(raw).replace('reward_amount=1','reward_amount=99'),keys,now),/signature/);
 assert.throws(()=>verify(url(raw),[{...keys[0],keyId:456}],now),/signature/);
 assert.throws(()=>verify(url(raw)+'&user_id=attacker',keys,now));
 assert.throws(()=>verify(url(raw+'&user_id=attacker'),keys,now),/Duplicate/);
 assert.throws(()=>verify(url(raw.replace('2005976804','fake')),keys,now),/ad unit/);
 assert.throws(()=>verify(url(raw),keys,now+172800001),/Expired/);
 assert.throws(()=>verify('https://example.test/reward?user_id=attacker',keys,now),/signature/);
 const encoded=raw.replace('reward_item=XP','reward_item=XP%20points');
 assert.equal(verify(url(encoded),keys,now).transaction,'valid_receipt_1');
 const decodedSignature=sign('sha256',Buffer.from(decodeURIComponent(encoded)),privateKey).toString('base64url');
 assert.equal(verify(`https://example.test/reward?${encoded}&signature=${decodedSignature}&key_id=123`,keys,now).transaction,'valid_receipt_1');
 console.log('PASS AdMob verification: real ECDSA signatures, tampering, duplicates, identity, unit, expiry');
} finally { rmSync(dir,{recursive:true,force:true}); }
