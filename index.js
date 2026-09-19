const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const express = require('express');
const fetch = require('node-fetch');

// 1. تشغيل سيرفر ويب خفيف لإرضاء منصة Render
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Discord Quest Bot is online!'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// تخزين التوكنات للمستخدمين مؤقتاً
const userTokens = new Map();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// أمر إرسال واجهة البوت الرئيسية
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!quest') {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Discord Quest Tool')
            .setDescription('أهلاً بك! استخدم الأزرار بالأسفل لإدخال توكن حسابك أو جلب وعرض مهام ديسكورد الحقيقية.')
            .setColor(0x5865F2);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('open_token_modal')
                    .setLabel('Get & Save Token')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('fetch_and_show_quests')
                    .setLabel('Enroll & Show Quests')
                    .setStyle(ButtonStyle.Success)
            );

        await message.reply({ embeds: [embed], components: [row] });
    }
});

client.on('interactionCreate', async interaction => {
    
    // 1. فتح نافذة إدخال التوكن
    if (interaction.isButton() && interaction.customId === 'open_token_modal') {
        const modal = new ModalBuilder()
            .setCustomId('token_modal')
            .setTitle('إدخال توكن الحساب الشخصي');

        const tokenInput = new TextInputBuilder()
            .setCustomId('user_token_input')
            .setLabel('ألصق التوكن (User Token) الخاص بك هنا:')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('MTI3...')
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(tokenInput));
        await interaction.showModal(modal);
        return;
    }

    // 2. حفظ التوكن
    if (interaction.isModalSubmit() && interaction.customId === 'token_modal') {
        const userToken = interaction.fields.getTextInputValue('user_token_input');
        const userId = interaction.user.id;

        await interaction.reply({ content: '⏳ جاري التحقق من التوكن...', flags: [MessageFlags.Ephemeral] });

        try {
            const response = await fetch('https://discord.com/api/v10/users/@me', {
                headers: { 'Authorization': userToken }
            });

            if (response.ok) {
                const userData = await response.json();
                userTokens.set(userId, userToken);
                await interaction.editReply({ 
                    content: `✅ **تم التحقق وحفظ التوكن بنجاح!**\nمرحباً بك يا **${userData.username}**. يمكنك الآن الضغط على زر **Enroll & Show Quests** لعرض مهامك الحقيقية.`
                });
            } else {
                await interaction.editReply({ content: '❌ **فشل التحقق:** التوكن غير صحيح أو منتهي الصلاحية.' });
            }
        } catch (error) {
            await interaction.editReply({ content: '⚠️ حدث خطأ تقني أثناء الاتصال.' });
        }
        return;
    }

    // 3. جلب المهام الحقيقية وعرضها في المحادثة
    if (interaction.isButton() && interaction.customId === 'fetch_and_show_quests') {
        const userId = interaction.user.id;
        const token = userTokens.get(userId);

        if (!token) {
            await interaction.reply({ content: '⚠️ يجب عليك حفظ التوكن أولاً عن طريق الضغط على زر **Get & Save Token**!', flags: [MessageFlags.Ephemeral] });
            return;
        }

        await interaction.reply({ content: '⚡ جاري الاتصال بحسابك وجلب المهام الحقيقية المتاحة...', flags: [MessageFlags.Ephemeral] });

        try {
            // جلب المهام الحقيقية من API ديسكورد
            const questsRes = await fetch('https://discord.com/api/v9/users/@me/quests', {
                headers: { 'Authorization': token }
            });
            const questsData = await questsRes.json();

            // التحقق مما إذا كان هناك مهام أم لا
            const questsList = questsData.quests || questsData; // بحسب هيكل استجابة ديسكورد
            
            if (!Array.isArray(questsList) || questsList.length === 0) {
                await interaction.editReply({ content: 'ℹ️ لا توجد أي مهام (Quests) متاحة حالياً على حسابك.' });
                return;
            }

            // بناء رسالة Embed تعرض المهام الحقيقية بالتفصيل
            let descriptionText = '';
            let enrolledCount = 0;

            for (let quest of questsList) {
                const gameTitle = quest.config?.messages?.game_title || quest.name || 'لعبة غير معروفة';
                const rewardName = quest.reward?.name || 'مكافأة ديسكورد';
                const questId = quest.id;

                // محاولة التسجيل التلقائي في المهمة أثناء الجلب
                try {
                    const enrollRes = await fetch(`https://discord.com/api/v9/quests/${questId}/enroll`, {
                        method: 'POST',
                        headers: { 'Authorization': token, 'Content-Type': 'application/json' }
                    });
                    if (enrollRes.ok) enrolledCount++;
                } catch (e) {
                    // تجاهل الخطأ الفردي للمهمة إن وجدت
                }

                descriptionText += `🎮 **اللعبة:** ${gameTitle}\n🎁 **المكافأة:** ${rewardName}\n🆔 **ID:** \`${questId}\`\n----------------------------------\n`;
            }

            const resultEmbed = new EmbedBuilder()
                .setTitle('📋 قائمة مهام حسابك الحقيقية')
                .setDescription(descriptionText.substring(0, 4000)) // لضمان عدم تجاوز الحد الأقصى لحجم الرسالة
                .setColor(0x00FF00)
                .setFooter({ text: `تم الاشتراك بنجاح في (${enrolledCount}) من أصل (${questsList.length}) مهمة.` });

            await interaction.followUp({ embeds: [resultEmbed], flags: [MessageFlags.Ephemeral] });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '⚠️ حدث خطأ أثناء جلب المهام من خوادم ديسكورد.' });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
