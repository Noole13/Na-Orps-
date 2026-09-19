const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } = require('discord.js');
const express = require('express');
const fetch = require('node-fetch');

// 1. إنشاء سيرفر ويب بسيط لإرضاء منصة Render ومنع خطأ Ports
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Discord Quest Bot is online!'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// 2. إعدادات بوت ديسكورد
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// استخدام clientReady لتجنب تحذير الإصدارات الحديثة
client.once('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!quest') {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Discord Quest Tool')
            .setDescription('أهلاً بك! استخدم الأزرار بالأسفل لإدارة مهام ديسكورد، التسجيل فيها، أو استلام المكافآت والأوربس.')
            .setColor(0x5865F2)
            .addFields(
                { name: 'Tasks Available', value: '• World of Warcraft: Midnight\n• One Piece Season 2\n• Apex Legends & More...', inline: false }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('get_token_info')
                    .setLabel('Get Token')
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

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    try {
        // الرد الفوري باستخدام deferUpdate أو deferReply لمنع خطأ 10062
        if (interaction.customId === 'get_token_info') {
            await interaction.reply({ 
                content: 'لربط حسابك والحصول على التوكن، يرجى اتباع التعليمات الخاصة بالأداة الآمنة.', 
                flags: [MessageFlags.Ephemeral] 
            });
        } else if (interaction.customId === 'enroll_quests') {
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
    } catch (error) {
        console.error("خطأ أثناء الاستجابة للزر:", error);
    }
});

// تسجيل الدخول بتوكن البوت
client.login(process.env.DISCORD_TOKEN);
