import { Client, GatewayIntentBits, ActivityType, ActivitiesOptions, Guild } from "discord.js";
import Logger from "./logger";
import Module from "./models/Module";

// Modules
import CoalaBase from "./modules/CoalaBase/coalaBase";
import PartyManager from "./modules/PartyManager/partyManager";
import { InteractionType } from "./models/Interaction";

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

        this.greet();
        this.logger.success(`Inicializando...`);

        this.login(this.botToken)
            .then(() => this.logger.success(`Conectado como ${this.user?.tag}!`))
            .catch((error: Error) => this.logger.error(error.message));

        this.on('ready', async() => {
            await this.updatePresence();
            await this.LoadModule(CoalaBase);
            await this.LoadModule(PartyManager);
            await this.ClearUnusedCommands();
            
            this.logger.success("Inicialização completa!");
            if(process.env.SILENT === "TRUE") Logger.silent = true;
        })
    }

    private async updatePresence() {
        let presenceInterval: NodeJS.Timeout | null = null;
        let activityIndex = 0;

        const activities: ActivitiesOptions[] = [
            { name: `/bora`, type: ActivityType.Playing },
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

    private async LoadModule(module: Module) {
        module.init(this);
        this.loadedModules.push(module);
    }

    private async ClearUnusedCommands(): Promise<void> {
        let guild: Guild | undefined;
        if(this.exclusiveGuildId) {
            guild = this.guilds.cache.get(this.exclusiveGuildId);
        }

        const detectedCommands = [];
        const appCommands = (guild) ? await guild?.commands.fetch() : await this.application?.commands.fetch();

        for(const module of this.loadedModules) {
            for(const [key, interaction] of module.interactions) {
                if(interaction.type !== InteractionType.COMMAND || !interaction.commandBuilder) continue;
                detectedCommands.push(interaction.commandBuilder.name);
            }
        }

        if(appCommands) {
            for(const [key,command] of appCommands) {
                if(!detectedCommands.includes(command.name)) {
                    await command.delete();
                    this.logger.warning(`Deletando comando inutilizado: /${command.name}`);
                }
            }
        }
    }

    private async greet() {
        console.log(`
            ⢀⠔⠊⠉⠑⢄⠀⠀⣀⣀⠤⠤⠤⢀⣀⠀⠀⣀⠔⠋⠉⠒⡄⠀
            ⡎⠀⠀⠀⠀⠀⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠉⠀⠀⠀⠀⠀⠘⡄
            ⣧⢢⠀⠀⠀⠀⠀⠀⠀ ⣀⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⢈⣆⡗
            ⠘⡇⠀⢀⠆⠀⠀⣀⠀⢰⣿⣿⣧⠀⢀⡀⠀⠀⠘⡆⠀⠈⡏⠀
            ⠀⠑⠤⡜⠀⠀⠈⠋⠀⢸⣿⣿⣿⠀⠈⠃⠀⠀⠀⠸⡤⠜⠀⠀
            ⠀⠀⠀⣇⠀⠀⠀⠀⠀⠢⣉⢏⣡⠀⠀⠀⠀⠀⠀⢠⠇⠀⠀⠀
            ⠀⠀⠀⠈⠢⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡤⠋⠀⠀⠀⠀
            ⠀⠀⠀⠀⠀⢨⠃⠀⢀⠀⢀⠔⡆⠀⠀⠀⠀⠻⡄⠀⠀⠀⠀⠀
            ⠀⠀⠀⠀⠀⡎⠀⠀⠧⠬⢾⠊⠀⠀⢀⡇⠀⠀⠟⢆⠀⠀⠀⠀
            ⠀⠀⠀⠀⢀⡇⠀⠀⡞⠀⠀⢣⣀⡠⠊⠀⠀⠀⢸⠈⣆⡀⠀⠀
            ⠀⠀⡠⠒⢸⠀⠀⠀⡇⡠⢤⣯⠅⠀⠀⠀⢀⡴⠃⠀⢸⠘⢤⠀
            ⠀⢰⠁⠀⢸⠀⠀⠀⣿⠁⠀⠙⡟⠒⠒⠉⠀⠀⠀⠀⠀⡇⡎⠀
            ⠀⠘⣄⠀⠸⡆⠀⠀⣿⠀⠀⠀⠁⠀⠀⠀⠀⠀⠀⠀⢀⠟⠁⠀
            ⠀⠀⠘⠦⣀⣷⣀⡼⠽⢦⡀⠀⠀⢀⣀⣀⣀⠤⠄⠒⠁⠀⠀⠀
                    Coala Bot`);
    }
}

export default new Worker();