import { Client } from "discord.js"
import Logger from "../logger";

class Module {
    protected readonly client: Client;
    protected readonly logger: Logger;

    constructor(client: Client) {
        this.client = client;
        this.logger = new Logger(this.constructor.name);
    }

    init(): void {
        this.logger.success("Inicializando módulo...");
    }
}

export default Module;