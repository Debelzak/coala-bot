import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Interaction as DiscordInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { Interaction } from "../../../models/Interaction";
import * as btns from "../buttons"

const builder = new SlashCommandBuilder()
    .setName("partysetup")
    .setDescription("⚙️ Configurações do gerenciador de party.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export default new Interaction({
    name: builder.name,
    builder: builder,
    async run(interaction) {
        const embed = new EmbedBuilder()
            .setTitle("Menu de configuração do gerenciador de party")

        const buttons = [
            {
                description: "Começa a gerenciar um canal de voz.",
                component: btns.partyNewManagerChannel.builder as ButtonBuilder
            },
            {
                description: "Alterar o template de nome padrão das parties criadas por um canal gerenciador.",
                component: btns.partySetManagerDefaultName.builder as ButtonBuilder
            },
            {
                description: "Alterar limite padrão de usuários das parties criadas por um canal gerenciador.",
                component: btns.partySetManagerDefaultUserLimit.builder as ButtonBuilder
            },
            {
                description: "Para de gerenciar um canal.",
                component: btns.partyStopManagement.builder as ButtonBuilder
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