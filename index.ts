import fs from "fs";
import path from "path";

import {
  Client,
  Collection,
  CommandInteraction,
  DiscordAPIError,
  Events,
  GatewayIntentBits,
  Message,
  Snowflake,
  TextChannel,
} from "discord.js";
import * as cron from "node-cron";

import { token } from "./config.json";
import { sequelize } from "./db";
import { WatchedChannel } from "./models/WatchedChannel";

const DISCORD_FETCH_LIMIT = 100;

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

async function fetchAllMessages(
  discordChannel: TextChannel,
  lastId?: Snowflake
): Promise<Message[]> {
  const messages: Message[] = Array.from(
    (
      await discordChannel.messages.fetch({
        limit: DISCORD_FETCH_LIMIT,
        before: lastId,
      })
    ).values() as Iterable<Message>
  );

  if (messages.length === DISCORD_FETCH_LIMIT) {
    messages.push(
      ...(await fetchAllMessages(
        discordChannel,
        messages[messages.length - 1].id
      ))
    );
  }

  return messages;
}

cron.schedule("*/1 * * * *", async () => {
  const watchedChannels = (await WatchedChannel.findAll()) as any;
  for (const watchedChannel of watchedChannels) {
    console.log(`Processing channel ${watchedChannel.channelId}`);
    let discordChannel;
    try {
      discordChannel = (await client.channels.fetch(
        watchedChannel.channelId
      )) as TextChannel;
    } catch (e) {
      if ((e as DiscordAPIError).message === "Unknown Channel") {
        await watchedChannel.destroy();
        console.warn(
          `Deleted channel ${watchedChannel.channelId} from database`
        );
      }
      return;
    }

    if (!discordChannel || !discordChannel.messages) {
      console.warn(
        `Skipping channel ${watchedChannel.channelId} as it could not be accessed`
      );
    }

    const time = new Date();
    time.setHours(time.getHours() - watchedChannel.hours);
    const lastMessageId = discordChannel.lastMessageId;

    if (lastMessageId) {
      const messages = await (
        await fetchAllMessages(discordChannel)
      )
        .sort((a, b) => {
          return a.createdAt.getTime() - b.createdAt.getTime();
        })
        .filter((m) => new Date(m.createdAt.getTime()) < time);

      if (messages.length > 0) {
        discordChannel.bulkDelete(messages);
      }
      console.info(`Finished processing channel: ${watchedChannel.channelId}`);
    } else {
      console.info("No messages found in channel");
    }
  }
});
