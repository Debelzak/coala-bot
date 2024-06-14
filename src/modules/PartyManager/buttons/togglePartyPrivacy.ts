import { Interaction as DiscordInteraction } from "discord.js"
import PartyManager from "../partyManager";
import { Interaction, InteractionType } from "../../../models/Interaction";

export default new Interaction({
    type: InteractionType.BUTTON,
    customId: "btn_togglePartyPrivacy",
    async run(interaction: DiscordInteraction) {
        if(!interaction.isButton()) return;
        const thisParty = (interaction.channelId) ? PartyManager.parties.get(interaction.channelId) : undefined;
    
        // Check if party was found
        if(!thisParty) return;
    
        await PartyManager.TogglePrivacy(interaction.user, thisParty, interaction)
    }
})