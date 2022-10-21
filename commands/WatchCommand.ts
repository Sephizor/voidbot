import {
  CommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
  SlashCommandChannelOption,
  SlashCommandIntegerOption,
} from "discord.js";
import { WatchedChannel } from "../models/WatchedChannel";

const WatchCommand = {
  data: new SlashCommandBuilder()
    .setName("watch")
    .setDescription("Adds a channel to the watch list")
    .addChannelOption((option: SlashCommandChannelOption) =>
      option
        .setName("channel")
        .setDescription("The channel to watch")
        .setRequired(true)
    )
    .addIntegerOption((option: SlashCommandIntegerOption) =>
      option
        .setName("hours")
        .setDescription("The number of hours to wait until deleting a message")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute: async (interaction: CommandInteraction) => {
    const channelId = interaction.options.get("channel")?.value as string;
    const hours = interaction.options.get("hours")?.value;
    await WatchedChannel.sync();
    const channel = await WatchedChannel.findOne({
      where: { channelId },
    });
    const discordChannel = await interaction.client.channels.fetch(channelId);
    if (!discordChannel?.isTextBased()) {
      await interaction.reply({
        content: "Invalid channel specified. Must be text-based.",
        ephemeral: true,
      });
      return;
    }
    if (!hours || hours <= 0) {
      await interaction.reply({
        content: "Invalid value for `hours`. Must be a positive integer.",
        ephemeral: true,
      });
      return;
    }
    if (channel) {
      channel.update({ hours });
      channel.save({ fields: ["hours"] });
      await interaction.reply({
        content: `Updated ${
          interaction.options.get("channel")?.channel
        } to delete messages after ${hours} hours`,
        ephemeral: true,
      });
      return;
    }
    WatchedChannel.create({ channelId, hours });
    await interaction.reply({
      content: `Watching ${
        interaction.options.get("channel")?.channel
      } for messages more than ${hours} hours old`,
      ephemeral: true,
    });
  },
};

export default WatchCommand;
