import { TextInputBuilder, TextInputStyle, ActionRowBuilder, ModalBuilder, ButtonBuilder, ButtonStyle, GuildMember, MessageFlags } from "discord.js"
import PartyManager from "../partyManager";
import { Interaction } from "../../../models/Interaction";

const builder = new ButtonBuilder()
    .setCustomId("btn_renameParty")
    .setLabel("Renomear")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("📝")

export default new Interaction({
    name: "btn_renameParty",
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

        if(!thisParty.isRenameable()) {
            const nextRename: number = thisParty.getNextRenameTimestamp();
            
            if(interaction) {
                await interaction.reply({
                    content: `A party poderá ser renomeada novamente <t:${Math.ceil(nextRename/1000)}:R>.`,
                    flags: MessageFlags.Ephemeral,
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
            const reply = await submitted.deferReply();

            const newName = submitted.fields.getTextInputValue("new_name");
            await PartyManager.RenameParty(thisParty, newName);

            PartyManager.ReloadControlMessage(thisParty);
            await reply.edit({
                content: `A party foi renomeada para ${thisParty.voiceChannel}.`
            })
        }
    }
})