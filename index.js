‎// index.js - MRWCKYY BOT - GHOST + 1 TICK - RUNS ONLY ON MRWCKYY.NIMA
‎const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys')
‎const pino = require('pino')
‎const fs = require('fs')
‎const path = require('path')
‎const config = require('./config')
‎const lite = require('./litefunction')
‎const yts = require('yt-search')
‎const ytdl = require('@distube/ytdl-core')
‎const FormData = require('form-data')
‎const axios = require('axios')
‎
‎// ===== GB GHOST + 1 TICK HELPERS =====
‎async function ghostPresence(sock) {
‎  if (!config.ghostMode) return
‎  try {
‎    // Force INVISIBLE - never show Online
‎    await sock.sendPresenceUpdate('unavailable')
‎  } catch {}
‎}
‎async function oneTickMode(sock) {
‎  // Keep socket invisible so WhatsApp doesn't send Delivered receipt
‎  // Baileys sends delivered receipt only when presence is available / socket is active
‎  // By staying unavailable + never calling readMessages, sender stays on 1 tick
‎  await ghostPresence(sock)
‎}
‎
‎function loadSession() {
‎  if (process.env.SESSION_ID) {
‎    try {
‎      const decoded = Buffer.from(process.env.SESSION_ID.trim(), 'base64').toString('utf-8')
‎      JSON.parse(decoded)
‎      fs.mkdirSync('./session', { recursive: true })
‎      fs.writeFileSync('./session/creds.json', decoded)
‎      console.log('✅ Session loaded from SESSION_ID secret')
‎      return true
‎    } catch(e) { console.log('❌ SESSION_ID invalid:', e.message) }
‎  }
‎  const nimaPath = path.join(__dirname, 'MRWCKYY.NIMA')
‎  if (fs.existsSync(nimaPath)) {
‎    try {
‎      const encoded = fs.readFileSync(nimaPath, 'utf-8').trim()
‎      const decoded = Buffer.from(encoded, 'base64').toString('utf-8')
‎      JSON.parse(decoded)
‎      fs.mkdirSync('./session', { recursive: true })
‎      fs.writeFileSync('./session/creds.json', decoded)
‎      console.log('✅ Session loaded from MRWCKYY.NIMA file')
‎      return true
‎    } catch(e) { console.log('❌ MRWCKYY.NIMA corrupt:', e.message) }
‎  }
‎  if (fs.existsSync('./session/creds.json')) return true
‎  return false
‎}
‎const hasSession = loadSession()
‎if (!hasSession) {
‎  console.log('❌ NO MRWCKYY.NIMA FOUND! Go to Pair Site, pair, upload MRWCKYY.NIMA')
‎  process.exit(0)
‎}
‎setInterval(() => lite.cleanCache(), 30 * 60 * 1000)
‎lite.cleanCache()
‎
‎async function start() {
‎  const { state, saveCreds } = await useMultiFileAuthState('session')
‎  const sock = makeWASocket({
‎    logger: pino({ level: 'silent' }),
‎    printQRInTerminal: false,
‎    auth: state,
‎    browser: ['MRWCKYY BOT', 'Chrome', '1.0'],
‎    syncFullHistory: false,
‎    markOnlineOnConnect: false, // NEVER show Online
‎    generateHighQualityLinkPreview: false,
‎    defaultQueryTimeoutMs: 60000,
‎    // GB: Don't auto-sync / Don't send receipts
‎    shouldSyncHistoryMessage: () => false,
‎    // Block delivery/read receipts from being auto-sent
‎    emitOwnEvents: false,
‎    // Don't send active presence
‎    fireInitQueries: false
‎  })
‎  sock.ev.on('creds.update', saveCreds)
‎  sock.ev.on('creds.update', () => {
‎    try {
‎      const creds = fs.readFileSync('./session/creds.json', 'utf-8')
‎      fs.writeFileSync('./MRWCKYY.NIMA', Buffer.from(creds).toString('base64'))
‎    } catch {}
‎  })
‎
‎  // ===== BLOCK RECEIPTS - THIS MAKES 1 TICK =====
‎  // WhatsApp sends Delivered (2 ticks) when it gets a receipt.
‎  // We intercept and NEVER send it.
‎  sock.ev.on('messages.upsert', async ({ messages, type }) => {
‎    // Do NOT call sock.readMessages() here - that would give blue ticks
‎    // Do NOT send receipt - that would give 2 grey ticks
‎    // We just let the message sit - sender stays on 1 tick ✓
‎  })
‎
‎  sock.ev.on('connection.update', async (u) => {
‎    const { connection, lastDisconnect } = u
‎    if (connection === 'close') {
‎      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
‎      if (shouldReconnect) start()
‎      else { console.log('❌ Logged out'); if (fs.existsSync('./MRWCKYY.NIMA')) fs.unlinkSync('./MRWCKYY.NIMA') }
‎    }
‎    if (connection === 'open') {
‎      console.log('✅ MRWCKYY BOT CONNECTED VIA MRWCKYY.NIMA')
‎      console.log('👻 GHOST MODE: ' + (config.ghostMode ? 'ON' : 'OFF'))
‎      console.log('✓ 1 TICK MODE: ' + (config.oneTickMode ? 'ON - Sender sees 1 tick' : 'OFF'))
‎      await oneTickMode(sock)
‎      // Keep forcing invisible every 10 sec - prevents WhatsApp flipping you to Online / Delivered
‎      setInterval(() => oneTickMode(sock), 10000)
‎    }
‎  })
‎
‎  sock.ev.on('messages.upsert', async ({ messages }) => {
‎    try {
‎      const m = messages[0]
‎      if (!m.message || m.key.fromMe) return
‎      const from = m.key.remoteJid
‎      const sender = m.key.participant || m.key.remoteJid
‎      if (lite.isSpam(sender)) return
‎
‎      // ===== GB GHOST: NEVER SEND BLUE TICKS / DELIVERED / TYPING =====
‎      // IMPORTANT: Do NOT call sock.readMessages() or sock.sendPresenceUpdate('available')
‎      // That is what creates 2 ticks / blue ticks.
‎      // We stay unavailable = 1 tick.
‎      if (from === 'status@broadcast' && config.hideViewStatus) {
‎        // View status secretly, no Seen receipt
‎        return
‎      }
‎
‎      if (config.antiViewOnce && (m.message.viewOnceMessageV2 || m.message.viewOnceMessage)) {
‎        try {
‎          const inner = m.message.viewOnceMessageV2?.message || m.message.viewOnceMessage?.message
‎          const type = Object.keys(inner)[0]
‎          const stream = await downloadContentFromMessage(inner[type], type.includes('image') ? 'image' : 'video')
‎          let buffer = Buffer.from([])
‎          for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
‎          await sock.sendMessage(config.ownerNumber + '@s.whatsapp.net', { [type.includes('image') ? 'image' : 'video']: buffer, caption: `👁️ Anti-ViewOnce from @${sender.split('@')[0]}` })
‎        } catch(e) { lite.logError(e) }
‎      }
‎      if (m.message.protocolMessage?.type === 0 && config.antiDelete) {
‎        await sock.sendMessage(config.ownerNumber + '@s.whatsapp.net', { text: `🗑️ Deleted message\nChat: ${from}\nFrom: ${sender}` })
‎      }
‎
‎      const text = lite.cleanText(lite.getText(m))
‎      if (!text.startsWith(config.prefix)) return
‎      const cmd = text.slice(1).trim().split(' ')[0].toLowerCase()
‎      const args = text.slice(1).trim().split(' ').slice(1).join(' ')
‎      const reply = (t) => sock.sendMessage(from, { text: t }, { quoted: m })
‎
‎      if (cmd === 'menu') reply(`🤖 *${config.botName}*\n\n.menu\n.ping\n.alive\n.tagall\n.status\n.ai <text>\n.songs <name>\n.video <name>\n.lyrics <artist - title>\n.shazam\n.session\n\n👻 GB:\n.ghost on/off\n.onetick on/off\n.online\n.offline\n\nAnti-Delete ✅\nAnti-ViewOnce ✅\nGhost ✅\n1 Tick ✅\n\nSession: MRWCKYY.NIMA ✅`)
‎      if (cmd === 'ping') reply(`Pong! ⚡ ${Date.now() - Number(m.messageTimestamp) * 1000}ms\nUptime: ${lite.runtime(process.uptime())}`)
‎      if (cmd === 'alive') reply(`✅ ${config.botName} online via MRWCKYY.NIMA\nUptime: ${lite.runtime(process.uptime())}`)
‎      if (cmd === 'ai') reply(`🤖 AI: ${args || 'Hi!'}`)
‎      if (cmd === 'status') { config.autoStatusSave = true; reply('✅ Status Saver ON') }
‎      if (cmd === 'tagall' && from.endsWith('@g.us')) {
‎        const group = await sock.groupMetadata(from)
‎        const mentions = group.participants.map(p => p.id)
‎        await sock.sendMessage(from, { text: `👥 TAG ALL\n${group.participants.map(p => '@' + p.id.split('@')[0]).join(' ')}`, mentions })
‎      }
‎
‎      // ===== GB GHOST + 1 TICK COMMANDS =====
‎      if (cmd === 'ghost') {
‎        if (args === 'on') { config.ghostMode = true; config.oneTickMode = true; await oneTickMode(sock); return reply('👻 *GHOST MODE ON*\n\n✅ Hidden Online\n✅ No Typing...\n✅ No Recording...\n✅ 1 Tick Only - Not Delivered\n✅ No Blue Ticks\n✅ Status viewed secretly') }
‎        if (args === 'off') { config.ghostMode = false; config.oneTickMode = false; await sock.sendPresenceUpdate('available'); return reply('👁️ *GHOST MODE OFF*\nNow you appear normal - 2 ticks + blue ticks.') }
‎        return reply(`👻 *GHOST: ${config.ghostMode ? 'ON ✅' : 'OFF ❌'}*\n✓ *1 TICK: ${config.oneTickMode ? 'ON ✅' : 'OFF ❌'}*\n\n.ghost on - Invisible + 1 Tick\n.ghost off - Normal\n.onetick on/off`)
‎      }
‎      if (cmd === 'onetick' || cmd === '1tick') {
‎        if (args === 'on') { config.oneTickMode = true; config.ghostMode = true; await oneTickMode(sock); return reply('✓ *1 TICK MODE ON*\n\nSender sees only 1 tick ✓\nYou still receive + read messages secretly.') }
‎        if (args === 'off') { config.oneTickMode = false; return reply('✓✓ *1 TICK MODE OFF*\nSender will now see 2 ticks (delivered).') }
‎        return reply(`✓ *1 TICK MODE: ${config.oneTickMode ? 'ON ✅' : 'OFF ❌'}*\n\n.onetick on - Sender sees 1 tick\n.onetick off - Sender sees 2 ticks`)
‎      }
‎      if (cmd === 'online') { config.ghostMode = false; config.oneTickMode = false; await sock.sendPresenceUpdate('available'); return reply('🟢 ONLINE - Normal mode') }
‎      if (cmd === 'offline' || cmd === 'invisible') { config.ghostMode = true; config.oneTickMode = true; await sock.sendPresenceUpdate('unavailable'); return reply('👻 INVISIBLE + 1 TICK ON') }
‎
‎      if (cmd === 'session') {
‎        const file = lite.makeSessionFile()
‎        if (file) {
‎          const buf = fs.readFileSync(file)
‎          await sock.sendMessage(from, { document: buf, fileName: 'MRWCKYY.NIMA', mimetype: 'application/octet-stream', caption: '📁 Your MRWCKYY.NIMA' }, { quoted: m })
‎        }
‎      }
‎
‎      // ===== .SONGS - MP3 FILE ONLY =====
‎      if (cmd === 'songs' || cmd === 'song' || cmd === 'play') {
‎        if (!args) return reply(`🎵 *SONGS*\nUsage: .songs <song name>`)
‎        try {
‎          await sock.sendMessage(from, { text: `🔍 Searching: *${args}*...` }, { quoted: m })
‎          const search = await yts(args)
‎          if (!search.videos.length) return reply('❌ Song not found')
‎          const video = search.videos[0]
‎          const cleanName = video.title.replace(/[^a-zA-Z0-9 ]/g,'').trim()
‎          await sock.sendMessage(from, { text: `⬇️ Downloading: *${video.title}*...` }, { quoted: m })
‎          const stream = ytdl(video.url, { filter: 'audioonly', quality: 'highestaudio' })
‎          let buffer = Buffer.from([])
‎          for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
‎          if (buffer.length === 0) return reply('❌ Download failed')
‎          await sock.sendMessage(from, { document: buffer, fileName: cleanName + '.mp3', mimetype: 'audio/mpeg', caption: `🎵 *${video.title}*\n⏱️ ${video.timestamp} • 👁️ ${video.views}\nBy MRWCKYY` }, { quoted: m })
‎        } catch(e) { console.log(e); reply('❌ Song download failed.') }
‎      }
‎
‎      // ===== .VIDEO - MP4 FILE ONLY =====
‎      if (cmd === 'video' || cmd === 'ytvideo' || cmd === 'mp4') {
‎        if (!args) return reply(`🎬 *VIDEO*\nUsage: .video <video name>`)
‎        try {
‎          await sock.sendMessage(from, { text: `🔍 Searching video: *${args}*...` }, { quoted: m })
‎          const search = await yts(args)
‎          if (!search.videos.length) return reply('❌ Video not found')
‎          const video = search.videos[0]
‎          const cleanName = video.title.replace(/[^a-zA-Z0-9 ]/g,'').trim()
‎          await sock.sendMessage(from, { text: `⬇️ Downloading video: *${video.title}*...` }, { quoted: m })
‎          const stream = ytdl(video.url, { filter: 'audioandvideo', quality: '18' })
‎          let buffer = Buffer.from([])
‎          for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); if (buffer.length > 60 * 1024 * 1024) break }
‎          if (buffer.length === 0) return reply('❌ Video download failed')
‎          if (buffer.length > 60 * 1024 * 1024) return reply('❌ Video too big (>60MB)')
‎          await sock.sendMessage(from, { document: buffer, fileName: cleanName + '.mp4', mimetype: 'video/mp4', caption: `🎬 *${video.title}*\nBy MRWCKYY` }, { quoted: m })
‎        } catch(e) { console.log(e); reply('❌ Video download failed.') }
‎      }
‎
‎      // ===== .LYRICS =====
‎      if (cmd === 'lyrics' || cmd === 'lyric') {
‎        if (!args) return reply(`📝 *LYRICS*\nUsage: .lyrics <artist - title>`)
‎        try {
‎          await reply(`🔍 Searching lyrics for *${args}*...`)
‎          let lyricsText = null, title = args, artist = ''
‎          if (args.includes('-')) {
‎            const parts = args.split('-'); artist = parts[0].trim(); title = parts.slice(1).join('-').trim()
‎            try { const res = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, { timeout: 15000 }); if (res.data?.lyrics) lyricsText = res.data.lyrics } catch {}
‎          }
‎          if (!lyricsText) {
‎            try { const res = await axios.get(`https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`, { timeout: 15000 }); if (res.data?.length && res.data[0].plainLyrics) { lyricsText = res.data[0].plainLyrics; title = res.data[0].trackName; artist = res.data[0].artistName } } catch {}
‎          }
‎          if (!lyricsText) return reply(`❌ Lyrics not found for *${args}*`)
‎          const full = `📝 *LYRICS*\n\n🎵 ${title}\n👤 ${artist || 'Unknown'}\n\n` + lyricsText
‎          if (full.length > 4000) { await reply(full.slice(0,4000)); await reply(full.slice(4000,8000)) } else await reply(full)
‎        } catch(e) { console.log(e); reply('❌ Lyrics failed.') }
‎      }
‎
‎      // ===== .SHAZAM =====
‎      if (cmd === 'shazam') {
‎        try {
‎          const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
‎          let audioMsg = null, audioType = null
‎          if (quoted?.audioMessage) { audioMsg = quoted.audioMessage; audioType = 'audio' }
‎          else if (quoted?.videoMessage) { audioMsg = quoted.videoMessage; audioType = 'video' }
‎          else if (m.message?.audioMessage) { audioMsg = m.message.audioMessage; audioType = 'audio' }
‎          else return reply(`🎧 *SHAZAM*\nReply to audio with .shazam`)
‎          await reply('🎧 Listening...')
‎          const stream = await downloadContentFromMessage(audioMsg, audioType)
‎          let buffer = Buffer.from([])
‎          for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
‎          fs.mkdirSync('./tmp', { recursive: true })
‎          fs.writeFileSync('./tmp/shazam.mp3', buffer)
‎          const form = new FormData()
‎          form.append('file', fs.createReadStream('./tmp/shazam.mp3'))
‎          form.append('return', 'apple_music,spotify')
‎          form.append('api_token', process.env.AUDD_TOKEN || 'test')
‎          let result = null
‎          try { const res = await axios.post('https://api.audd.io/', form, { headers: form.getHeaders(), timeout: 20000 }); result = res.data?.result } catch(e) { console.log('AudD failed', e.message) }
‎          if (result && result.title) await reply(`🎵 *SHAZAM FOUND!*\n\n🎤 ${result.title}\n👤 ${result.artist}\n\n.songs ${result.title} - ${result.artist}`)
‎          else await reply(`❌ Could not identify. Try longer / clearer audio`)
‎        } catch(e) { console.log(e); reply('❌ Shazam failed.') }
‎      }
‎
‎    } catch(e) { lite.logError(e) }
‎  })
‎  sock.ev.on('group-participants.update', async (u) => {
‎    try {
‎      const text = u.action === 'add' ? `👋 Welcome @${u.participants[0].split('@')[0]}` : `👋 Bye @${u.participants[0].split('@')[0]}`
‎      await sock.sendMessage(u.id, { text, mentions: u.participants })
‎    } catch(e) {}
‎  })
‎}
‎start()
‎
