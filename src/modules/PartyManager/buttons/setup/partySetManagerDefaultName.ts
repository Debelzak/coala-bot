import { ActionRowBuilder, ChannelType, ComponentType, Interaction as DiscordInteraction, EmbedBuilder, ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle } from "discord.js"
import { Interaction, InteractionType } from "../../../../models/Interaction";
import PartyManager from "../../partyManager";

export default new Interaction({
    type: InteractionType.BUTTON,
    customId: "btn_partySetManagerDefaultName",
    async run(interaction: DiscordInteraction): Promise<void> {
        if(!interaction.isButton()) return;

         const reply = await interaction.deferReply({
            fetchReply: true,
            ephemeral: true
        })

        const embed = new EmbedBuilder()
            .setTitle("Definir nome padrão de party")
            .setDescription("Defina o nome que cada party terá por padrão ao ser criada. Você pode utilizar os placeholders abaixo para substituição:")
            .setFields([
                {name: "%USER%", value: "Nome de exibição do usuário no servidor."},
                {name: "%INC%", value: "Número crescente. Aumenta em 1 para cada sala criada pelo gerenciador."},
                {name: "%GAME%", value: "O jogo que está sendo jogando pelo usuário ao criar a sala."},
            ])

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
                            const newName = submitted.fields.getTextInputValue("new_default");
                            manager.defaultPartyName = newName;
                            manager.DB_Save();

                            await submitted.deleteReply();

                            await submitted.followUp({
                                content: `Nome padrão \`${newName}\` definido para salas criadas em ${selectedChannel}.`
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
        .setTitle('Renomear Party')

    const partyNameInput = new TextInputBuilder()
        .setCustomId("new_default")
        .setLabel("Novo nome")
        .setPlaceholder(`Insira um novo nome`)
        .setMinLength(1)
        .setMaxLength(50)
        .setStyle(TextInputStyle.Short)
    
    const firstActionRow: any = new ActionRowBuilder().addComponents(partyNameInput);

    modal.addComponents(firstActionRow);

    return modal;
}