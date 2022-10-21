import { DataTypes } from "sequelize";
import { sequelize } from "../db";

export const WatchedChannel = sequelize.define("WatchedChannel", {
  channelId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  hours: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});
