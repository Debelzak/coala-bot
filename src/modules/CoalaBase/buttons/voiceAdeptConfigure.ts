import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ModalBuilder, RoleSelectMenuBuilder, TextInputBuilder, TextInputStyle } from "discord.js"
import { Interaction } from "../../../models/Interaction.js";
import { CoalaBase } from "../../index.js";
import VoiceAdeptRole from "../models/VoiceAdeptRole.js";

const builder = new ButtonBuilder()
    .setCustomId("btn_voiceAdeptConfigure")
    .setEmoji("📝")
    .setLabel("Configurar")
    .setStyle(ButtonStyle.Primary)

export default new Interaction({
    name: "btn_voiceAdeptConfigure",
    builder: builder,
    async run(interaction): Promise<void> {
        if(!interaction.isButton()) return;
        if(!interaction.guild) return;

        const currentConfig = CoalaBase.voiceAdeptRoles.get(interaction.guild.id);

        const modal = new ModalBuilder()
            .setCustomId(interaction.id)
            .setTitle('Configurar cargo')

        /*
        const role = new RoleSelectMenuBuilder()
            .setCustomId("role")
        if(currentConfig)
            role.setDefaultRoles(currentConfig.roleId)
        */

        // TODO: Temporário, pois o discordjs v14.22 ainda não autualizou as modais para suportar select
        const roleIdInput = new TextInputBuilder()
            .setCustomId("role_id")
            .setLabel("ID do Cargo")
            .setPlaceholder(`ID do cargo que será entregue`)
            .setStyle(TextInputStyle.Short)
            .setMinLength(19)
            .setMaxLength(19)
        if(currentConfig)
            roleIdInput.setValue(currentConfig.roleId)

        const expirationDaysInput = new TextInputBuilder()
            .setCustomId("expiration_days")
            .setLabel("Dias para expiração")
            .setPlaceholder(`o cargo será removido ao não participar de chamadas de voz por x dias`)
            .setStyle(TextInputStyle.Short)
            .setMinLength(1)
            .setMaxLength(4)
        if(currentConfig)
            expirationDaysInput.setValue(currentConfig.expirationDays.toString())

        const webhookURLInput = new TextInputBuilder()
            .setCustomId("webhook_url")
            .setLabel("URL da webhook de anúncio")
            .setPlaceholder(`Deixe vazio para desativar`)
            .setStyle(TextInputStyle.Short)
            .setMaxLength(200)
            .setRequired(false)
        if(currentConfig?.announceWebhookURL)
            webhookURLInput.setValue(currentConfig.announceWebhookURL)
        
        /*
        // TODO: Esperar atualização do discord.js e arrumar isso
        const roleRow = {
            type: 18, // Label wrapper
            label: "Selecione o cargo",
            component: role
        }
        */

        const roleRow = new ActionRowBuilder<TextInputBuilder>().addComponents(roleIdInput);
        const expirationRow = new ActionRowBuilder<TextInputBuilder>().addComponents(expirationDaysInput);
        const webhookRow = new ActionRowBuilder<TextInputBuilder>().addComponents(webhookURLInput);

        //@ts-ignore
        modal.addComponents(roleRow, expirationRow, webhookRow);

        await interaction.showModal(modal)
            .catch((error: Error) => console.log(error.message))

        // Process
        
        const submitted = await interaction.awaitModalSubmit({
            filter: (i) => i.user.id === interaction.user.id && i.customId === interaction.id,
            time: 60_000,
        }).catch((error: Error) => {return})

        if(submitted) {
            const reply = await submitted.deferReply({flags: MessageFlags.Ephemeral});

            // Validação de campos
            const roleId = submitted.fields.getTextInputValue("role_id");
            const role = interaction.guild.roles.cache.get(roleId);
            if(!role) {
                await reply.edit(`Não foi possível localizar o cargo ID \`${roleId}.\``);
                return;
            }

            const expiration_days = submitted.fields.getTextInputValue("expiration_days");
            const expiration_days_int = parseInt(expiration_days);
            if(isNaN(expiration_days_int) || expiration_days_int < 1 || expiration_days_int > 9999) {
                await reply.edit(`Para "Dias para expiração", insira um dígito entre \`1\` e \`9999\`.`);
                return;
            }

            let webhook = null;
            const webhook_url = submitted.fields.getTextInputValue("webhook_url");
            const discordWebhookRegex = /^https:\/\/(ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;
            if(webhook_url.length !== 0 && !discordWebhookRegex.test(webhook_url)) {
                await reply.edit(`O endereço de webhook inserido é inválido.`);
                return;
            } else {
                webhook = webhook_url;
            }

            // Processamento
            const newVoiceAdeptRole = new VoiceAdeptRole();
            newVoiceAdeptRole.guildId = interaction.guild.id;
            newVoiceAdeptRole.guildName = interaction.guild.name;
            newVoiceAdeptRole.roleId = roleId;
            newVoiceAdeptRole.roleName = role.name;
            newVoiceAdeptRole.expirationDays = expiration_days_int;
            newVoiceAdeptRole.announceWebhookURL = webhook;

            CoalaBase.voiceAdeptRoles.set( newVoiceAdeptRole.guildId, newVoiceAdeptRole);
            newVoiceAdeptRole.DB_Save();

            // Finalmente
            reply.delete();
            await interaction.followUp(`O cargo ${role} agora é atribuido aos membros que participarem de uma chamada de voz pelo período de 1h00. Após isso, o cargo poderá ser removido se o membro não participar de uma chamada de voz nos próximos ${expiration_days_int} dias.`);
        }
    }
})