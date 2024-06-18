import { ButtonBuilder, ButtonInteraction, CommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from "discord.js";

export type ExecutableInteraction = ButtonInteraction | CommandInteraction

export class Interaction<T> {
    public name: string;
    public builder: T;
    public run: (interaction: ExecutableInteraction) => Promise<void>;

    constructor(interaction: {name: string, builder: T, run: (interaction: ExecutableInteraction) => Promise<void>}) {
        this.name = interaction.name;
        this.builder = interaction.builder;
        this.run = interaction.run;
    }

    public isCommand(): this is Interaction<SlashCommandBuilder> {
        return this.builder instanceof SlashCommandBuilder;
    }

    public isButton(): this is Interaction<ButtonBuilder> {
        return this.builder instanceof ButtonBuilder;
    }
}