import { Client, Interaction as DiscordInteraction, Guild, SlashCommandOptionsOnlyBuilder } from "discord.js"
import Logger from "../logger.js";
import { ExecutableInteraction, Interaction } from "./Interaction.js";
import Worker from "../worker.js"
import Util from "../util/utils.js";

export default class Module {
    protected client: Client | null = null;
    protected readonly logger: Logger;
    public interactions: Map<string, Interaction<ExecutableInteraction>>;

    constructor() {
        this.interactions = new Map<string, Interaction<ExecutableInteraction>>();
        this.logger = new Logger(this.constructor.name);
    }

    public init(client: Client): void {
        this.client = client;
        this.logger.success("Inicializando módulo...");
        
        client.on('interactionCreate', (interaction: DiscordInteraction) => {
            this.executeInteraction.bind(this)(interaction as ExecutableInteraction);
        });
    }

    public registerInteractions(interactions: object) {
        for(const [key, interaction] of Object.entries(interactions)) {
            if(interaction instanceof Interaction) {
                if(interaction.isCommand()) {
                    this.registerCommand(interaction.builder)
                }

                this.interactions.set(interaction.name, interaction);
            } else {
                continue;
            }
        }
    }

    private registerCommand(builder: SlashCommandOptionsOnlyBuilder): void {
        let guild: Guild | undefined;
        if(Worker.exclusiveGuildId) {
            guild = this.client?.guilds.cache.get(Worker.exclusiveGuildId);
        }

        try {
            if(Worker.developmentMode && guild) {
                this.logger.success(`Registrando o comando /${builder.name} para o servidor [${guild.name}]`);
                guild.commands?.create(builder)
            } else {
                this.logger.success(`Registrando o comando global /${builder.name}`);
                this.client?.application?.commands.create(builder)
            }

        } catch (error) {
            this.logger.error(Util.getErrorMessage(error));
        }
    }

    private executeInteraction(interaction: ExecutableInteraction) {
        let foundInteraction;
        if(interaction.isCommand()) foundInteraction = this.interactions.get(interaction.commandName)
        if(interaction.isButton()) foundInteraction = this.interactions.get(interaction.customId)

        if(foundInteraction) {
            foundInteraction.run(interaction)
            .catch((error) => {
                this.logger.error(`Erro ao manusear interação - ${error as string}`);
            })
        }
        else 
        {
            if(interaction.isAutocomplete()) {
                this.interactions.forEach((i) => {
                    i.run(interaction);
                })
            }
        }
    }
}