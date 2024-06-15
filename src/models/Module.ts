import { Client, Interaction as DiscordInteraction, Guild, SlashCommandOptionsOnlyBuilder } from "discord.js"
import Logger from "../logger";
import { Interaction, InteractionType } from "./Interaction";
import Worker from "../worker"
import Util from "../util/utils";

export default class Module {
    protected client: Client | null = null;
    protected readonly logger: Logger;
    public interactions: Map<string, Interaction>;

    constructor() {
        this.interactions = new Map<string, Interaction>();
        this.logger = new Logger(this.constructor.name);
    }

    public init(client: Client): void {
        this.client = client;
        this.logger.success("Inicializando módulo...");
        
        client.on('interactionCreate', this.executeInteraction.bind(this));
    }

    public registerInteractions(interactions: object) {
        for(const [key, interaction] of Object.entries(interactions)) {
            if(interaction instanceof Interaction) {
                if(interaction.type === InteractionType.COMMAND) {
                    if(interaction.commandBuilder) this.registerCommand(interaction.commandBuilder)
                }

                this.interactions.set(interaction.customId, interaction);
            } else {
                continue;
            }
        }
    }

    private registerCommand(builder: SlashCommandOptionsOnlyBuilder): void
    {
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

    private executeInteraction(interaction: DiscordInteraction) {
        let foundInteraction;
        if(interaction.isCommand()) foundInteraction = this.interactions.get(interaction.commandName)
        if(interaction.isButton()) foundInteraction = this.interactions.get(interaction.customId)

        if(foundInteraction) {
            try {
                foundInteraction.run(interaction);
            }
            catch (error: unknown) {
                this.logger.error(`Erro ao manusear interação - ${error as string}`);
            }
        }
    }
}