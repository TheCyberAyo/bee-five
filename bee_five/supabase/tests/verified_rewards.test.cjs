const { PGlite } = require(process.argv[2] || '@electric-sql/pglite');
const fs = require('node:fs'); const path = require('node:path'); const assert = require('node:assert/strict');
const db = new PGlite();
const a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222', c='33333333-3333-4333-8333-333333333333';
const mid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const sql=async(q,args=[]) => (await db.query(q,args)).rows;
const actor=async uid=>db.exec(`RESET ROLE; SET ROLE authenticated; SET request.jwt.claim.sub='${uid}'; SET request.jwt.claim.role='authenticated';`);
const admin=async()=>db.exec("RESET ROLE; SET request.jwt.claim.sub=''; SET request.jwt.claim.role='service_role';");
const move=async(id,user,r,col)=>{await actor(user);return sql('select mg_record_live_move($1,$2,$3)',[id,r,col]);};
const confirm=async(id,kind='live') => (await sql('select mg_confirm_match_result($1,$2) result',[id,kind]))[0].result;
const xp=async uid=>(await sql('select user_xp from adventure_progress where user_id=$1',[uid]))[0].user_xp;
const load=name=>fs.readFileSync(path.resolve(__dirname,'../migrations',name),'utf8');
(async()=>{
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
 GRANT USAGE ON SCHEMA auth TO authenticated,service_role;
 INSERT INTO auth.users VALUES('${a}'),('${b}'),('${c}');`);
 await db.exec(load('20260101000000_mg_multiplayer_core_schema.sql'));
 await db.exec(`ALTER TABLE mg_profiles ADD COLUMN win_streak integer DEFAULT 0;
 INSERT INTO mg_profiles(id,username) VALUES('${a}','a'),('${b}','b'),('${c}','c');
 CREATE TABLE mg_async_matches(id uuid PRIMARY KEY,player1_id uuid,player2_id uuid,winner_id uuid,status text);
 GRANT ALL ON mg_profiles,mg_matches,mg_async_matches TO authenticated;
 GRANT SELECT ON mg_matches TO authenticated;`);
 await db.exec(load('20260615000000_adventure_progress_core.sql'));
 await db.exec('GRANT ALL ON adventure_progress TO authenticated;');
 await db.exec(load('20260930000000_atomic_xp_ledger.sql'));
 await db.exec(load('20260930100000_verified_competitive_rewards.sql'));
 await actor(a);
 for(const reason of ['live_win','live_loss','rewarded_ad']) await assert.rejects(sql('select apply_xp_events($1,$2)',[a,JSON.stringify([{id:mid(90),reason}])]),/Unknown XP event/);
 await sql('select apply_xp_events($1,$2)',[a,JSON.stringify([{id:mid(91),reason:'hard_practice_win'}])]);
 assert.equal(await xp(a),11);
 await sql('update mg_profiles set elo=99999,wins=999 where id=$1',[a]);
 assert.deepEqual((await sql('select elo,wins from mg_profiles where id=$1',[a]))[0],{elo:1200,wins:0});
 await assert.rejects(sql('select _credit_verified_xp($1,$2,$3)',[a,'fake','live_win']),/permission denied/);
 // One user cannot create a match then manufacture the opponent's moves.
 await sql('select mg_join_verified_live($1,$2)',[mid(1),b]);
 await assert.rejects(move(mid(1),a,0,0),/Illegal move/);
 await actor(b); await sql('select mg_join_verified_live($1,$2)',[mid(1),a]);
 await assert.rejects(move(mid(1),c,0,0),/Not a participant/);
 await move(mid(1),a,0,0); await move(mid(1),a,0,0); // network retry
 await assert.rejects(move(mid(1),a,0,1),/Illegal move/);
 await assert.rejects(confirm(mid(1)),/opponent still connected/);
 await move(mid(1),b,9,0);
 for(let col=1;col<5;col++){
   await move(mid(1),a,0,col);
   if(col<4) await move(mid(1),b,9,col);
 }
 await actor(a); assert.equal(await xp(a),12); const result=await confirm(mid(1)); assert.equal(result.winner_id,a);
 await confirm(mid(1)); assert.equal(await xp(a),12);
 await actor(b); assert.equal(await xp(b),9); await confirm(mid(1)); assert.equal(await xp(b),9);
 await admin(); assert.equal((await sql('select count(*)::int n from mg_matches where id=$1',[mid(1)]))[0].n,1);
 assert.equal((await sql('select wins from mg_profiles where id=$1',[a]))[0].wins,1);
 // Rematch has a distinct identity and alternates the opening seat.
 await actor(a); const rematch=(await sql('select mg_join_verified_live($1,$2) r',[mid(2),b]))[0].r;
 assert.equal(rematch.prior_match_count,1);
 await actor(b); await sql('select mg_join_verified_live($1,$2)',[mid(2),a]);
 await move(mid(2),b,1,1); await actor(a);
 await sql('select mg_confirm_match_result($1,$2,true,false)',[mid(2),'live']); // only self can resign
 assert.equal(await xp(a),11);
 await actor(b); assert.equal(await xp(b),10);
 // A client cannot grant an ad reward or turn a nonce into a receipt.
 await actor(a); const unit='ca-app-pub-6740638137327567/2005976804';
 const claim=(await sql('select begin_xp_ad($1) id',[unit]))[0].id;
 await assert.rejects(sql('select confirm_xp_ad($1,$2,$3,$4,now())',[claim,a,'receipt-one','2005976804']),/permission denied/);
 await admin(); await sql('select confirm_xp_ad($1,$2,$3,$4,now())',[claim,a,'receipt-one','2005976804']);
 const after=await xp(a); assert.equal(after,13);
 await sql('select confirm_xp_ad($1,$2,$3,$4,now())',[claim,a,'receipt-one','2005976804']); assert.equal(await xp(a),after);
 await assert.rejects(sql('select confirm_xp_ad($1,$2,$3,$4,now())',[claim,b,'receipt-two','2005976804']),/mismatch/);
 // Unfinished async games cannot be scored; confirmed games are idempotent.
 await sql('insert into mg_async_matches values($1,$2,$3,null,$4)',[mid(3),a,b,'active']);
 await actor(a); await assert.rejects(confirm(mid(3),'async'),/not confirmed/);
 await admin(); await sql('update mg_async_matches set status=$1,winner_id=$2 where id=$3',['completed',a,mid(3)]);
 await confirm(mid(3),'async'); await confirm(mid(3),'async'); assert.equal(await xp(a),after,'Async ranking result does not invent a new XP rule');
 // All win directions use the same server rules as the board.
 for(const [index,coords] of [
   [[0,0],[1,0],[2,0],[3,0],[4,0]],
   [[0,0],[1,1],[2,2],[3,3],[4,4]],
   [[0,4],[1,3],[2,2],[3,1],[4,0]],
 ].entries()) {
   const game=mid(10+index);
   await actor(a); const join=(await sql('select mg_join_verified_live($1,$2) r',[game,b]))[0].r;
   await actor(b); await sql('select mg_join_verified_live($1,$2)',[game,a]);
   const bOpens=join.prior_match_count%2===1;
   for(let i=0;i<5;i++) {
     if(bOpens) await move(game,b,9,i*2);
     await move(game,a,...coords[i]);
     if(!bOpens && i<4) await move(game,b,9,i*2);
   }
   await actor(a); assert.equal((await confirm(game)).winner_id,a);
 }
 // Blank abandonment awards neither XP nor a leaderboard result.
 await actor(a); await sql('select mg_join_verified_live($1,$2)',[mid(20),b]);
 await actor(b); await sql('select mg_join_verified_live($1,$2)',[mid(20),a]);
 const beforeVoid=await xp(b);
 const empty=(await sql('select mg_confirm_match_result($1,$2,false,true) r',[mid(20),'live']))[0].r;
 assert.equal(empty.voidNoMoves,true); assert.equal(await xp(b),beforeVoid);
 await admin(); assert.equal((await sql('select count(*)::int n from mg_matches where id=$1',[mid(20)]))[0].n,0);
 // Server time, not a broadcast disconnect claim, controls forfeits.
 await actor(a); const j=(await sql('select mg_join_verified_live($1,$2) r',[mid(21),b]))[0].r;
 await actor(b); await sql('select mg_join_verified_live($1,$2)',[mid(21),a]);
 await move(mid(21),j.prior_match_count%2===0?a:b,5,5);
 await actor(a); await assert.rejects(confirm(mid(21)),/still connected/);
 await admin(); await sql("update mg_live_games set p2_seen=now()-interval '60 seconds' where id=$1",[mid(21)]);
 await actor(a); assert.equal((await confirm(mid(21))).winner_id,a);
 // Full-board draw: no XP reward or deduction, including repeated confirmation.
 await actor(a); await sql('select mg_join_verified_live($1,$2)',[mid(22),b]);
 await actor(b); await sql('select mg_join_verified_live($1,$2)',[mid(22),a]);
 const drawBoard=Array.from({length:100},(_,i)=>1+(Math.floor(Math.floor(i/10)/2)+i%10)%2); drawBoard[99]=0;
 await admin(); await sql('update mg_live_games set board=$1,next_seat=2 where id=$2',[drawBoard,mid(22)]);
 const beforeDraw=await xp(b); await move(mid(22),b,9,9);
 assert.equal((await confirm(mid(22))).isDraw,true); assert.equal(await xp(b),beforeDraw);
 // Zero XP is enforced at the server, regardless of a forged client display.
 await admin(); await sql('update adventure_progress set user_xp=0 where user_id=$1',[c]);
 // Ensure a persisted zero row exists, rather than falling back to a new account default.
 await sql('insert into adventure_progress(user_id,user_xp) values($1,0) on conflict(user_id) do update set user_xp=0',[c]);
 await actor(c); await assert.rejects(sql('select mg_join_verified_live($1,$2)',[mid(23),a]),/Earn XP/);
 console.log('PASS verified rewards: illegal/forged moves, impersonation, rankings, retries, rematches, resignation, ad receipts, async results');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.close());
