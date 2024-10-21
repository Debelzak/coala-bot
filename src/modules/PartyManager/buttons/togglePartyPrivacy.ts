import { ButtonBuilder, ButtonStyle, GuildMember } from "discord.js"
import PartyManager from "../partyManager";
import { Interaction } from "../../../models/Interaction";

const builder = new ButtonBuilder()
    .setLabel(`Tornar Privada`)
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
                ephemeral: true
            })
            return;
        }

        if(thisParty.ownerId !== interaction.user.id) {
            await interaction.reply({
                content: "Apenas o líder da party pode realizar esta ação.",
                ephemeral: true
            })
            return;
        }
    
        await interaction.deferReply({ephemeral: true});

        await PartyManager.TogglePrivacy(thisParty);

        PartyManager.ReloadControlMessage(thisParty);

        await thisParty.controlMessage?.reply({
            content: (thisParty.isPrivate) ? `A party agora é privada e apenas membros com permissão podem ver ou participar.`
                                           : `A party agora é pública e qualquer membro pode ver ou participar.`
        })

        await interaction.deleteReply();
    }
})