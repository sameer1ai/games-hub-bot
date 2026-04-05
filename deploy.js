import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy a game')
    .addStringOption(opt =>
      opt.setName('gameid').setDescription('Steam Game ID').setRequired(true))
    .addStringOption(opt =>
      opt.setName('platform')
        .setDescription('Choose platform')
        .setRequired(true)
        .addChoices(
          { name: 'Steam', value: 'steam' },
          { name: 'Epic', value: 'epic' }
        ))
    .addStringOption(opt =>
      opt.setName('payment')
        .setDescription('Payment method')
        .setRequired(true)
        .addChoices(
          { name: 'Crypto', value: 'crypto' },
          { name: 'Giftcard', value: 'giftcard' }
        ))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

await rest.put(
  Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
  { body: commands }
);

console.log('✅ Commands deployed');
