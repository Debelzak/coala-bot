import { ApplicationCommand, Client, GatewayIntentBits, Guild, GuildMember } from "discord.js";
import * as commands from "./commands";
import PartyManager from "./modules/partyManager";
import handler from "./handler";
import Logger from "./logger";
import Util from "./util/utils";

class Worker extends Client {
    private logger: Logger;

    constructor(token: string, guildId: string)
    {
        const options = {
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildVoiceStates
            ]
        }
        super(options);

        this.logger = new Logger(this.constructor.name);
        this.login(token);

        this.on('ready', () => {
            this.RegisterCommands(guildId);
            this.ManageInteractions();
            this.LoadModules();
            
            this.logger.success("Thread principal iniciada!");
            this.logger.success(`Conectado como ${this.user?.tag}!`);
        })
    }

    private LoadModules() {
        new PartyManager(this).init();
    }

    private async RegisterCommands(guildId: string)
    {
        const guild: Guild | undefined = this.guilds.cache.get(guildId);

        if (!guild) {
            this.logger.error(`Não foi possível encontrar o servidor com ID ${guildId}`);
            return;
        }

        const promises: Promise<ApplicationCommand<{}>>[] = [];

        for(const [key, command] of Object.entries(commands)) {
            try {
                this.logger.success(`Registrando o comando /${command.name}`);
                promises.push(guild.commands?.create(command)); //client.application?.command
            } catch (error) {
                this.logger.error(Util.getErrorMessage(error));
                promises.push(Promise.reject(error));
            }
        }
        
        await Promise.all(promises);
    }

    private async ManageInteractions()
    {
        this.on('interactionCreate', handler.handleInteraction);
    }
}

export default Worker;