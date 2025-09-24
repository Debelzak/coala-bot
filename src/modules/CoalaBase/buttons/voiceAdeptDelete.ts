import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, RoleSelectMenuBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from "discord.js"
import { Interaction } from "../../../models/Interaction.js";
import { CoalaBase } from "../../index.js";

const builder = new ButtonBuilder()
    .setCustomId("btn_voiceAdeptDelete")
    .setEmoji("➖")
    .setLabel("Limpar")
    .setStyle(ButtonStyle.Danger)

export default new Interaction({
    name: "btn_voiceAdeptDelete",
    builder: builder,
    async run(interaction) {
        if(!interaction.isButton()) return;
        if(!interaction.guild) return;

        const currentConfig = CoalaBase.voiceAdeptRoles.get(interaction.guild.id);

        if(currentConfig) {
            CoalaBase.voiceAdeptRoles.delete(currentConfig.guildId);
            currentConfig.DB_Delete();

            await interaction.reply("As configurações de cargos automáticos para chamadas de voz foram excluídas.");
        }
    }
})
