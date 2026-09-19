const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// صفحة ترحيبية للتأكد من أن السيرفر يعمل
app.get('/', (req, res) => {
    sendResponse = { status: "Online", message: "Discord Quest Bot is running successfully!" };
    res.json(sendResponse);
});

// مسار لتنفيذ عملية جلب وتسجيل المهام باستخدام التوكن المرسل
app.post('/api/run-quests', async (req, res) => {
    const { token } = req.body;
    
    if (!token) {
        return res.status(400).json({ error: "Token is required!" });
    }

    try {
        // 1. جلب المهام المتاحة
        const response = await fetch('https://discord.com/api/v9/users/@me/quests', {
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (!data.quests) {
            return res.json({ success: false, message: "No quests found or invalid token.", data });
        }

        let logs = [];

        // 2. التسجيل في كل متاح من المهام
        for (let quest of data.quests) {
            let questId = quest.id;
            let enrollRes = await fetch(`https://discord.com/api/v9/quests/${questId}/enroll`, {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });
            
            if (enrollRes.ok) {
                logs.push(`Enrolled successfully in quest: ${quest.config?.messages?.game_title || questId}`);
            } else {
                logs.push(`Failed or already enrolled in quest: ${questId}`);
            }
        }

        res.json({ success: true, logs });

    } المستحب (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
