import { Client, GuildMember, ButtonInteraction, VoiceBasedChannel, BaseMessageOptions, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalSubmitInteraction, User } from "discord.js"
import Party from "../models/party";
import Util from "../util/utils";
import Module from "../models/module";

class PartyManager extends Module {
    public static readonly parties: Map<string, Party> = new Map<string, Party>();
    public static readonly managedChannels: Map<string, VoiceBasedChannel> = new Map<string, VoiceBasedChannel>();

    constructor(client: Client) {
        super(client);
    }

    init(): void {
        super.init();
        this.initPartyManagement();
    }

    private initPartyManagement(): void {
        const channelIdToManage = "1225177015645372508";

        this.logger.success(`Gerenciando canal de voz ${channelIdToManage}`);
        this.client.on('voiceStateUpdate', async (oldVoiceState, newVoiceState) => {
            // Se um membro se conectou/desconectou a um canal
            if (newVoiceState.channel !== oldVoiceState.channel) {                
                const member: GuildMember = newVoiceState.member!;
                const userName: string = member.user.displayName;
                const partyDefaultName: string = `🚪Party de ${userName}`;

                const partyEntered: Party | undefined = (newVoiceState.channelId) ? PartyManager.parties.get(newVoiceState.channelId) : undefined;
                const partyExited: Party | undefined = (oldVoiceState.channelId) ? PartyManager.parties.get(oldVoiceState.channelId) : undefined;

                if(newVoiceState.channel && newVoiceState.channel.id === channelIdToManage) { // Se o canal é gerenciado pelo bot cria party e move usuário
                    try {
                        await this.CreateParty(member, partyDefaultName, newVoiceState.channel);
                    } catch(error) {
                        this.logger.error(Util.getErrorMessage(error));
                    }
                }

                if(partyEntered) { // Se conectou a alguma party
                    try {
                        await partyEntered.addUser(member);
                        this.logger.success(`${userName} entrou na party [${partyEntered.voiceChannel.name}]. ${partyEntered.connectedUsers} usuários conectados.`);
                    } catch(error) {
                        this.logger.error(Util.getErrorMessage(error));
                    }
                }
                else if(partyExited) {// Se desconectou de alguma party
                    try {
                        await partyExited.removeUser(member);
                        this.logger.success(`${userName} saiu da party [${partyExited.voiceChannel.name}]. ${partyExited.connectedUsers} usuários conectados.`);
                        // Remove party da lista se estiver vazia.
                        if(partyExited.connectedUsers <= 0) {
                            this.logger.success(`Nenhum membro restante em [${partyExited.voiceChannel.name}], excluindo...`);
                            PartyManager.parties.delete(partyExited.voiceChannel.id);
                        }
                    } catch(error) {
                        Util.getErrorMessage(error);
                    }
                }
            }
        })
    }

    private controlMessage(party: Party): BaseMessageOptions {
        const embedMessage = new EmbedBuilder()
            .setColor(0x0099FF)
            .addFields(
                { name: 'Canal', value: `${party.voiceChannel}`, inline: false},
                { name: 'Privacidade', value: `${(party.isPrivate) ? `Privada` : `Pública`}`, inline: false},
                { name: 'Líder', value: `${this.client.users.cache.get(party.ownerId)}`, inline: false},
            )

        // Define botões e dados vinculados a eles.
        const renameParty = new ButtonBuilder()
            .setLabel("Renomear")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("📝")
            .setCustomId("btn_renameParty")
    
        const transferPartyOwnership = new ButtonBuilder()
            .setLabel("Transferir Líder")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("👑")
            .setCustomId("btn_transferPartyOwnership")

        const lockParty = new ButtonBuilder()
            .setLabel("Tornar Privada")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🔒")
            .setCustomId("btn_lockParty")

        const unlockParty = new ButtonBuilder()
            .setLabel("Tornar Pública")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🔒")
            .setCustomId("btn_unlockParty")

        const kickMember = new ButtonBuilder()
            .setCustomId("tt/kickMember")
            .setLabel("Chutar Membro")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🦶🏻");

        const banMember = new ButtonBuilder()
            .setCustomId("tt/banMember")
            .setLabel("Banir Membro")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("➖");

        const allowMember = new ButtonBuilder()
            .setCustomId("tt/allowMember")
            .setLabel("Permitir Membro")
            .setStyle(ButtonStyle.Success)
            .setEmoji("✅");

        const firstRow = new ActionRowBuilder();
        const secondRow = new ActionRowBuilder();
        const thirdRow = new ActionRowBuilder();

        // First row
        firstRow.addComponents(renameParty);
        (party.isPrivate) ? firstRow.addComponents(unlockParty) : firstRow.addComponents(lockParty);
        
        // Second row
        secondRow.addComponents(transferPartyOwnership, kickMember);

        // Third row
        thirdRow.addComponents(banMember);
        if(party.isPrivate) thirdRow.addComponents(allowMember);

        const message : any = {
            embeds: [embedMessage],
            components: [firstRow, secondRow, thirdRow],
        }

        return message;
    }

