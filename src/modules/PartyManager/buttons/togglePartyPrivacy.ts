import { ButtonBuilder, ButtonStyle, GuildMember, MessageFlags } from "discord.js"
import PartyManager from "../partyManager.js";
import { Interaction } from "../../../models/Interaction.js";

const builder = new ButtonBuilder()
    .setLabel(`Alternar Privacidade`)
    .setStyle(ButtonStyle.Primary)
    .setEmoji(`🔒`)
    .setCustomId("btn_togglePartyPrivacy")

export default new Interaction({
    name: "btn_togglePartyPrivacy",
    builder: builder,
    async run(interaction) {
        if(!interaction.isButton()) return;
        if(!(interaction.member instanceof GuildMember)) return;

        const thisParty = await PartyManager.GetPartyByMember(interaction.member);

        if(!thisParty) {
            await interaction.reply({
                content: "Você não é líder de nenhuma party no momento.",
                flags: MessageFlags.Ephemeral
            })
            return;
        }

        if(thisParty.ownerId !== interaction.user.id) {
            await interaction.reply({
                content: "Apenas o líder da party pode realizar esta ação.",
                flags: MessageFlags.Ephemeral
            })
            return;
        }
    
        const reply = await interaction.deferReply();

        await PartyManager.TogglePrivacy(thisParty);

        PartyManager.ReloadControlMessage(thisParty);

        await reply.edit({
            content: (thisParty.isPrivate) ? `A party agora é privada e apenas membros com permissão podem ver ou participar.`
                                           : `A party agora é pública e qualquer membro pode ver ou participar.`
        })
    }
})