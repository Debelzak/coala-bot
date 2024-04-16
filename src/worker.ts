import { ApplicationCommand, Client, GatewayIntentBits, Guild, ActivityType } from "discord.js";
import * as commands from "./commands";
import PartyManager from "./modules/partyManager";
import handler from "./handler";
import Logger from "./logger";
import Util from "./util/utils";

class Worker extends Client {
    private developmentMode: boolean = false;
    private exclusiveGuildId: string | undefined;
    private logger: Logger;

    constructor(token: string | undefined, guildId?: string)
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

        if(guildId) this.exclusiveGuildId = guildId;
        if(process.env.DEVELOPMENT === "TRUE") this.developmentMode = true;

        this.login(token)
            .then(() => this.logger.success(`Conectado como ${this.user?.tag}!`))
            .catch((error: Error) => this.logger.error(error.message));

        this.on('ready', () => {
            this.SetPresence();
            this.RegisterCommands();
            this.ManageInteractions();
            this.LoadModules();
            
            this.logger.success("Thread principal iniciada!");
            if(process.env.SILENT === "TRUE") Logger.silent = true;
        })
    }

    private SetPresence() {
        this.logger.success("Definindo status de atividade...");
        this.user?.setPresence({
            activities: [
                { name: "/bora", type: ActivityType.Playing },
            ],
            status: "online"
        })
    }

    private LoadModules() {
        new PartyManager(this).init();
    }

    private async CleanGlobalCommands(): Promise<void> {
        // Clean commands
        const currentGlobalCommands = await this.application?.commands.fetch();
        currentGlobalCommands?.map(async (command) => {
            await command.delete();
        })
    }

    private async RegisterCommands(): Promise<void>
    {
        let guild: Guild | undefined;
        if(this.exclusiveGuildId) {
            guild = this.guilds.cache.get(this.exclusiveGuildId);
        }

        const promises: (Promise<ApplicationCommand<{}>> | undefined)[] = [];

        for(const [key, command] of Object.entries(commands)) {
            try {
                if(this.developmentMode && guild) {
                    this.logger.success(`Registrando o comando /${command.name} para o servidor [${guild.name}]`);
                    promises.push(guild.commands?.create(command));
                } else {
                    this.logger.success(`Registrando o comando global /${command.name}`);
                    promises.push(this.application?.commands.create(command));
                }

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