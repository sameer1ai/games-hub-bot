import {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import axios from 'axios';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

const STAFF_ROLE = "1490274522849480734";
const STAFF_CHANNEL = "1490275887227080855";
const TICKET_CATEGORY = "1490265323860000821";

const userTickets = new Map();

async function getSteamPrice(appid) {
  try {
    const res = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${appid}`);
    const data = res.data[appid];

    if (!data.success) return null;

    const price = data.data.price_overview;
    if (!price) return 0;

    return price.final / 100;
  } catch {
    return null;
  }
}

client.on('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'buy') {
    const userId = interaction.user.id;

    // ❌ One ticket per user
    if (userTickets.has(userId)) {
      return interaction.reply({ content: "❌ You already have an active ticket!", ephemeral: true });
    }

    const gameId = interaction.options.getString('gameid');
    const platform = interaction.options.getString('platform');
    const payment = interaction.options.getString('payment');

    await interaction.deferReply({ ephemeral: true });

    let price = null;

    if (platform === 'steam') {
      price = await getSteamPrice(gameId);
      if (price === null) {
        return interaction.editReply("❌ Invalid Steam Game ID");
      }
    }

    if (platform === 'epic') {
      price = "Manual";
    }

    // 🎫 Create ticket
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: userId,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        },
        {
          id: STAFF_ROLE,
          allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
        }
      ]
    });

    userTickets.set(userId, channel.id);

    const embed = new EmbedBuilder()
      .setTitle("🧾 Order Details")
      .addFields(
        { name: "User", value: `<@${userId}>` },
        { name: "Game ID", value: gameId },
        { name: "Platform", value: platform },
        { name: "Payment", value: payment },
        { name: "Original Price", value: `$${price}` },
        { name: "Status", value: "🟡 Pending" }
      )
      .setColor("Yellow");

    const closeBtn = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('close')
        .setLabel('Close Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `<@${userId}> <@&${STAFF_ROLE}>`,
      embeds: [embed],
      components: [closeBtn]
    });

    // 📩 Staff channel message
    const staffEmbed = new EmbedBuilder()
      .setTitle("📥 New Order")
      .addFields(
        { name: "User", value: `<@${userId}>` },
        { name: "Game ID", value: gameId },
        { name: "Platform", value: platform },
        { name: "Payment", value: payment },
        { name: "Price", value: `$${price}` }
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`accept_${channel.id}_${userId}`).setLabel("Accept").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`reject_${channel.id}_${userId}`).setLabel("Reject").setStyle(ButtonStyle.Danger)
    );

    const staffChannel = await client.channels.fetch(STAFF_CHANNEL);
    await staffChannel.send({ embeds: [staffEmbed], components: [row] });

    await interaction.editReply(`✅ Ticket created: ${channel}`);
  }
});

// 🔘 Buttons
client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  const [action, channelId, userId] = interaction.customId.split("_");

  const channel = await client.channels.fetch(channelId);
  const user = await client.users.fetch(userId);

  if (action === "accept") {
    await channel.send("🟢 Order is now **Processing**");
    await interaction.reply({ content: "✅ Accepted", ephemeral: true });
  }

  if (action === "reject") {
    await user.send("❌ Your order has been rejected.");
    await channel.send("❌ Order rejected");
    userTickets.delete(userId);
    await interaction.reply({ content: "❌ Rejected", ephemeral: true });
  }

  if (interaction.customId === "close") {
    userTickets.delete(interaction.user.id);
    await interaction.channel.delete();
  }
});

client.login(process.env.TOKEN);
