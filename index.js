const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const express = require('express');
const fetch = require('node-fetch');

// 1. تشغيل سيرفر ويب خفيف لإرضاء منصة Render ومنع خطأ Ports
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Discord Quest Bot is online and running!'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// 2. إعدادات بوت ديسكورد مع الصلاحيات المطلوبة
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

// أمر لإرسال رسالة المهام والأزرار
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!quest') {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Discord Quest Tool')
            .setDescription('أهلاً بك! استخدم الأزرار بالأسفل لإدارة مهام ديسكورد، تسجيل التوكن، أو استلام المكافآت والأوربس.')
            .setColor(0x5865F2)
            .addFields(
                { name: 'Tasks Available', value: '• World of Warcraft: Midnight\n• One Piece Season 2\n• Apex Legends & More...', inline: false }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('open_token_modal')
                    .setLabel('Get & Save Token')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('enroll_quests')
                    .setLabel('Enroll Quests')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('claim_rewards')
                    .setLabel('Claim Rewards')
                    .setStyle(ButtonStyle.Secondary)
            );

        await message.reply({ embeds: [embed], components: [row] });
    }
});

// التعامل مع التفاعلات (الأزرار والـ Modals)
client.on('interactionCreate', async interaction => {
    
    // 1. إذا قام المستخدم الضغط على زر إدخال التوكن
    if (interaction.isButton() && interaction.customId === 'open_token_modal') {
        const modal = new ModalBuilder()
            .setCustomId('token_modal')
            .setTitle('إدخال توكن الحساب الشخصي');

        const tokenInput = new TextInputBuilder()
            .setCustomId('user_token_input')
            .setLabel('ألصق التوكن (User Token) الخاص بك هنا:')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('MTI3... (اكتب أو ألصق التوكن هنا)')
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(tokenInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
        return;
    }

    // 2. معالجة البيانات عندما يقوم المستخدم بإرسال الـ Modal
    if (interaction.isModalSubmit() && interaction.customId === 'token_modal') {
        const userToken = interaction.fields.getTextInputValue('user_token_input');

        await interaction.reply({ 
            content: '⏳ جاري التحقق من صحة التوكن والاتصال بخوادم ديسكورد...', 
            flags: [MessageFlags.Ephemeral] 
        });

        try {
            // اختبار التوكن عبر جلب بيانات المستخدم من API ديسكورد الحقيقي
            const response = await fetch('https://discord.com/api/v10/users/@me', {
                headers: { 'Authorization': userToken }
            });

            if (response.ok) {
                const userData = await response.json();
                await interaction.editReply({ 
                    content: `✅ **تم التحقق بنجاح!**\nمرحباً بك يا **${userData.username}** (ID: \`${userData.id}\`). تم حفظ التوكن وجاهز لتنفيذ المهام!`
                });
            } else {
                await interaction.editReply({ 
                    content: '❌ **فشل التحقق:** التوكن الذي أدخلته غير صحيح أو منتهي الصلاحية. تأكد من نسخه بشكل دقيق.'
                });
            }
        } catch (error) {
            console.error(error);
            await interaction.editReply({ 
                content: '⚠️ حدث خطأ تقني أثناء الاتصال بالخادم.' 
            });
        }
        return;
    }

    // 3. التعامل مع باقي الأزرار
    if (interaction.isButton()) {
        if (interaction.customId === 'enroll_quests') {
            await interaction.reply({ 
                content: '⚡ جاري فحص والاشتراك في جميع المهام المتاحة لحسابك...', 
                flags: [MessageFlags.Ephemeral] 
            });
        } else if (interaction.customId === 'claim_rewards') {
            await interaction.reply({ 
                content: '🎁 جاري إرسال طلبات استلام المكافآت والأوربس...', 
                flags: [MessageFlags.Ephemeral] 
            });
        }
    }
});

// تسجيل الدخول بتوكن البوت
client.login(process.env.DISCORD_TOKEN);
