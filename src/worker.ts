import { Client, GatewayIntentBits, ActivityType, ActivitiesOptions, Guild } from "discord.js";
import Logger from "./logger";
import Module from "./models/Module";

// Modules
import CoalaBase from "./modules/CoalaBase/coalaBase";
import PartyManager from "./modules/PartyManager/partyManager";

const version = require('../package.json').version;

class Worker extends Client {
    public loadedModules: Module[] = [];
    private botToken: string | undefined;
    public developmentMode: boolean = false;
    public exclusiveGuildId: string | undefined;
    private logger: Logger;

    constructor()
    {
        const options = {
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildPresences
            ]
        }
        super(options);
        this.logger = new Logger(this.constructor.name);
    }

    public start(token: string, guildId?: string) {
        this.botToken = token;
        this.exclusiveGuildId = guildId;

        if(process.env.DEVELOPMENT === "TRUE") this.developmentMode = true;

        this.login(this.botToken)
            .then(() => this.logger.success(`Conectado como ${this.user?.tag}!`))
            .catch((error: Error) => this.logger.error(error.message));

        this.on('ready', () => {
            this.ClearCommands().then(() => {
                this.updatePresence();
                
                this.LoadModule(CoalaBase);
                this.LoadModule(PartyManager);
                
                this.logger.success("Thread principal iniciada!");
                if(process.env.SILENT === "TRUE") Logger.silent = true;
            })
        })
    }

    private updatePresence() {
        let presenceInterval: NodeJS.Timeout | null = null;
        let activityIndex = 0;

        const activities: ActivitiesOptions[] = [
            { name: `/bora`, type: ActivityType.Playing },
            { name: `v${version}`, type: ActivityType.Playing },
        ];

        this.logger.success("Definindo status de atividade...");
        const activity = activities[activityIndex];
        this.user?.setPresence({
            activities: [activity],
            status: "online"
        })

        activityIndex = (activityIndex + 1) % activities.length; // Próxima atividade

        if (!presenceInterval) {
            presenceInterval = setInterval(() => {
                const nextActivity = activities[activityIndex];
                this.user?.setPresence({
                    activities: [nextActivity],
                    status: "online"
                })

                activityIndex = (activityIndex + 1) % activities.length; // Próxima atividade
            }, 30_000); // Atualiza a cada 30 segundos
        }
    }

    private LoadModule(module: Module) {
        module.init(this);
        this.loadedModules.push(module);
    }

    private async ClearCommands(): Promise<void> {
        let guild: Guild | undefined;
        if(this.exclusiveGuildId) {
            guild = this.guilds.cache.get(this.exclusiveGuildId);
        }

        const currentGlobalCommands = await this.application?.commands.fetch();

        // Clean global commands
        if(currentGlobalCommands) {
            for(const [key,command] of currentGlobalCommands) {
                await command.delete();
                this.logger.warning(`Deletando comando global: /${command.name}`);
            }
        }

        // Clean normal commands
        const currentCommands = await guild?.commands.fetch();
        if(currentCommands) {
            for(const [key, command] of currentCommands) {
                await command.delete();
                this.logger.warning(`Deletando comando de guild: /${command.name}`);
            }
        }
    }
}

export default new Worker();