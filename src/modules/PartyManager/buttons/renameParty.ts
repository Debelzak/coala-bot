import { TextInputBuilder, TextInputStyle, ActionRowBuilder, ModalBuilder, Interaction as DiscordInteraction } from "discord.js"
import PartyManager from "../partyManager";
import { Interaction, InteractionType } from "../../../models/Interaction";

export default new Interaction({
    type: InteractionType.BUTTON,
    customId: "btn_renameParty",
    async run(interaction: DiscordInteraction) {
        if(!interaction.isButton()) return;
        const thisParty = (interaction.channelId) ? PartyManager.parties.get(interaction.channelId) : undefined;
    
        // Check if party was found
        if(!thisParty) return;

        const isPartyOwner = await PartyManager.CheckOwnership(interaction.user, thisParty, interaction);
        if(!isPartyOwner) {
            return;
        }

        if(!thisParty.isRenameable()) {
            const nextRename: number = thisParty.getNextRenameTimestamp();
            
            if(interaction) {
                await interaction.reply({
                    content: `A party poderá ser renomeada novamente <t:${Math.ceil(nextRename/1000)}:R>.`,
                    ephemeral: true,
                })
            }
            return;
        }
        
        const modal = new ModalBuilder()
            .setCustomId(interaction.id)
            .setTitle('Renomear Party')
    
        const partyNameInput = new TextInputBuilder()
            .setCustomId("new_name")
            .setLabel("Novo nome")
            .setPlaceholder(`Insira um novo nome para ${thisParty.voiceChannel.name}`)
            .setStyle(TextInputStyle.Short)
    
        const firstActionRow: any = new ActionRowBuilder().addComponents(partyNameInput);
    
        modal.addComponents(firstActionRow);
    
        await interaction.showModal(modal)
            .catch((error: Error) => console.log(error.message))

        const submitted = await interaction.awaitModalSubmit({
            filter: (i) => i.user.id === interaction.user.id && i.customId === interaction.id,
            time: 60_000,
        }).catch((error) => {
            return;
        })

        if(submitted) {
            const newName = submitted.fields.getTextInputValue("new_name");
            await PartyManager.RenameParty(interaction.user, thisParty, newName, submitted);
        }
    }
})