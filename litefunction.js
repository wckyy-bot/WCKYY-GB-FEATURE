‎const axios = require('axios')
‎const fs = require('fs')
‎const path = require('path')
‎module.exports = {
‎  sleep: (ms) => new Promise(r => setTimeout(r, ms)),
‎  getBuffer: async (url) => { try{ const res = await axios.get(url,{responseType:'arraybuffer',timeout:15000}); return Buffer.from(res.data) }catch{ return null } },
‎  cleanText: (t) => { if(!t) return ''; return t.replace(/\s+/g,' ').trim() },
‎  getText: (m) => m.message?.conversation || m.message?.extendedTextMessage?.text || m.message?.imageMessage?.caption || m.message?.videoMessage?.caption || '',
‎  runtime: (sec) => { sec=Number(sec); const h=Math.floor(sec/3600), m=Math.floor(sec%3600/60), s=Math.floor(sec%60); return `${h}h ${m}m ${s}s` },
‎  cleanCache: () => { try{ if(fs.existsSync('./tmp')) fs.rmSync('./tmp',{recursive:true,force:true}); fs.mkdirSync('./tmp',{recursive:true}) }catch{} },
‎  logError: (e) => console.log('[ERROR]:', e.message||e),
‎  isSpam: (()=>{ let last={}; return (s)=>{ const now=Date.now(); if(last[s] && now-last[s]<1500) return true; last[s]=now; return false } })(),
‎  makeSessionFile: () => {
‎    try{
‎      const creds = fs.readFileSync(path.join(__dirname,'session','creds.json'),'utf-8')
‎      const encoded = Buffer.from(creds).toString('base64')
‎      fs.writeFileSync(path.join(__dirname,'MRWCKYY.NIMA'), encoded)
‎      return path.join(__dirname,'MRWCKYY.NIMA')
‎    }catch(e){ console.log('makeSession failed',e.message); return null }
‎  }
‎}
‎
