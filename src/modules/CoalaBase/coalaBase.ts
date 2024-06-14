import { Client } from "discord.js";
import * as commands from "./commands"
import Module from "../../models/Module";

class CoalaBase extends Module {
    init(client: Client) {
        super.init(client);
        this.registerInteractions(commands);
    }
}

export default new CoalaBase();