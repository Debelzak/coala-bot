import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Interaction as DiscordInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { Interaction, InteractionType } from "../../../models/Interaction";

const builder = new SlashCommandBuilder()
    .setName("partysetup")
    .setDescription("Adiciona novo canal gerenciador de party.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export default new Interaction({
    type: InteractionType.COMMAND,
    customId: builder.name,
    commandBuilder: builder,
    async run(interaction: DiscordInteraction): Promise<void> {
        if(!interaction.isCommand()) return;

        const embed = new EmbedBuilder()
            .setTitle("Menu de configuração do gerenciador de party")

        const buttons = [
            {
                description: "Começa a gerenciar um canal de voz.",
                component: new ButtonBuilder()
                    .setCustomId("btn_partyNewManagerChannel")
                    .setEmoji("➕")
                    .setLabel("Novo canal")
                    .setStyle(ButtonStyle.Primary)
            },
            {
                description: "Alterar o template de nome padrão das parties criadas por um canal gerenciador.",
                component: new ButtonBuilder()
                    .setCustomId("btn_partySetManagerDefaultName")
                    .setEmoji("📝")
                    .setLabel("Alterar nome padrão")
                    .setStyle(ButtonStyle.Primary)
            },
            {
                description: "Alterar limite padrão de usuários das parties criadas por um canal gerenciador.",
                component: new ButtonBuilder()
                    .setCustomId("btn_partySetManagerDefaultUserLimit")
                    .setEmoji("🎚️")
                    .setLabel("Alterar limite")
                    .setStyle(ButtonStyle.Primary)
            },
            {
                description: "Para de gerenciar um canal.",
                component: new ButtonBuilder()
                    .setCustomId("btn_partyStopManagement")
                    .setEmoji("➖")
                    .setLabel("Parar gerenciamento")
                    .setStyle(ButtonStyle.Danger)
            },
        ]

        const row: any = new ActionRowBuilder();

        for(const button of buttons) {
            embed.addFields([
                { name: `${button.component.data.emoji?.name} ${button.component.data.label}`, value: `${button.description}`, inline: false}
            ])
            row.addComponents(button.component);
        }

        const reply = await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true,
        })
    }
})