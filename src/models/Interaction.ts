import { Interaction as DiscordInteraction, SlashCommandOptionsOnlyBuilder } from "discord.js";

export enum InteractionType {
    COMMAND,
    BUTTON,
}

export class Interaction {
    public type: InteractionType;
    public customId: string;
    public commandBuilder?: SlashCommandOptionsOnlyBuilder | undefined;
    public run: (interaction: DiscordInteraction) => Promise<void>;

    constructor(interaction: Interaction) {
        this.type = interaction.type;
        this.customId = interaction.customId;
        this.commandBuilder = interaction.commandBuilder;
        this.run = interaction.run;
    }
}