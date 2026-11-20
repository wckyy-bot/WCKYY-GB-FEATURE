‎// pair.js - Creates MRWCKYY.NIMA only
‎const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
‎const pino = require('pino')
‎const express = require('express')
‎const fs = require('fs')
‎const path = require('path')
‎const lite = require('./litefunction')
‎
‎const app = express()
‎app.use(express.json())
‎app.use(express.urlencoded({ extended: true }))
‎
‎let currentCode = '', currentStatus = 'Waiting...', sessionIdText = ''
‎
‎function makeSessionFile() {
‎  const creds = fs.readFileSync(path.join(__dirname, 'session', 'creds.json'), 'utf-8')
‎  const encoded = Buffer.from(creds).toString('base64')
‎  fs.writeFileSync(path.join(__dirname, 'MRWCKYY.NIMA'), encoded)
‎  sessionIdText = encoded
‎  return path.join(__dirname, 'MRWCKYY.NIMA')
‎}
‎function sleep(ms){ return new Promise(r=>setTimeout(r,ms)) }
‎
‎app.get('/', (req,res) => {
‎  res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>MRWCKYY PAIR</title><style>body{background:#0a0a0a;color:#fff;font-family:Arial;text-align:center;padding:15px}.box{background:#161616;border:2px solid #00ff88;border-radius:16px;padding:20px;max-width:420px;margin:auto}h1{color:#00ff88}input{width:92%;padding:13px;border-radius:10px;border:none;margin:10px 0;text-align:center;font-size:16px}button{background:#00ff88;color:#000;padding:13px;border:none;border-radius:10px;font-weight:bold;width:96%} .code{font-size:30px;background:#000;padding:14px;border-radius:10px;border:1px dashed #00ff88;margin:14px 0} .small{font-size:13px;color:#aaa} a{display:inline-block;background:#00ff88;color:#000;padding:10px 18px;border-radius:10px;font-weight:bold;text-decoration:none;margin:8px 0} textarea{width:92%;height:90px;background:#000;color:#00ff88;border-radius:10px;padding:10px;font-size:11px} .success{background:#00ff88;color:#000;padding:10px;border-radius:10px;font-weight:bold}</style></head><body><div class="box"><h1>🤖 MRWCKYY</h1><h2>PAIR CODE</h2><p class="small">Get MRWCKYY.NIMA File</p><form action="/pair" method="POST"><input name="number" placeholder="263771234567" required /><button>GET PAIR CODE</button></form><div class="code">${currentCode || '---- ----'}</div><p>${currentStatus}</p>${sessionIdText ? `<div class="success">✅ PAIRED! File sent to DM</div><a href="/download">📥 DOWNLOAD MRWCKYY.NIMA</a><p class="small">OR copy SESSION_ID:</p><textarea readonly onclick="this.select()">${sessionIdText}</textarea>` : ''}<p class="small">1. Enter number<br>2. WhatsApp > Linked Devices > Link with phone number<br>3. Bot DMs you MRWCKYY.NIMA<br>4. Upload MRWCKYY.NIMA to main bot</p></div></body></html>`)
‎})
‎app.post('/pair', async (req,res) => {
‎  const number = (req.body.number||'').replace(/[^0-9]/g,'')
‎  currentCode='Please wait...'; currentStatus='Generating for '+number; sessionIdText=''
‎  startPairing(number)
‎  setTimeout(()=>res.redirect('/'),800)
‎})
‎app.get('/download', (req,res) => {
‎  const f = path.join(__dirname,'MRWCKYY.NIMA')
‎  if(fs.existsSync(f)) res.download(f,'MRWCKYY.NIMA'); else res.send('No session yet')
‎})
‎app.get('/session', (req,res) => {
‎  const f = path.join(__dirname,'MRWCKYY.NIMA')
‎  if(fs.existsSync(f)) res.send(fs.readFileSync(f,'utf-8')); else res.send('No session yet')
‎})
‎
‎async function startPairing(number){
‎  try{
‎    if(fs.existsSync('./session')) fs.rmSync('./session',{recursive:true,force:true})
‎    if(fs.existsSync('./MRWCKYY.NIMA')) fs.unlinkSync('./MRWCKYY.NIMA')
‎    const { state, saveCreds } = await useMultiFileAuthState('session')
‎    const sock = makeWASocket({ logger:pino({level:'silent'}), printQRInTerminal:false, auth:state, browser:['MRWCKYY PAIR','Chrome','1.0'] })
‎    sock.ev.on('creds.update', saveCreds)
‎    if(!sock.authState.creds.registered){
‎      await sleep(2000)
‎      const code = await sock.requestPairingCode(number)
‎      currentCode=code; currentStatus='✅ Code generated! Enter in WhatsApp NOW'; console.log('CODE:',code)
‎    }
‎    sock.ev.on('connection.update', async(u)=>{
‎      if(u.connection==='open'){
‎        currentStatus='✅ PAIRED! Creating MRWCKYY.NIMA...'
‎        await sleep(2500)
‎        const filePath = makeSessionFile()
‎        const buf = fs.readFileSync(filePath)
‎        try{
‎          await sock.sendMessage(number+'@s.whatsapp.net',{ document: buf, fileName:'MRWCKYY.NIMA', mimetype:'application/octet-stream', caption:`✅ *MRWCKYY PAIRED*\n\n📁 File: MRWCKYY.NIMA\n\nUpload this file to your bot host and run. No pairing again!\n\n⚠️ DO NOT SHARE!` })
‎          currentStatus='✅ File sent to your WhatsApp DM!'
‎        }catch(e){ currentStatus='✅ Paired! Download from website' }
‎      }
‎    })
‎  }catch(e){ currentStatus='❌ '+e.message; currentCode='ERROR' }
‎}
‎app.listen(process.env.PORT||3000, ()=>console.log('✅ MRWCKYY PAIR running'))
‎
