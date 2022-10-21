import {
  CommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  SlashCommandChannelOption,
} from "discord.js";
import { WatchedChannel } from "../models/WatchedChannel";

const StopWatchingCommand = {
  data: new SlashCommandBuilder()
    .setName("stopwatching")
    .setDescription("Stop watching a channel")
    .addChannelOption((option: SlashCommandChannelOption) =>
      option
        .setName("channel")
        .setDescription("The channel to stop watching")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute: async (interaction: CommandInteraction) => {
    const channelId = interaction.options.get("channel")?.value;
    await WatchedChannel.sync();
    const channel = await WatchedChannel.findOne({ where: { channelId } });
    if (channel !== null) {
      await channel.destroy();
      await interaction.reply({
        content: `Removed ${
          interaction.options.get("channel")?.channel
        } from the watch list`,
        ephemeral: true,
      });
    }
  },
};

export default StopWatchingCommand;
