import { Client } from "discord.js";
import * as commands from "./commands"
import * as autocomplete from "./autocomplete"
import Module from "../../models/Module";

class ThroneAndLiberty extends Module {
    init(client: Client) {
        super.init(client);
        this.registerInteractions(commands);
        this.registerInteractions(autocomplete);
    }
}

export default new ThroneAndLiberty();