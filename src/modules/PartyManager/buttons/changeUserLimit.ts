import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ComponentType, ButtonBuilder, ButtonStyle, GuildMember } from "discord.js"
import PartyManager from "../partyManager";
import { Interaction } from "../../../models/Interaction";

const builder = new ButtonBuilder()
    .setLabel("Ajustar Limite")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("🎚️")
    .setCustomId("btn_changeUserLimit")

export default new Interaction({
    name: "btn_changeUserLimit",
    builder: builder,
    async run(interaction) {
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
    
        const select = new StringSelectMenuBuilder()
            .setCustomId(interaction.id)
            .setPlaceholder('Selecione um novo limite de usuários')
            .setMaxValues(1)
            .setMinValues(1)
        
        for(let i=1; i<=25; i++) {
            select.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${i}`)
                    .setValue(i.toString())
            );
        }
    
        const firstRow: any = new ActionRowBuilder()
            .addComponents(select);
    
        const reply = await interaction.reply({
            components: [firstRow],
            fetchReply: true,
            ephemeral: true,
        });

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: (i) => i.user.id === interaction.user.id && i.customId === interaction.id,
            time: 60_000,
        });

        collector.on("collect", (newInteraction) => {
            interaction.deleteReply()
                .then(async() => {
                    await newInteraction.deferReply({ephemeral: true})

                    const newLimit = parseInt(newInteraction.values[0]);
                    
                    await PartyManager.ChangeUserLimit(thisParty, newLimit);

                    await thisParty.controlMessage?.reply({
                        content: `O limite de usuários foi alterado para \`${newLimit}\`.`,
                    })

                    await newInteraction.deleteReply();
                })
                .catch((error) => {
                    return;
                })
        });

        collector.on("end", (collected, reason) => {
            if(collected.size === 0 && reason === "time") interaction.deleteReply();
        })
    }
})