    public async CreateParty(owner: GuildMember, partyName: string, baseChannel: VoiceBasedChannel): Promise<Party | undefined> {
        try {
            const party = new Party(owner.id);

            party.voiceChannel = await baseChannel.clone({name: partyName});
            party.voiceChannel.permissionOverwrites.edit(party.voiceChannel.guild.roles.everyone, {SendMessages:  true})
            party.voiceChannel.setUserLimit(8);

            PartyManager.parties.set(party.voiceChannel.id, party);
            this.logger.success(`A party [${party.voiceChannel.name}] foi criada por ${owner.user.displayName}`);
    
            // Adiciona mensagem do bot para controlar canal através de interações por botões
            const controlMessage = await party.voiceChannel.send(`Party gerenciada por ${party.voiceChannel.client.user}`);
            controlMessage.edit(this.controlMessage(party));
    

            await owner.voice.setChannel(party.voiceChannel);

            return party;
        } catch (error) {
            this.logger.error(`Falha ao criar a party ${partyName} - ${Util.getErrorMessage(error)}`);
        }
    }

    public async LockParty(requester: User, party: Party, interaction?: ButtonInteraction | ModalSubmitInteraction): Promise<void> {
        try {
            const isPartyOwner = await this.CheckOwnership(requester, party, interaction);
            if(!isPartyOwner) {
                return;
            }

            await party.togglePrivacy();
            this.logger.success(`A party [${party.voiceChannel.name}] foi trancada.`);

            if(interaction) {
                interaction.message?.edit(this.controlMessage(party));
                await interaction.reply({
                    content: `A party agora é privada e apenas membros com permissão podem entrar.`,
                    ephemeral: false,
                })
            }
            

        } catch(error) {
            this.logger.error(`Falha ao tentar trancar a party [${party.voiceChannel.name}] - ${Util.getErrorMessage(error)}`);
        }
    }

    public async UnlockParty(requester: User, party: Party, interaction?: ButtonInteraction | ModalSubmitInteraction): Promise<void> {
        try {
            const isPartyOwner = await this.CheckOwnership(requester, party, interaction);
            if(!isPartyOwner) {
                return;
            }

            await party.togglePrivacy();
            this.logger.success(`A party [${party.voiceChannel.name}] agora é pública.`);

            if(interaction) {
                interaction.message?.edit(this.controlMessage(party));
                await interaction.reply({
                    content: `A party agora é pública.`,
                    ephemeral: false,
                })
            }
            

        } catch(error) {
            this.logger.error(`Falha ao tentar destrancar a party [${party.voiceChannel.name}] - ${Util.getErrorMessage(error)}`);
        }
    }

    public async RenameParty(requester: User, party: Party, newName: string, interaction?: ButtonInteraction | ModalSubmitInteraction): Promise<void> {
        try {
            const oldName = party.voiceChannel.name;
            const isPartyOwner = await this.CheckOwnership(requester, party, interaction);
            if(!isPartyOwner) {
                return;
            }

            await party.rename(newName);
            this.logger.success(`A party [${oldName}] foi renomeada para [${newName}]`);

            if(interaction) {
                interaction.message?.edit(this.controlMessage(party));
                await interaction.reply({
                    content: `${requester} renomeou a party para ${party.voiceChannel}.`,
                    ephemeral: false,
                })
            }

        } catch(error) {
            this.logger.error(`Falha ao tentar renomear a party [${party.voiceChannel.name}] - ${Util.getErrorMessage(error)}`);
        }
    }

    public async CheckOwnership(user: User, party: Party, interaction?: ButtonInteraction | ModalSubmitInteraction): Promise<boolean> {
        // Check if interaction user is owner of the party
        if(party.ownerId !== user.id) {
            if(interaction) {
                await interaction.reply({
                    content: `Apenas o líder da party pode realizar esta ação!`,
                    ephemeral: true,
                })
            }
            return false;
        }

        return true;
    }

}

export default PartyManager;