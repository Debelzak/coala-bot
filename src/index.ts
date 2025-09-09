import dotenv from "dotenv";
import Worker from "./worker.js";

dotenv.config();

Worker.start(process.env.BOT_TOKEN!, process.env.GUILD_ID!);