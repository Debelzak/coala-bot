import { Interaction } from "discord.js"
import PartyManager from "../../modules/partyManager";

export default {
    customId: "btn_unlockParty",
    async run(interaction: Interaction) {
        if(!interaction.isButton()) return;
        const thisParty = (interaction.channelId) ? PartyManager.parties.get(interaction.channelId) : undefined;
    
        // Check if party is found
        if(!thisParty) throw new Error("Erro desconhecido");
    
        const partyManager: PartyManager = new PartyManager(interaction.client);
    
        await partyManager.UnlockParty(interaction.user, thisParty, interaction)
    }
};