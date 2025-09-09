import { Client } from "discord.js";
import * as commands from "./commands/index.js"
import Module from "../../models/Module.js";

class CoalaBase extends Module {
    init(client: Client) {
        super.init(client);
        this.registerInteractions(commands);

        client.on('messageCreate', (message) => {
            if (message.author.bot) return;
            if (message.guild) return;
            message.reply("Cale a boque");
        });
    }
}

export default new CoalaBase();