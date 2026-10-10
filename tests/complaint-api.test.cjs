const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript'),path=require('node:path');
const root=path.join(__dirname,'..');
const compile=file=>ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const validation={exports:{}};new Function('exports','module',compile('src/features/complaints/validation.ts'))(validation.exports,validation);
const route={exports:{}};new Function('require','exports','module',compile('src/app/api/complaints/route.ts'))(id=>id.startsWith('@/features/')?validation.exports:require(id),route.exports,route);
const entry={fullName:'Consumidor de prueba',docType:'DNI',docNumber:'01234567',phone:'999888777',email:'prueba@example.test',address:'Dirección de prueba 123',isMinor:false,contractedGoodType:'PRODUCTO',claimedAmount:20,goodDescription:'Plato de prueba',claimType:'RECLAMO',detail:'Detalle de prueba para la hoja',consumerRequest:'Solicito una respuesta',declarationAccepted:true};
const request=(body,origin='http://localhost:3000',method='POST',headers={})=>new Request('http://localhost:3000/api/complaints',{method,headers:{origin,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('API: valida antes de persistir, limita tamaño/origen, confirma correlativo y no filtra errores privados',async()=>{
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://complaint-tests.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test-anon-key';
 let calls=0;const original=global.fetch;
 const receipt={claimCode:'REC-2026-0001',createdAt:'2026-10-10T15:00:00Z',provider:{bookId:'primary',name:'Proveedor de prueba',ruc:'12345678901',address:'Local de prueba',configured:true}};
 global.fetch=async()=>{calls++;return Response.json(receipt);};
 const body={requestId:'12345678-1234-4123-8123-123456789012',bookId:'primary',entry};
 try{
  assert.equal((await route.exports.POST(request({...body,entry:{...entry,docNumber:'123'}}))).status,400);assert.equal(calls,0);
  assert.equal((await route.exports.POST(request(body,'https://otro.example'))).status,403);
  assert.equal((await route.exports.POST(request({...body,entry:{...entry,detail:'x'.repeat(40000)}}))).status,400);
  assert.equal((await route.exports.POST(request({...body,bookId:'otro-libro'}))).status,409);
  const response=await route.exports.POST(request(body));assert.equal(response.status,200);assert.deepEqual(await response.json(),receipt);
  global.fetch=async()=>Response.json({code:'PGRST202',message:'PRIVATE DATABASE DETAILS'},{status:404});
  const unavailable=await route.exports.POST(request(body));assert.equal(unavailable.status,503);assert.ok(!JSON.stringify(await unavailable.json()).includes('PRIVATE DATABASE DETAILS'));
  assert.equal((await route.exports.PUT(request({name:'Proveedor',ruc:'12345678901',address:'Local de prueba'},undefined,'PUT'))).status,401);
 }finally{global.fetch=original;}
});
