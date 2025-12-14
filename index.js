const { 
    makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const config = require('./config.js');

class LiviaaBot {
    constructor() {
        this.sock = null;
        this.plugins = new Map();
        this.loadPlugins();
    }

    // Load semua plugin dari folder plugins
    loadPlugins() {
        const pluginDir = path.join(__dirname, 'plugins');
        if (fs.existsSync(pluginDir)) {
            const files = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js'));
            files.forEach(file => {
                try {
                    const plugin = require(path.join(pluginDir, file));
                    if (plugin.name && plugin.execute) {
                        this.plugins.set(plugin.name, plugin);
                        console.log(`✅ Plugin ${plugin.name} loaded`);
                    }
                } catch (error) {
                    console.error(`❌ Error loading plugin ${file}:`, error.message);
                }
            });
        }
    }

    async start() {
        console.log('🤖 Starting LIVIAA BOT...\n');
        
        // Authentication
        const { state, saveCreds } = await useMultiFileAuthState(
            path.join(__dirname, 'database', 'auth_info')
        );
        
        const { version } = await fetchLatestBaileysVersion();
        
        // Create socket connection
        this.sock = makeWASocket({
            version,
            auth: state,
            logger: pino({ level: 'error' }),
            printQRInTerminal: true,
            browser: ['LIVIAA BOT', 'Chrome', '1.0.0']
        });
        
        // Save credentials
        this.sock.ev.on('creds.update', saveCreds);
        
        // Handle connection updates
        this.sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('Connection closed, reconnecting:', shouldReconnect);
                if (shouldReconnect) {
                    setTimeout(() => this.start(), 5000);
                }
            } else if (connection === 'open') {
                console.log('✅ Connected to WhatsApp');
                this.updateBotStatus();
            }
        });
        
        // Setup event listeners
        this.setupMessageHandler();
        this.setupGroupEvents();
    }

    updateBotStatus() {
        this.sock.updateProfileStatus(`✨ ${config.botName} Online 24 Jam`);
        this.sock.updateProfileName(config.botName);
        this.sock.updateProfilePicture(config.botName, fs.readFileSync('./media/bot-avatar.jpg')).catch(() => {});
    }

    setupMessageHandler() {
        this.sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            
            if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;
            
            const jid = msg.key.remoteJid;
            const fromMe = msg.key.fromMe;
            const text = msg.message.conversation || 
                        msg.message.extendedTextMessage?.text || 
                        msg.message.buttonsResponseMessage?.selectedButtonId || 
                        '';
            
            // Ignore messages from bot itself
            if (fromMe) return;
            
            const command = text.toLowerCase().trim();
            
            // ============ MENU HANDLER ============
            if (command === '.menu' || command === 'menu') {
                await this.sendMenu(jid);
            }
            
            // ============ GROUP MENU ============
            else if (command === '.welcome on') {
                await this.sock.sendMessage(jid, { text: '🌸 Welcome message diaktifkan!' });
            }
            else if (command === '.welcome off') {
                await this.sock.sendMessage(jid, { text: '🌸 Welcome message dimatikan!' });
            }
            else if (command === '.antilink on') {
                await this.sock.sendMessage(jid, { text: '🔗 Proteksi link diaktifkan!' });
            }
            else if (command === '.antilink off') {
                await this.sock.sendMessage(jid, { text: '🔗 Proteksi link dimatikan!' });
            }
            else if (command === '.tagall') {
                await this.tagAllMembers(jid);
            }
            else if (command === '.setdesc') {
                await this.sock.sendMessage(jid, { text: '✏️ Reply dengan deskripsi grup baru' });
            }
            else if (command === '.setname') {
                await this.sock.sendMessage(jid, { text: '✏️ Reply dengan nama grup baru' });
            }
            
            // ============ ADMIN MENU ============
            else if (command === '.add') {
                await this.sock.sendMessage(jid, { text: '👥 Reply dengan nomor untuk ditambahkan' });
            }
            else if (command === '.kick') {
                await this.sock.sendMessage(jid, { text: '👢 Tag member yang akan di-kick' });
            }
            else if (command === '.promote') {
                await this.sock.sendMessage(jid, { text: '⬆️ Tag member untuk di-promote' });
            }
            else if (command === '.demote') {
                await this.sock.sendMessage(jid, { text: '⬇️ Tag member untuk di-demote' });
            }
            else if (command === '.linkgroup') {
                const code = await this.sock.groupInviteCode(jid);
                await this.sock.sendMessage(jid, { 
                    text: `🔗 Link Group: https://chat.whatsapp.com/${code}` 
                });
            }
            
            // ============ OWNER MENU ============
            else if (command === '.restart') {
                await this.sock.sendMessage(jid, { text: '🔄 Bot akan restart...' });
                process.exit(0);
            }
            else if (command === '.bc') {
                await this.sock.sendMessage(jid, { text: '📢 Mode broadcast: Reply dengan pesan' });
            }
            else if (command === '.setppbot') {
                await this.sock.sendMessage(jid, { text: '🖼️ Kirim gambar untuk dijadikan PP bot' });
            }
            
            // ============ BUTTON RESPONSE ============
            else if (command === 'show_menu_button') {
                await this.sendMenu(jid);
            }
        });
    }

    setupGroupEvents() {
        this.sock.ev.on('group-participants.update', async (update) => {
            if (update.action === 'add') {
                await this.sendWelcomeMessage(update.id, update.participants);
            }
            else if (update.action === 'remove') {
                await this.sendGoodbyeMessage(update.id, update.participants);
            }
        });
    }

    async sendMenu(jid) {
        const menuMessage = {
            text: `✨ 𝗧𝘆𝗽𝗲 𝘀𝗼𝗺𝗲𝘁𝗵𝗶𝗻𝗴 𝘁𝗼 𝘀𝘁𝗮𝗿𝘁 ✨
🤖 𝗟𝗜𝗩𝗜𝗔𝗔 𝗕𝗢𝗧
💗 𝗦𝗶𝗺𝗽𝗹𝗲 • 𝗖𝘂𝘁𝗲 • 𝗣𝗼𝘄𝗲𝗿𝗳𝘂𝗹
${'ᯓᡣ𐭩 ⋆.𐙚 ̊ 𝜗ৎ ⋆.𐙚 ̊ ♡ ᥫ᭡.ִֶָ𓂃'.repeat(2)}

🌸🌷 𝗦𝗶𝗹𝗮𝗸𝗮𝗻 𝗽𝗶𝗹𝗶𝗵 𝗺𝗲𝗻𝘂 𝗱𝗶 𝗯𝗮𝘄𝗮𝗵 𝗶𝗻𝗶 🌷🌸

ᯓᡣ𐭩 ⋆.𐙚 ̊ 🌹 𝗠𝗘𝗡𝗨 𝗚𝗥𝗢𝗨𝗣 🌹
✨ .welcome on/off
✨ .antilink on/off
✨ .antibadword on/off
✨ .setdesc
✨ .setname
✨ .hidetag
✨ .tagall
✨ .group open/close
✨ .revoke

ᯓᡣ𐭩 ⋆.𐙚 ̊ 🌷 𝗠𝗘𝗡𝗨 𝗔𝗗𝗠𝗜𝗡 🌷
💗 .add
💗 .kick
💗 .promote
💗 .demote
💗 .mute
💗 .unmute
💗 .warn
💗 .del
💗 .linkgroup

ᯓᡣ𐭩 ⋆.𐙚 ̊ 🌹 𝗠𝗘𝗡𝗨 𝗢𝗪𝗡𝗘𝗥 🌹
🌸 .public
🌸 .self
🌸 .restart
🌸 .bc
🌸 .setppbot
🌸 .setnamebot
🌸 .setbio
🌸 .block
🌸 .unblock

ᯓᡣ𐭩 ⋆.𐙚 ̊ ✨ 𝗜𝗡𝗙𝗢 𝗕𝗢𝗧 ✨
💗 𝗡𝗮𝗺𝗮 𝗕𝗼𝘁 : ${config.botName}
🌷 𝗩𝗲𝗿𝘀𝗶 : ${config.version}
🌹 𝗦𝘁𝗮𝘁𝘂𝘀 : 𝗢𝗻𝗹𝗶𝗻𝗲 𝟮𝟰 𝗝𝗮𝗺
✨ 𝗠𝗼𝗱𝗲 : ${config.mode}
💌 𝗢𝘄𝗻𝗲𝗿 : ${config.ownerName}

${'ᯓᡣ𐭩 ⋆.𐙚 ̊ 𝜗ৎ ⋆.𐙚 ̊ ♡ ᥫ᭡.ִֶָ𓂃'.repeat(2)}
🌸✨ 𝗧𝗲𝗿𝗶𝗺𝗮 𝗸𝗮𝘀𝗶𝗵 𝘀𝘂𝗱𝗮𝗵 𝗺𝗲𝗻𝗴𝗴𝘂𝗻𝗮𝗸𝗮𝗻 𝗯𝗼𝘁 𝗸𝗮𝗺𝗶 ✨`,
            
            templateButtons: [
                { index: 1, urlButton: { displayText: '🌐 Official Website', url: 'https://your-website.com' }},
                { index: 2, callButton: { displayText: '📞 Contact Owner', phoneNumber: config.ownerNumber }},
                { index: 3, quickReplyButton: { displayText: '📋 Refresh Menu', id: 'show_menu_button' }}
            ]
        };
        
        await this.sock.sendMessage(jid, menuMessage);
    }

    async sendWelcomeMessage(groupJid, participants) {
        if (!config.welcomeEnabled) return;
        
        for (const user of participants) {
            const buttonMessage = {
                text: `🌸 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗡𝗘𝗪 𝗠𝗘𝗠𝗕𝗘𝗥 🌸
ᯓᡣ𐭩 ⋆.𐙚 ̊ 𝜗ৎ ⋆.𐙚 ̊ ♡ ᥫ᭡.ִֶָ𓂃

@${user.split('@')[0]}
✨ Selamat datang di @group ✨

Kami senang kamu bergabung di sini 🌷
Semoga betah & nyaman ya 🤍

${'ᯓᡣ𐭩 ⋆.𐙚 ̊ 𝜗ৎ ⋆.𐙚 ̊ ♡ ᥫ᭡.ִֶָ𓂃'.repeat(1)}
🌸 Silakan pilih menu di bawah 🌸

🌷 Button ① — Daftar
✧ Mulai registrasi & akses bot

🌹 Button ② — Owner
✧ Hubungi owner untuk bantuan

${'ᯓᡣ𐭩 ⋆.𐙚 ̊ 𝜗ৎ ⋆.𐙚 ̊ ♡ ᥫ᭡.ִֶָ𓂃'.repeat(1)}
💗 Enjoy your stay 💗
✨ Powered by ${config.botName} ✨`,
                mentions: [user],
                templateButtons: [
                    { index: 1, urlButton: { displayText: '🌷 ① — Daftar', url: 'https://daftar.example.com' }},
                    { index: 2, callButton: { displayText: '🌹 ② — Owner', phoneNumber: config.ownerNumber }},
                    { index: 3, quickReplyButton: { displayText: '📋 Lihat Menu', id: 'show_menu_button' }}
                ]
            };
            
            await this.sock.sendMessage(groupJid, buttonMessage);
        }
    }

    async sendGoodbyeMessage(groupJid, participants) {
        for (const user of participants) {
            const goodbyeMsg = {
                text: `👋 Sampai jumpa @${user.split('@')[0]}!\nTerima kasih telah bergabung dengan kami.`,
                mentions: [user]
            };
            await this.sock.sendMessage(groupJid, goodbyeMsg);
        }
    }

    async tagAllMembers(groupJid) {
        try {
            const groupMetadata = await this.sock.groupMetadata(groupJid);
            const members = groupMetadata.participants.map(p => p.id);
            
            let mentionText = '🚨 Tag All Members 🚨\n\n';
            members.forEach((member, index) => {
                mentionText += `@${member.split('@')[0]} `;
                if ((index + 1) % 5 === 0) mentionText += '\n';
            });
            
            await this.sock.sendMessage(groupJid, { 
                text: mentionText, 
                mentions: members 
            });
        } catch (error) {
            console.error('Error tagging members:', error);
        }
    }
}

// Start bot
const bot = new LiviaaBot();
bot.start().catch(console.error);
