import { ActionRowBuilder, ButtonBuilder, Interaction as DiscordInteraction, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { Interaction } from "../../../models/Interaction.js";
import * as btns from "../buttons/index.js"

const builder = new SlashCommandBuilder()
    .setName("partysetup")
    .setDescription("⚙️ Configurações do gerenciador de party.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export default new Interaction({
    name: builder.name,
    builder: builder,
    async run(interaction) {
        if(!interaction.isCommand()) return;
        const embed = new EmbedBuilder()
            .setTitle("Menu de configuração do gerenciador de party")

        const buttons = [
            {
                emoji: "➕",
                label: "Novo canal",
                description: "Começa a gerenciar um canal de voz.",
                component: btns.partyNewManagerChannel.builder as ButtonBuilder
            },
            {
                emoji: "📝",
                label: "Alterar nome padrão",
                description: "Alterar o template de nome padrão das parties criadas por um canal gerenciador.",
                component: btns.partySetManagerDefaultName.builder as ButtonBuilder
            },
            {
                emoji: "🎚️",
                label: "Alterar limite",
                description: "Alterar limite padrão de usuários das parties criadas por um canal gerenciador.",
                component: btns.partySetManagerDefaultUserLimit.builder as ButtonBuilder
            },
            {
                emoji: "➖",
                label: "Parar gerenciamento",
                description: "Para de gerenciar um canal.",
                component: btns.partyStopManagement.builder as ButtonBuilder
            },
        ]

        const row: any = new ActionRowBuilder();

        for(const button of buttons) {
            embed.addFields([
                { name: `${button.emoji} ${button.label}`, value: `${button.description}`, inline: false}
            ])
            row.addComponents(button.component);
        }

        const reply = await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: MessageFlags.Ephemeral,
        })
    }
})