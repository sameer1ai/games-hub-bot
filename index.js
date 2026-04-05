require("dotenv").config();
const axios = require("axios");

const {
  Client,
  GatewayIntentBits,
  ChannelType,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== IDs =====
const STAFF_CHANNEL = "1490275887227080855";
const STAFF_ROLE = "1490274522849480734";
const TICKET_CATEGORY = "1490279468407980073";

// ===== VALIDATE GAME =====
async function validateGame(appid) {
  try {
    const res = await axios.get(
      `https://store.steampowered.com/api/appdetails?appids=${appid}`
    );

    const data = res.data[appid];

    if (!data.success) return null;

    return data.data.name;

  } catch {
    return null;
  }
}

// ===== GET PRICE =====
async function getSteamPrice(appid) {
  try {
    const res = await axios.get(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&filters=price_overview`
    );

    const data = res.data[appid];

    if (!data.success || !data.data.price_overview) return null;

    return {
      final: data.data.price_overview.final / 100,
      initial: data.data.price_overview.initial / 100,
      discount: data.data.price_overview.discount_percent
    };

  } catch {
    return null;
  }
}

// ===== READY =====
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ===== INTERACTION =====
client.on("interactionCreate", async (interaction) => {

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === "buy") {

      const gameId = interaction.options.getString("game");
      const type = interaction.options.getString("type");
      const payment = interaction.options.getString("payment");

      const gameName = await validateGame(gameId);

      if (!gameName) {
        return interaction.reply({
          content: "❌ Invalid Steam Game ID",
          ephemeral: true
        });
      }

      const priceData = await getSteamPrice(gameId);

      if (!priceData) {
        return interaction.reply({
          content: "❌ Price not available",
          ephemeral: true
        });
      }

      // 🎫 Create Ticket
      const ticket = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: TICKET_CATEGORY,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: STAFF_ROLE,
            allow: [PermissionsBitField.Flags.ViewChannel],
          }
        ]
      });

      const embed = new EmbedBuilder()
        .setTitle("🛒 Order Details")
        .setDescription(`
👤 User: ${interaction.user}
🎮 Game: ${gameName}
💼 Type: ${type}
💳 Payment: ${payment}

💸 Price: $${priceData.final}
🏷 Original: $${priceData.initial}
🔥 Discount: ${priceData.discount}%

📌 Status: Pending
        `)
        .setColor("#5865F2");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("accept").setLabel("Accept").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("reject").setLabel("Reject").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("wait").setLabel("Wait").setStyle(ButtonStyle.Secondary)
      );

      await ticket.send({
        content: `<@${interaction.user.id}> <@&${STAFF_ROLE}>`,
        embeds: [embed],
        components: [row]
      });

      const staffCh = interaction.guild.channels.cache.get(STAFF_CHANNEL);
      await staffCh.send({ embeds: [embed], components: [row] });

      await interaction.reply({
        content: `✅ Order created: ${ticket}`,
        ephemeral: true
      });
    }
  }

  // ===== BUTTONS =====
  if (interaction.isButton()) {

    if (!interaction.member.roles.cache.has(STAFF_ROLE)) {
      return interaction.reply({
        content: "❌ Only staff can use this",
        ephemeral: true
      });
    }

    if (interaction.customId === "accept") {
      await interaction.reply("✅ Order Accepted");
    }

    if (interaction.customId === "reject") {
      await interaction.reply("❌ Order Rejected");
    }

    if (interaction.customId === "wait") {
      await interaction.reply("⏳ Please wait");
    }
  }
});

client.login(process.env.TOKEN);
