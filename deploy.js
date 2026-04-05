const { REST, Routes, SlashCommandBuilder } = require("discord.js");
require("dotenv").config();

const commands = [
  new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Buy game account")
    .addStringOption(opt =>
      opt.setName("game").setDescription("Steam App ID").setRequired(true))
    .addStringOption(opt =>
      opt.setName("type")
        .addChoices(
          { name: "Shared", value: "shared" },
          { name: "Own", value: "own" }
        ).setRequired(true))
    .addStringOption(opt =>
      opt.setName("payment")
        .addChoices(
          { name: "Crypto", value: "crypto" },
          { name: "Amazon", value: "amazon" },
          { name: "Steam Gift", value: "steamgift" }
        ).setRequired(true))
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

rest.put(
  Routes.applicationCommands(process.env.CLIENT_ID),
  { body: commands }
);
