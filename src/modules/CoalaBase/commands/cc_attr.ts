import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js"
import { Interaction } from "../../../models/Interaction.js";
import * as btns from "../buttons/index.js"
import { CoalaBase } from "../../index.js";

const builder = new SlashCommandBuilder()
    .setName("cc_attr")
    .setDescription("⚙️ Automatização de cargo para os membros que frequentam canais de voz.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

export default new Interaction({
    name: builder.name,
    builder: builder,
    async run(interaction) {
        if(!interaction.isCommand()) return;
        if(!interaction.guild) return;

        const currentConfig = CoalaBase.voiceAdeptRoles.get(interaction.guild.id);

        const embed = new EmbedBuilder()
            .setTitle("Configurações atuais")

        if(currentConfig) {
            embed.addFields([
                { name: `Cargo que membros receberão ao participar de canais de voz por 1h`, value: `${interaction.guild.roles.cache.get(currentConfig.roleId)}`, inline: false},
                { name: `Tempo sem participar de nenhuma chamada para perder o cargo`, value: `${currentConfig.expirationDays} dias`, inline: false},
                { name: `Mensagem de anúncio`, value: `${(currentConfig.announceWebhookURL) ? "Sim" : "Não"}`, inline: false}
            ])
        } else {
            embed.setDescription("Nenhuma configuração definida ainda.");
        }

        const row: any = new ActionRowBuilder();

        row.addComponents(btns.voiceAdeptConfigure.builder);

        if(currentConfig)
            row.addComponents(btns.voiceAdeptDelete.builder);

        const reply = await interaction.reply({
            embeds: [embed],
            components: [row],
            flags: MessageFlags.Ephemeral,
        })
    }
})