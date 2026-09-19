const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// استقبال الأوامر العادية أو التفاعلية
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

// التعامل مع ضغط الأزرار من المستخدمين
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'get_token_info') {
        await interaction.reply({ content: 'لربط حسابك والحصول على التوكن، يرجى اتباع التعليمات الخاصة بالأداة الآمنة.', ephemeral: true });
    } else if (interaction.customId === 'enroll_quests') {
        await interaction.reply({ content: '⚡ جاري فحص والاشتراك في جميع المهام المتاحة لحسابك...', ephemeral: true });
    } else if (interaction.customId === 'claim_rewards') {
        await interaction.reply({ content: '🎁 جاري إرسال طلبات استلام المكافآت والأوربس...', ephemeral: true });
    }
});

// ضع هنا توكن بوت ديسكورد الخاص بك (الذي تستخرجه من Discord Developer Portal)
client.login(process.env.DISCORD_TOKEN);
