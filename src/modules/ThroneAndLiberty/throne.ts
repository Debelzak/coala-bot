import { Client } from "discord.js";
import * as commands from "./commands/index.js"
import * as autocomplete from "./autocomplete/index.js"
import Module from "../../models/Module.js";

class ThroneAndLiberty extends Module {
    init(client: Client) {
        super.init(client);
        this.registerInteractions(commands);
        this.registerInteractions(autocomplete);
    }
}

export default new ThroneAndLiberty();