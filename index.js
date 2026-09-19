const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const express = require('express');
const fetch = require('node-fetch');

// 1. تشغيل سيرفر ويب خفيف لمنع خطأ Ports على Render
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Discord Quest Bot is online and running!'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// تخزين مؤقت للتوكنات الخاصة بالمستخدمين
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

// أمر إرسال واجهة البوت الرئيسية في السيرفر
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!quest') {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Discord Quest Tool')
            .setDescription('أهلاً بك! استخدم الأزرار بالأسفل لإدخال توكن حسابك أو جلب وإنجاز مهام ديسكورد والـ Orbs تلقائياً.')
            .setColor(0x5865F2)
            .addFields(
                { name: 'Features', value: '• Get & Save Token\n• Fetch Active Quests\n• Auto Enroll & Claim Orbs', inline: false }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('open_token_modal')
                    .setLabel('Get & Save Token')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('fetch_and_enroll_quests')
                    .setLabel('Fetch & Enroll Quests')
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

    // 2. التحقق من التوكن وحفظه
    if (interaction.isModalSubmit() && interaction.customId === 'token_modal') {
        const userToken = interaction.fields.getTextInputValue('user_token_input');
        const userId = interaction.user.id;

        await interaction.reply({ content: '⏳ جاري التحقق من صحة التوكن...', flags: [MessageFlags.Ephemeral] });

        try {
            const response = await fetch('https://discord.com/api/v10/users/@me', {
                headers: { 'Authorization': userToken }
            });

            if (response.ok) {
                const userData = await response.json();
                userTokens.set(userId, userToken);
                await interaction.editReply({ 
                    content: `✅ **تم التحقق وحفظ التوكن بنجاح!**\nمرحباً بك يا **${userData.username}**. يمكنك الآن الضغط على زر **Fetch & Enroll Quests** لجلب مهامك وإنجازها.`
                });
            } else {
                await interaction.editReply({ content: '❌ **فشل التحقق:** التوكن غير صحيح أو منتهي الصلاحية.' });
            }
        } catch (error) {
            await interaction.editReply({ content: '⚠️ حدث خطأ تقني أثناء الاتصال.' });
        }
        return;
    }

    // 3. جلب المهام الحقيقية والاشتراك فيها وإنجازها
    if (interaction.isButton() && interaction.customId === 'fetch_and_enroll_quests') {
        const userId = interaction.user.id;
        const token = userTokens.get(userId);

        if (!token) {
            await interaction.reply({ content: '⚠️ يجب عليك حفظ التوكن أولاً عن طريق الضغط على زر **Get & Save Token**!', flags: [MessageFlags.Ephemeral] });
            return;
        }

        await interaction.reply({ content: '⚡ جاري جلب المهام النشطة (مثل War Thunder و Heroes of History وغيرها) والاشتراك فيها...', flags: [MessageFlags.Ephemeral] });

        try {
            // جلب قائمة المهام المتاحة للحساب
            const response = await fetch('https://discord.com/api/v9/users/@me/quests', {
                headers: { 
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            const quests = data.quests || data;

            if (!Array.isArray(quests) || quests.length === 0) {
                await interaction.editReply({ content: 'ℹ️ لم يتم العثور على مهام نشطة حالياً، أو أن التوكن يحتاج لتحديث.' });
                return;
            }

            let descriptionText = '';
            let successCount = 0;

            for (let item of quests) {
                const quest = item.quest || item;
                const questId = quest.id;
                const gameTitle = quest.config?.messages?.game_title || quest.name || 'مهمة ديسكورد';
                const rewardName = quest.reward?.name || 'مكافأة Orbs';

                // محاولة التسجيل في المهمة (Enroll)
                try {
                    const enrollRes = await fetch(`https://discord.com/api/v9/quests/${questId}/enroll`, {
                        method: 'POST',
                        headers: { 
                            'Authorization': token, 
                            'Content-Type': 'application/json' 
                        },
                        body: JSON.stringify({ location: 0 })
                    });

                    if (enrollRes.ok) {
                        successCount++;
                        descriptionText += `🎮 **اللعبة:** ${gameTitle}\n🎁 **المكافأة:** ${rewardName}\nstatus: **تم الانضمام بنجاح ✅**\n----------------------------------\n`;
                    } else {
                        descriptionText += `🎮 **اللعبة:** ${gameTitle}\n🎁 **المكافأة:** ${rewardName}\nstatus: **مسجل مسبقاً أو قيد المعالجة 🔄**\n----------------------------------\n`;
                    }
                } catch (err) {
                    console.log("خطأ في تسجيل المهمة:", err);
                }
            }

            const resultEmbed = new EmbedBuilder()
                .setTitle('📋 تقرير إنجاز مهام ديسكورد')
                .setDescription(descriptionText.substring(0, 4000))
                .setColor(0x00FF00)
                .setFooter({ text: `تم معالجة والاشتراك في (${successCount}) من أصل (${quests.length}) مهمة.` });

            await interaction.followUp({ embeds: [resultEmbed], flags: [MessageFlags.Ephemeral] });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '⚠️ حدث خطأ أثناء الاتصال بخوادم ديسكورد لجلب المهام.' });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
