import express from "express";
import session from "express-session";
import SQLiteStoreFactory from "connect-sqlite3";
import Database from "better-sqlite3";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const root=path.dirname(fileURLToPath(import.meta.url)), app=express(), production=process.env.NODE_ENV==="production";
for(const key of ["ADMIN_EMAIL","ADMIN_PASSWORD_HASH","SESSION_SECRET"]) if(!process.env[key]) { console.error("Missing environment variable:",key); process.exit(1); }
if(process.env.SESSION_SECRET.length<32){console.error("SESSION_SECRET must be at least 32 characters.");process.exit(1);}
const dataDir=process.env.DATA_DIR||path.join(root,"data"); fs.mkdirSync(dataDir,{recursive:true});
const db=new Database(path.join(dataDir,"ledger.sqlite")); db.pragma("journal_mode = WAL");
db.exec("CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL, updated_at TEXT NOT NULL); INSERT OR IGNORE INTO app_state(id,payload,updated_at) VALUES(1,'{\\"teams\\":[] , \\"transactions\\":[] , \\"notes\\":[] , \\"currency\\":\\"TRY\\"}',datetime('now'));");
const SQLiteStore=SQLiteStoreFactory(session);
app.disable("x-powered-by"); app.set("trust proxy",production?1:false); app.use(helmet({contentSecurityPolicy:false})); app.use(express.json({limit:"1mb"}));
app.use(session({store:new SQLiteStore({db:"sessions.sqlite",dir:dataDir,concurrentDB:true}),name:"ledger.sid",secret:process.env.SESSION_SECRET,resave:false,saveUninitialized:false,cookie:{httpOnly:true,secure:production,sameSite:"strict",maxAge:8*60*60*1000}}));
const limiter=rateLimit({windowMs:15*60*1000,limit:8,standardHeaders:true,legacyHeaders:false});
const auth=(req,res,next)=>req.session?.authenticated?next():res.status(401).json({error:"Oturum açman gerekiyor."});
app.get("/api/health",(_req,res)=>res.json({ok:true}));
app.get("/api/session",(req,res)=>res.json({authenticated:!!req.session?.authenticated}));
app.post("/api/login",limiter,(req,res,next)=>{
 const email=String(req.body?.email||"").trim().toLowerCase(), password=String(req.body?.password||""), configured=process.env.ADMIN_EMAIL.trim().toLowerCase();
 const a=Buffer.from(email),b=Buffer.from(configured); const emailOK=a.length===b.length&&crypto.timingSafeEqual(a,b); let passwordOK=false;
 try{const [scheme,saltHex,hashHex]=process.env.ADMIN_PASSWORD_HASH.split("$");if(scheme==="scrypt"&&saltHex&&hashHex){const got=crypto.scryptSync(password,Buffer.from(saltHex,"hex"),64),expected=Buffer.from(hashHex,"hex");passwordOK=got.length===expected.length&&crypto.timingSafeEqual(got,expected);}}catch{}
 if(!emailOK||!passwordOK)return res.status(401).json({error:"E-posta veya parola hatalı."});
 req.session.regenerate(err=>{if(err)return next(err);req.session.authenticated=true;req.session.save(err2=>err2?next(err2):res.json({ok:true}));});
});
app.post("/api/logout",(req,res,next)=>req.session.destroy(err=>{if(err)return next(err);res.clearCookie("ledger.sid",{httpOnly:true,secure:production,sameSite:"strict"});res.json({ok:true});}));
app.get("/api/state",auth,(_req,res)=>{const row=db.prepare("SELECT payload FROM app_state WHERE id=1").get();res.json(JSON.parse(row.payload));});
app.put("/api/state",auth,(req,res)=>{const s=req.body;if(!s||!Array.isArray(s.teams)||!Array.isArray(s.transactions)||!Array.isArray(s.notes))return res.status(400).json({error:"Geçersiz veri biçimi."});if(JSON.stringify(s).length>900000)return res.status(413).json({error:"Kayıt boyutu çok büyük."});const clean={teams:s.teams,transactions:s.transactions,notes:s.notes,currency:["TRY","USD","EUR"].includes(s.currency)?s.currency:"TRY"};db.prepare("UPDATE app_state SET payload=?,updated_at=datetime('now') WHERE id=1").run(JSON.stringify(clean));res.json({ok:true,updatedAt:new Date().toISOString()});});
app.use(express.static(path.join(root,"public"),{index:false,maxAge:production?"1h":0}));
app.get("*",(_req,res)=>res.sendFile(path.join(root,"public","index.html")));
app.use((err,_req,res,_next)=>{console.error(err);res.status(500).json({error:"Sunucu tarafında hata oluştu."});});
app.listen(process.env.PORT||3000,()=>console.log("Ledger server started"));
