import { Interaction } from "discord.js"
import PartyManager from "../../modules/partyManager";

export default {
    customId: "btn_togglePartyPrivacy",
    async run(interaction: Interaction) {
        if(!interaction.isButton()) return;
        const thisParty = (interaction.channelId) ? PartyManager.parties.get(interaction.channelId) : undefined;
    
        // Check if party was found
        if(!thisParty) return;
        
        const partyManager: PartyManager = new PartyManager(interaction.client);
    
        await partyManager.TogglePrivacy(interaction.user, thisParty, interaction)
    }
}