const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b0d10">
<title>Verify</title>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;width:100%;height:100%;overflow:hidden}
  body{
    background:#0b0d10;
    color:#f4f5f7;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    -webkit-font-smoothing:antialiased;
  }
  .app{
    width:100%;height:100%;max-width:480px;margin:auto;
    display:flex;flex-direction:column;
  }
  .main{
    flex:1;display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    padding:32px;
  }
  .ring{
    width:96px;height:96px;
    border-radius:50%;
    border:2px solid #23262b;
    display:flex;align-items:center;justify-content:center;
    margin-bottom:40px;
    position:relative;
  }
  .ring::before{
    content:"";
    position:absolute;
    inset:-2px;
    border-radius:50%;
    border:2px solid transparent;
    border-top-color:#5b8cff;
    animation:spin 1s linear infinite;
  }
  .ring.done::before{ animation:none; border-color:transparent; }
  .ring.done{ border-color:#3ddc84; }
  .ring.fail{ border-color:#ff5c5c; }
  .icon{ width:28px;height:28px; }
  @keyframes spin{ to{ transform:rotate(360deg); } }

  h1{
    font-size:19px;
    font-weight:600;
    margin:0 0 8px;
    text-align:center;
    letter-spacing:-0.01em;
  }
  p.sub{
    font-size:14px;
    color:#8a8f98;
    margin:0 0 36px;
    text-align:center;
    max-width:320px;
    line-height:1.5;
  }
  .progress{
    width:100%;
    max-width:220px;
    height:3px;
    background:#1c1f24;
    border-radius:4px;
    overflow:hidden;
  }
  .bar{
    width:0;
    height:100%;
    background:#5b8cff;
    border-radius:4px;
    transition:width .1s linear;
  }
  .bar.done{ background:#3ddc84; }
  .bar.fail{ background:#ff5c5c; }
  .status{
    font-size:13px;
    color:#5f6570;
    margin-top:16px;
    text-align:center;
    min-height:18px;
    letter-spacing:.01em;
  }
  .footer{
    padding:20px;
    text-align:center;
    font-size:11px;
    color:#4a4f58;
  }
</style>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
</head>
<body>
<div class="app">
  <div class="main">
    <div class="ring" id="ring">
      <svg class="icon" id="icon" viewBox="0 0 24 24" fill="none" stroke="#5b8cff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2"></rect>
        <line x1="12" y1="18" x2="12.01" y2="18"></line>
      </svg>
    </div>
    <h1 id="heading">Verifying your device</h1>
    <p class="sub" id="subtext">This only takes a moment. Please don't close this window.</p>
    <div class="progress"><div class="bar" id="bar"></div></div>
    <div class="status" id="status">Checking device details…</div>
    <div class="status" id="debug" style="margin-top:12px;font-size:10px;color:#3a3f47;word-break:break-all;text-align:left;max-width:320px;"></div>
  </div>
  <div class="footer">Secured connection</div>
</div>

<script>
const qs=new URLSearchParams(location.search);
const hash=qs.get("bot_hash");
const bar=document.getElementById("bar");
const statusEl=document.getElementById("status");
const heading=document.getElementById("heading");
const subtext=document.getElementById("subtext");
const ring=document.getElementById("ring");
const icon=document.getElementById("icon");

function setState(kind,title,message){
  heading.textContent=title;
  subtext.textContent=message;
  if(kind==="success"){
    ring.classList.add("done");
    bar.classList.add("done");
    icon.innerHTML='<polyline points="20 6 9 17 4 12"></polyline>';
    icon.setAttribute("stroke","#3ddc84");
  }else if(kind==="error"){
    ring.classList.add("fail");
    bar.classList.add("fail");
    icon.innerHTML='<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>';
    icon.setAttribute("stroke","#ff5c5c");
  }
}

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
      setState("error","Invalid session","Please reopen verification from the bot.");
      statusEl.textContent="Missing or invalid link";
      return;
    }

    const device=await collect();
    const telegramUserId=tgUserId();

    document.getElementById("debug").textContent=
      "bot_hash: "+JSON.stringify(hash)+
      " (len "+(hash?hash.length:0)+")\\n"+
      "telegram_user_id: "+JSON.stringify(telegramUserId)+"\\n"+
      "device_id: "+JSON.stringify(device.deviceId)+
      " (len "+device.deviceId.length+")\\n"+
      "fingerprint: "+device.fingerprint+
      " (len "+device.fingerprint.length+")\\n"+
      "Telegram obj present: "+!!(window.Telegram&&Telegram.WebApp)+"\\n"+
      "initDataUnsafe.user: "+JSON.stringify(window.Telegram?.WebApp?.initDataUnsafe?.user||null);
    document.getElementById("debug").style.whiteSpace="pre-wrap";

    if(!telegramUserId){
      setState("error","Can't detect your account","Please open this link from inside Telegram, not an external browser.");
      statusEl.textContent="Missing Telegram account info";
      return;
    }

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
      setState("success","You're verified","Your device has been confirmed successfully.");
      statusEl.textContent="Verification complete";
    }else if(result.status==="info"){
      setState("success","Already verified","This device was already confirmed.");
      statusEl.textContent="No further action needed";
    }else if(result.status==="error" && result.code==="MULTI_DEVICE"){
      setState("error","Multiple devices detected","This account is already linked to another device.");
      statusEl.textContent="Verification blocked";
    }else{
      setState("error","Verification failed",result.message||"Something went wrong. Please try again.");
      statusEl.textContent="Please try again";
    }
  }catch(e){
    setState("error","Verification failed","Something went wrong. Please try again.");
    statusEl.textContent="Please try again";
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
          "content-security-policy":"default-src 'self'; connect-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline' https://telegram.org"
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
