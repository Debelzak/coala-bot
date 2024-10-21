import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, Interaction as DiscordInteraction, EmbedBuilder, ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from "discord.js"
import { Interaction } from "../../../../models/Interaction";
import PartyManager from "../../partyManager";

const builder = new ButtonBuilder()
    .setCustomId("btn_partySetManagerDefaultUserLimit")
    .setEmoji("🎚️")
    .setLabel("Alterar limite")
    .setStyle(ButtonStyle.Primary)

export default new Interaction({
    name: "btn_partySetManagerDefaultUserLimit",
    builder: builder,
    async run(interaction): Promise<void> {
        if(!interaction.isButton()) return;
         const reply = await interaction.deferReply({
            fetchReply: true,
            ephemeral: true
        })

        const embed = new EmbedBuilder()
            .setTitle("Definir limite de usuários padrão de party")
            .setDescription("Defina o limite de usuários conectados que a party terá por padrão ao ser criada.")

		const select = new StringSelectMenuBuilder()
			.setCustomId(interaction.id)
			.setPlaceholder('Selecione o gerenciador de party')

        const guildChannels = await interaction.guild?.channels.fetch();
        if(guildChannels) {
            for(const [key, channel] of guildChannels) {
                if(!channel?.isVoiceBased()) continue;
                if(!PartyManager.managerChannels.get(channel.id)) continue;

                const label = (channel.parent) ? `${channel.parent?.name} > ${channel.name}` : `${channel.name}`
                select.addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(label)
                        .setValue(channel.id)
                )
            }
        }

        if(select.options.length <= 0) {
            await interaction.editReply(`Este servidor ainda não possui nenhum canal sendo gerenciado por ${interaction.client.user}.`)
            return;
        }

        const row: any = new ActionRowBuilder()
            .addComponents(select);

        await interaction.editReply({
            embeds: [embed],
            components: [row],
        })

        const collector = reply.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: (i) => i.user.id === interaction.user.id && i.customId === interaction.id,
            time: 60_000,
        });

        collector.on("collect", (newInteraction) => {
            interaction.deleteReply()
                .then(async() => {
                    const selectedChannelId = newInteraction.values[0];
                    const selectedChannel = guildChannels?.get(selectedChannelId);

                    const modal = generateModal(newInteraction);

                    await newInteraction.showModal(modal);

                    const submitted = await newInteraction.awaitModalSubmit({
                        filter: (i) => i.user.id === newInteraction.user.id && i.customId === newInteraction.id,
                        time: 60_000,
                    }).catch((error) => {
                        return;
                    })

                    if(submitted) {
                        await submitted.deferReply({
                            ephemeral: true
                        });

                        const manager = PartyManager.managerChannels.get(selectedChannelId);

                        if(manager) {
                            const newLimit = parseInt(submitted.fields.getTextInputValue("new_limit"));
                            
                            if(isNaN(newLimit) || newLimit < 1 || newLimit > 99) {
                                return await submitted.editReply({
                                    content: `Limite inválido inserido. Apenas números entre 1 e 99`
                                });
                            }

                            manager.maxUsers = newLimit;
                            manager.DB_Save();

                            await submitted.deleteReply();

                            return await submitted.followUp({
                                content: `Limite de usuários \`${newLimit}\` definido para salas criadas em ${selectedChannel}.`
                            });
                        }
                    }
                })
        });

        collector.on("end", (collected, reason) => {
            if(collected.size === 0 && reason === "time") interaction.deleteReply();
        })
    }
})

function generateModal(interaction: DiscordInteraction): ModalBuilder {
    const modal = new ModalBuilder()
        .setCustomId(interaction.id)
        .setTitle('Novo limite de usuários')

    const partyNameInput = new TextInputBuilder()
        .setCustomId("new_limit")
        .setLabel("Novo limite")
        .setPlaceholder(`Insira o novo limite entre 1 e 99`)
        .setMinLength(1)
        .setMaxLength(2)
        .setStyle(TextInputStyle.Short)
    
    const firstActionRow: any = new ActionRowBuilder().addComponents(partyNameInput);

    modal.addComponents(firstActionRow);

    return modal;
}