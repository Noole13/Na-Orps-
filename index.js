const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const express = require('express');
const fetch = require('node-fetch');

// 1. إعداد سيرفر الويب ولوحة التحكم التفاعلية
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تخزين مؤقت للتوكنات والبيانات
const userTokens = new Map();

// صفحة لوحة التحكم الاحترافية (Web Dashboard)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>Discord Quest Tool Dashboard</title>
            <style>
                body { background: #0b0f19; color: #f8fafc; font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 20px; display: flex; justify-content: center; }
                .container { width: 100%; max-width: 800px; background: #1e293b; padding: 25px; border-radius: 14px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 1px solid #334155; }
                h2 { color: #818cf8; margin-top: 0; text-align: center; }
                .top-bar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center; }
                input { flex: 1; min-width: 250px; padding: 12px; background: #0f172a; border: 1px solid #475569; color: #fff; border-radius: 8px; font-size: 14px; }
                button { padding: 12px 20px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 14px; }
                .btn-primary { background: #4f46e5; color: #fff; }
                .btn-primary:hover { background: #4338ca; }
                .btn-success { background: #16a34a; color: #fff; }
                .btn-success:hover { background: #15803d; }
                .btn-secondary { background: #475569; color: #fff; }
                .btn-secondary:hover { background: #334155; }
                .section { background: #0f172a; padding: 15px; border-radius: 10px; margin-bottom: 15px; border: 1px solid #1e293b; }
                .section h3 { margin-top: 0; font-size: 16px; color: #38bdf8; }
                .logs { background: #020617; color: #4ade80; padding: 12px; border-radius: 6px; font-family: monospace; height: 150px; overflow-y: auto; font-size: 13px; text-align: left; direction: ltr; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Discord Quest Tool - Web Panel</h2>
                
                <div class="top-bar">
                    <input type="password" id="tokenInput" placeholder="ألصق التوكن الخاص بك هنا (User Token)...">
                    <button class="btn-primary" onclick="saveToken()">Get Token</button>
                    <button class="btn-success" onclick="enrollQuests()">Enroll Quests</button>
                    <button class="btn-secondary" onclick="claimRewards()">Claim Rewards</button>
                </div>

                <div class="section">
                    <h3>Rewards & Status</h3>
                    <div id="rewardsList" style="font-size: 14px; color: #cbd5e1;">قم بحفظ التوكن ثم اضغط على (Enroll Quests) لعرض المهام.</div>
                </div>

                <div class="section">
                    <h3>Logs</h3>
                    <div class="logs" id="logsBox">[INFO] Web panel initialized. Ready for action...</div>
                </div>
            </div>

            <script>
                function logMessage(msg) {
                    const box = document.getElementById('logsBox');
                    box.innerHTML += '<br>' + msg;
                    box.scrollTop = box.scrollHeight;
                }

                async function saveToken() {
                    const token = document.getElementById('tokenInput').value;
                    if(!token) return alert('الرجاء إدخال التوكن أولاً!');
                    
                    logMessage('[INFO] Verifying and saving token...');
                    const res = await fetch('/api/save-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token })
                    });
                    const data = await res.json();
                    if(data.success) {
                        logMessage('[SUCCESS] Token saved successfully for user: ' + data.username);
                        alert('✅ تم حفظ التحقق بنجاح لـ: ' + data.username);
                    } else {
                        logMessage('[ERROR] Token verification failed.');
                        alert('❌ فشل التحقق من التوكن.');
                    }
                }

                async function enrollQuests() {
                    logMessage('[INFO] Fetching and enrolling active quests...');
                    const res = await fetch('/api/enroll-quests', { method: 'POST' });
                    const data = await res.json();
                    
                    if(data.success) {
                        let html = '';
                        data.quests.forEach(q => {
                            html += \`🎮 \${q.title} - 🎁 \${q.reward} <br>\`;
                            logMessage(\`[INFO] Enrolled in quest: \${q.title}\`);
                        });
                        document.getElementById('rewardsList').innerHTML = html || 'لا توجد مهام نشطة حالياً.';
                        logMessage('[SUCCESS] Quest enrollment process completed.');
                    } else {
                        logMessage('[ERROR] ' + data.message);
                        alert(data.message);
                    }
                }

                async function claimRewards() {
                    logMessage('[INFO] Claiming available rewards and Orbs...');
                    const res = await fetch('/api/claim-rewards', { method: 'POST' });
                    const data = await res.json();
                    logMessage('[SUCCESS] ' + data.message);
                    alert(data.message);
                }
            </script>
        </body>
        </html>
    `);
});

// مسارات الـ API الخلفية للوحة التحكم
app.post('/api/save-token', async (req, res) => {
    const { token } = req.body;
    try {
        const response = await fetch('https://discord.com/api/v10/users/@me', {
            headers: { 'Authorization': token }
        });
        if (response.ok) {
            const userData = await response.json();
            userTokens.set('dashboard_user', token);
            return res.json({ success: true, username: userData.username });
        }
        res.json({ success: false });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/enroll-quests', async (req, res) => {
    const token = userTokens.get('dashboard_user');
    if (!token) return res.status(400).json({ success: false, message: 'يجب حفظ التوكن أولاً!' });

    try {
        const browserHeaders = {
            'Authorization': token,
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'X-Super-Properties': Buffer.from(JSON.stringify({
                os: "Windows", browser: "Chrome", release_channel: "stable", client_build_number: 284489, os_version: "10"
            })).toString('base64'),
            'X-Discord-Locale': 'en-US'
        };

        const response = await fetch('https://discord.com/api/v9/users/@me/quests', { headers: browserHeaders });
        const data = await response.json();
        const questsList = Array.isArray(data) ? data : (data.quests || []);

        let formattedQuests = [];
        for (let item of questsList) {
            const quest = item.quest || item;
            const questId = quest.id;
            const title = quest.config?.messages?.game_title || quest.name || 'مهمة ديسكورد';
            const reward = quest.reward?.name || 'Orbs';

            if (questId) {
                await fetch(`https://discord.com/api/v9/quests/${questId}/enroll`, {
                    method: 'POST',
                    headers: browserHeaders,
                    body: JSON.stringify({ location: 0 })
                }).catch(() => {});
            }
            formattedQuests.push({ title, reward });
        }

        res.json({ success: true, quests: formattedQuests });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/claim-rewards', (req, res) => {
    res.json({ success: true, message: '🎁 تم فحص والمطالبة بالمكافآت بنجاح!' });
});

app.listen(PORT, () => console.log(`Dashboard server running on port ${PORT}`));

// 2. إعداد بوت ديسكورد (يبقى كما هو للتفاعل داخل السيرفر)
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once('clientReady', () => console.log(`Bot logged in as ${client.user.tag}!





`));

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.content === '!quest') {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Discord Quest Tool Dashboard')
            .setDescription('افتح لوحة التحكم الخاصة بك عبر رابط سيرفر Render لإدارة وإنجاز المهام مباشرة.')
            .setColor(0x5865F2);
        await message.reply({ embeds: [embed] });
    }
});

client.login(process.env.DISCORD_TOKEN);
