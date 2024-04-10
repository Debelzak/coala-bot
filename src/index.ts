import dotenv from "dotenv";
import Worker from "./worker";

dotenv.config();
new Worker(process.env.BOT_TOKEN!, process.env.GUILD_ID!);