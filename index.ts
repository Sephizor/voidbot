import fs from "fs";
import path from "path";

import {
  Client,
  Collection,
  CommandInteraction,
  Events,
  GatewayIntentBits,
  Message,
  TextChannel,
} from "discord.js";
import * as cron from "node-cron";

import { token } from "./config.json";
import { sequelize } from "./db";
import { WatchedChannel } from "./models/WatchedChannel";

(async () => {
  await sequelize.authenticate();
})();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});
const commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

type BotCommand = {
  data: {
    name: string;
    description: string;
  };
  execute: (interaction: CommandInteraction) => Promise<void>;
};

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath).default; // eslint-disable-line
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ("data" in command && "execute" in command) {
    commands.set(command.data.name, command);
  } else {
    console.warn(
      `The command at ${filePath} is missing a required "data" or "execute" property.`
    );
  }
}

client.once(Events.ClientReady, () => {
  if (client && client.user) console.log(`Logged in as ${client.user.tag}`);
  else {
    console.error("Failed to log in");
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName) as BotCommand;
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (e) {
    console.error(e);
    await interaction.reply({
      content: "An error occurred while running this command",
      ephemeral: true,
    });
  }
});

client.login(token);

cron.schedule("*/1 * * * *", async () => {
  const watchedChannels: { channelId: string; hours: number }[] =
    (await WatchedChannel.findAll()) as any;
  for (const watchedChannel of watchedChannels) {
    console.log(`Processing channel ${watchedChannel.channelId}`);
    const discordChannel = (await client.channels.fetch(
      watchedChannel.channelId
    )) as TextChannel;

    if (!discordChannel || !discordChannel.messages) {
      console.warn(
        `Skipping channel ${watchedChannel.channelId} as it could not be accessed`
      );
    }

    const time = new Date();
    time.setHours(time.getHours() - watchedChannel.hours);
    const messages: Message[] = Array.from(
      (await discordChannel.messages.fetch()).values() as Iterable<Message>
    );

    if (messages.length === 0) {
      console.info("No messages to process");
    }

    for (const message of messages) {
      if (message.createdAt <= time) {
        console.log(`Deleting message ${message.id}`);

        if (message.deletable) {
          message.delete();
        } else {
          console.error(`Cannot delete message ${message.id}`);
        }
      }
    }
  }
});
