const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#17232e">
<title>Verification Organization</title>
<style>
*{box-sizing:border-box}
html,body{margin:0;width:100%;height:100%;overflow:hidden}
body{background:#17232e;color:#fff;font-family:Arial,Helvetica,sans-serif}
.app{width:100%;height:100%;max-width:560px;margin:auto;display:flex;flex-direction:column}
.top{height:64px;display:flex;align-items:center;padding:0 16px;background:#1d2a36;border-bottom:1px solid #202d38}
.close{font-size:38px;font-weight:200;margin-right:28px}.title{font-size:22px;flex:1}
.chev{font-size:30px;margin-right:22px}.menu{font-size:29px}
.main{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;margin-top:-20px}
.device{width:238px;height:238px;border:6px solid #56a9ec;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:55px}
.phone{width:78px;height:112px;border:8px solid #56a9ec;border-radius:14px;position:relative}
.dot{width:11px;height:11px;background:#56a9ec;border-radius:50%;position:absolute;left:50%;bottom:10px;transform:translateX(-50%)}
h1{font-size:38px;margin:0 0 54px;font-weight:700;text-align:center}
.progress{width:82%;height:14px;background:#283846;border-radius:20px;overflow:hidden}
.bar{width:0;height:100%;background:#5ab0f2;border-radius:20px}
.status{font-size:24px;color:#8796a5;margin-top:18px;text-align:center;min-height:30px}
.bottom{height:48px;background:#14202a}
</style>
</head>
<body>
<div class="app">
<div class="top"><div class="close">×</div><div class="title">Verification Organization</div><div class="chev">⌄</div><div class="menu">⋮</div></div>
<div class="main">
<div class="device"><div class="phone"><div class="dot"></div></div></div>
<h1 id="heading">Device Verification</h1>
<div class="progress"><div class="bar" id="bar"></div></div>
<div class="status" id="status">Scanning your device...</div>
</div>
<div class="bottom"></div>
</div>

<script>
const qs=new URLSearchParams(location.search);
const hash=qs.get("bot_hash");
const bar=document.getElementById("bar");
const statusEl=document.getElementById("status");
const heading=document.getElementById("heading");

function localDeviceId(){
  const key="tg_device_id_v1";
  let id=localStorage.getItem(key);
  if(!id){
    id=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+"-"+Math.random().toString(36).slice(2));
    localStorage.setItem(key,id);
  }
  return id;
}

function webglData(){
  try{
    const c=document.createElement("canvas");
    const gl=c.getContext("webgl")||c.getContext("experimental-webgl");
    if(!gl)return {supported:false,vendor:null,renderer:null,version:null};
    const ext=gl.getExtension("WEBGL_debug_renderer_info");
    return {
      supported:true,
      vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):null,
      renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null,
      version:gl.getParameter(gl.VERSION)
    };
  }catch(e){return {supported:false,vendor:null,renderer:null,version:null};}
}

async function sha256(obj){
  const raw=JSON.stringify(obj);
  const bytes=new TextEncoder().encode(raw);
  const hash=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

async function collect(){
  const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"unknown";
  const data={
    userAgent:navigator.userAgent||"",
    platform:navigator.platform||"",
    vendor:navigator.vendor||"",
    screenWidth:screen.width||0,
    screenHeight:screen.height||0,
    availWidth:screen.availWidth||0,
    availHeight:screen.availHeight||0,
    colorDepth:screen.colorDepth||0,
    pixelRatio:window.devicePixelRatio||1,
    language:navigator.language||"",
    languages:Array.isArray(navigator.languages)?navigator.languages.slice(0,10):[],
    timezone:tz,
    timezoneOffset:new Date().getTimezoneOffset(),
    touchPoints:navigator.maxTouchPoints||0,
    touchCapability:("ontouchstart" in window)||(navigator.maxTouchPoints||0)>0,
    cookieEnabled:navigator.cookieEnabled===true,
    doNotTrack:navigator.doNotTrack||null,
    online:navigator.onLine===true,
    hardwareConcurrency:navigator.hardwareConcurrency||null,
    deviceMemory:navigator.deviceMemory||null,
    capabilities:{
      localStorage:!!window.localStorage,
      sessionStorage:!!window.sessionStorage,
      serviceWorker:"serviceWorker" in navigator,
      webCrypto:!!(window.crypto&&window.crypto.subtle),
      webGL:!!document.createElement("canvas").getContext("webgl")
    },
    webgl:webglData()
  };
  const deviceId=localDeviceId();
  const fingerprint=await sha256({...data,deviceId});
  return {deviceId,fingerprint,data};
}

function tgUserId(){
  try{
    return window.Telegram?.WebApp?.initDataUnsafe?.user?.id
      ? String(window.Telegram.WebApp.initDataUnsafe.user.id) : "";
  }catch(e){return "";}
}

async function run(){
  try{
    if(window.Telegram&&Telegram.WebApp) Telegram.WebApp.ready();

    if(!hash){
      statusEl.textContent="Invalid verification session";
      return;
    }

    const device=await collect();
    const telegramUserId=tgUserId();

    const response=await fetch("/api/verify",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        bot_hash:hash,
        telegram_user_id:telegramUserId,
        device_id:device.deviceId,
        fingerprint:device.fingerprint,
        fingerprint_data:device.data
      })
    });

    const result=await response.json();

    if(result.status==="success"){
      statusEl.textContent="Verification Successful";
    }else if(result.status==="info"){
      statusEl.textContent="Already Verified";
    }else if(result.status==="error" && result.code==="MULTI_DEVICE"){
      statusEl.textContent="Multi Device Detected";
    }else{
      statusEl.textContent=result.message||"Verification Failed";
    }
  }catch(e){
    statusEl.textContent="Verification Failed";
  }

  const started=Date.now();
  const timer=setInterval(()=>{
    const pct=Math.min(100,(Date.now()-started)/5000*100);
    bar.style.width=pct+"%";
    if(pct>=100){
      clearInterval(timer);
      try{
        if(window.Telegram&&Telegram.WebApp) setTimeout(()=>Telegram.WebApp.close(),200);
      }catch(e){}
    }
  },50);
}
run();
</script>
</body>
</html>`;

const json=(data,status=200)=>new Response(JSON.stringify(data),{
  status,
  headers:{
    "content-type":"application/json;charset=UTF-8",
    "cache-control":"no-store",
    "x-content-type-options":"nosniff"
  }
});

const validHash=h=>typeof h==="string"&&/^[A-Za-z0-9]{20,100}$/.test(h);
const validId=x=>typeof x==="string"&&x.length>=8&&x.length<=200;
const validFp=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);

async function sendWebhook(url,payload){
  try{
    await fetch(url,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(payload)
    });
  }catch(e){}
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);

    if(request.method==="GET"&&url.pathname==="/"){
      return new Response(HTML,{
        headers:{
          "content-type":"text/html;charset=UTF-8",
          "cache-control":"no-store",
          "content-security-policy":"default-src 'self'; connect-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'"
        }
      });
    }

    if(request.method==="GET"&&url.pathname==="/api/bot_register.php"){
      const botHash=url.searchParams.get("botHash")||"";
      const bot=url.searchParams.get("bot")||"";
      const webhook=url.searchParams.get("webhook_url")||"";

      if(!validHash(botHash))
        return json({status:"error",message:"Invalid bot hash"},400);

      if(!bot||bot.length>255)
        return json({status:"error",message:"Invalid bot"},400);

      try{new URL(webhook)}
      catch(e){return json({status:"error",message:"Invalid webhook URL"},400)}

      const now=Math.floor(Date.now()/1000);
      await env.DB.prepare(`
        INSERT INTO verification_sessions
        (bot_hash,bot_username,webhook_url,status,created_at,expires_at)
        VALUES(?,?,?,'pending',?,?)
        ON CONFLICT(bot_hash) DO UPDATE SET
          bot_username=excluded.bot_username,
          webhook_url=excluded.webhook_url,
          status='pending',
          created_at=excluded.created_at,
          expires_at=excluded.expires_at,
          verified_at=NULL
      `).bind(botHash,bot,webhook,now,now+600).run();

      return json({status:"success",message:"Verification session registered"});
    }

    if(request.method==="POST"&&url.pathname==="/api/verify"){
      let body;
      try{body=await request.json()}
      catch(e){return json({status:"error",message:"Invalid JSON"},400)}

      const h=body.bot_hash||"";
      const uid=body.telegram_user_id||"";
      const deviceId=body.device_id||"";
      const fp=body.fingerprint||"";
      const fpData=body.fingerprint_data;

      if(!validHash(h)||!validId(deviceId)||!validFp(fp)||!uid)
        return json({status:"error",message:"Required verification data is missing."},400);

      if(!fpData||typeof fpData!=="object")
        return json({status:"error",message:"Device data is missing."},400);

      const session=await env.DB.prepare(
        "SELECT * FROM verification_sessions WHERE bot_hash=? LIMIT 1"
      ).bind(h).first();

      if(!session)
        return json({status:"error",title:"Session Not Found",message:"Verification session was not found."},404);

      const now=Math.floor(Date.now()/1000);

      if(session.expires_at<now)
        return json({status:"error",title:"Session Expired",message:"Please open verification again."},410);

      const existing=await env.DB.prepare(
        "SELECT * FROM devices WHERE telegram_user_id=? LIMIT 1"
      ).bind(uid).first();

      if(existing){
        const sameDevice=existing.fingerprint===fp;

        await env.DB.prepare(`
          UPDATE devices SET last_seen_at=? WHERE telegram_user_id=?
        `).bind(now,uid).run();

        await env.DB.prepare(`
          INSERT INTO verification_events(bot_hash,telegram_user_id,device_id,fingerprint,event_type,created_at)
          VALUES(?,?,?,?,?,?)
        `).bind(h,uid,deviceId,fp,sameDevice?"already_verified":"multi_device",now).run();

        if(sameDevice){
          const result={
            status:"info",
            title:"Already Verified",
            message:"This device is already verified."
          };
          await sendWebhook(session.webhook_url,result);
          return json(result);
        }

        const result={
          status:"error",
          code:"MULTI_DEVICE",
          title:"Multi Device Detected",
          message:"This account was already verified on another device."
        };
        await sendWebhook(session.webhook_url,result);
        return json(result);
      }

      const fingerprintOwner=await env.DB.prepare(
        "SELECT telegram_user_id FROM devices WHERE fingerprint=? LIMIT 1"
      ).bind(fp).first();

      if(fingerprintOwner && String(fingerprintOwner.telegram_user_id)!==String(uid)){
        const result={
          status:"error",
          code:"MULTI_DEVICE",
          title:"Multi Device Detected",
          message:"This device fingerprint is already associated with another account."
        };
        await env.DB.prepare(`
          INSERT INTO verification_events(bot_hash,telegram_user_id,device_id,fingerprint,event_type,created_at)
          VALUES(?,?,?,?,?,?)
        `).bind(h,uid,deviceId,fp,"fingerprint_conflict",now).run();
        await sendWebhook(session.webhook_url,result);
        return json(result);
      }

      await env.DB.prepare(`
        INSERT INTO devices
        (telegram_user_id,device_id,fingerprint,fingerprint_data,first_seen_at,last_seen_at,verified_at)
        VALUES(?,?,?,?,?,?,?)
      `).bind(
        String(uid),
        deviceId,
        fp,
        JSON.stringify(fpData),
        now,now,now
      ).run();

      await env.DB.prepare(`
        UPDATE verification_sessions
        SET telegram_user_id=?,status='verified',verified_at=?
        WHERE bot_hash=?
      `).bind(String(uid),now,h).run();

      await env.DB.prepare(`
        INSERT INTO verification_events(bot_hash,telegram_user_id,device_id,fingerprint,event_type,created_at)
        VALUES(?,?,?,?,?,?)
      `).bind(h,uid,deviceId,fp,"verified",now).run();

      const result={
        status:"success",
        title:"Verification Successful",
        message:"Your device has been verified successfully."
      };

      await sendWebhook(session.webhook_url,result);
      return json(result);
    }

    return new Response("Not Found",{status:404});
  }
};
