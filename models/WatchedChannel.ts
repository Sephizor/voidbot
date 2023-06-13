import { DataTypes, Model } from "sequelize";
import { sequelize } from "../db";

export class WatchedChannel extends Model {
  channelId!: string;
  hours!: number;
}

WatchedChannel.init(
  {
    channelId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    hours: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "WatchedChannel",
  }
);
