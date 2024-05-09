import { Client, GuildMember, ButtonInteraction, VoiceBasedChannel, BaseMessageOptions, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalSubmitInteraction, User, Channel, Guild, Message } from "discord.js"
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

    private buildChannelCache() {
        if(process.env.MANAGED_CHANNELS) {
            const channelIdList: string[] = process.env.MANAGED_CHANNELS.split(" ");
            for(const channelId of channelIdList) {
                const channel: Channel | undefined = this.client.channels.cache.get(channelId);
                if(channel?.isVoiceBased()) { 
                    PartyManager.managedChannels.set(channel.id, channel);
                    this.logger.success(`Gerenciando canal de voz [${channel.name}] no servidor [${channel.guild.name}]`);
                } else {
                    this.logger.warning(`Canal de voz [${channelId}] não encontrado. Ignorando.`)
                    continue;
                }
            }
        }
    }

    private buildPartyCache() {
        // TODO: Necessário para manter registro de parties antigas no caso do programa ser reiniciado ou crashar.
    }

    private initPartyManagement(): void {
        this.buildChannelCache();
        this.buildPartyCache();

        this.client.on('voiceStateUpdate', async (oldVoiceState, newVoiceState) => {
            // Se um membro se conectou/desconectou a um canal.
            if (newVoiceState.channel !== oldVoiceState.channel) {
                if(!newVoiceState.member) return;
                const member: GuildMember = newVoiceState.member;
                const userName: string = (newVoiceState.member.nickname !== null) ? newVoiceState.member.nickname : newVoiceState.member.displayName;
                const partyDefaultName: string = `Party de ${userName}`;

                const partyEntered: Party | undefined = (newVoiceState.channelId) ? PartyManager.parties.get(newVoiceState.channelId) : undefined;
                const partyExited: Party | undefined = (oldVoiceState.channelId) ? PartyManager.parties.get(oldVoiceState.channelId) : undefined;

                if(!member) return;

                if(newVoiceState.channel && PartyManager.managedChannels.get(newVoiceState.channel.id)) { // Se o canal é gerenciado pelo bot.
                    try {
                        const partyCreated = await this.CreateParty(member, partyDefaultName, newVoiceState.channel);
                    } catch(error) {
                        this.logger.error(Util.getErrorMessage(error));
                    }
                }

                if(partyEntered) { // Se conectou a alguma party
                    try {
                        partyEntered.addUser(member);
                        this.logger.success(`${userName} entrou na party [${partyEntered.voiceChannel.name}]. ${partyEntered.connectedUsers} usuários restantes.`);
                    } catch(error) {
                        this.logger.error(Util.getErrorMessage(error));
                    }
                }
                
                if(partyExited) { // Se desconectou de alguma party
                    try {                        
                        partyExited.removeUser(member);
                        this.logger.success(`${userName} saiu da party [${partyExited.voiceChannel.name}]. ${partyExited.connectedUsers} usuários restantes.`);

                        // Transfere a liderança ao sair
                        if(partyExited.currentParticipants.size > 0 && member.user.id === partyExited.ownerId) {
                            const nextLeader = Array.from(partyExited.currentParticipants.entries())[0][0];
                            this.TransferOwnership(nextLeader, partyExited);
                            this.ReloadControlMessage(partyExited);
                        }

                        // Remove party do cache se estiver vazia.
                        if(partyExited.connectedUsers <= 0) {
                            this.logger.success(`Nenhum membro restante em [${partyExited.voiceChannel.name}], excluindo...`);
                            await partyExited.voiceChannel.delete();
                            PartyManager.parties.delete(partyExited.voiceChannel.id);
                        }
                    } catch(error) {
                        this.logger.error(Util.getErrorMessage(error));
                    }
                }
            }
        })
    }

    public async CreateParty(owner: GuildMember, partyName: string, baseChannel: VoiceBasedChannel): Promise<Party | undefined> {
        try {
            const partyVoiceChannel = await baseChannel.clone({name: partyName});
            const party = new Party(owner.id, partyVoiceChannel)
            party.addUser(owner);
            
            PartyManager.parties.set(party.voiceChannel.id, party);
            this.logger.success(`A party [${party.voiceChannel.name}] foi criada por ${owner.user.displayName}`);
            
            // Move criador da party para a mesma.
            await owner.voice.setChannel(partyVoiceChannel);

            // Edita permissões da sala e define limite de usuários.
            if(owner.voice.channelId === party.voiceChannel.id) await party.voiceChannel.permissionOverwrites.edit(party.voiceChannel.guild.roles.everyone, {SendMessages:  true})
            if(owner.voice.channelId === party.voiceChannel.id) await party.voiceChannel.setUserLimit(8);
            
            // Cria mensagem de controle da party
            if(owner.voice.channelId === party.voiceChannel.id) party.controlMessage = await partyVoiceChannel.send(`Party gerenciada por ${partyVoiceChannel.client.user}`);
            if(owner.voice.channelId === party.voiceChannel.id) await this.ReloadControlMessage(party);


            return party;
        } catch (error) {
            this.logger.error(`Falha ao criar a party ${partyName} - ${Util.getErrorMessage(error)}`);
        }
    }

    public async TogglePrivacy(requester: User, party: Party, interaction?: ButtonInteraction | ModalSubmitInteraction): Promise<void> {
        try {
            const isPartyOwner = await this.CheckOwnership(requester, party, interaction);
            if(!isPartyOwner) {
                return;
            }

            party.togglePrivacity();
            party.currentParticipants.forEach((participant) => {
                party.voiceChannel.permissionOverwrites.edit(participant, {Connect:  true});
            })
            
            party.voiceChannel.permissionOverwrites.edit(party.voiceChannel.guild.roles.everyone, {Connect: !party.isPrivate});

            this.logger.success(`A privacidade de [${party.voiceChannel.name}] foi alterada para ${(party.isPrivate) ? "privada" : "pública"}.`);

            if(interaction) {
                this.ReloadControlMessage(party);
                const replyMessage = (party.isPrivate) ? `A party agora é privada e apenas membros com permissão podem participar.`
                                     : `A party agora é pública e qualquer membro pode participar.`
                await interaction.reply({
                    content: replyMessage,
                    ephemeral: false,
                })
            }
            

        } catch(error) {
            this.logger.error(`Falha ao tentar trocar a privacidade de [${party.voiceChannel.name}] - ${Util.getErrorMessage(error)}`);
        }
    }

    public async RenameParty(requester: User, party: Party, newName: string, interaction?: ButtonInteraction | ModalSubmitInteraction): Promise<void> {
        try {
            const oldName = party.voiceChannel.name;
            const isPartyOwner = await this.CheckOwnership(requester, party, interaction);
            if(!isPartyOwner) {
                return;
            }

            await party.rename(`${newName}`);
            this.logger.success(`A party [${oldName}] foi renomeada para [${newName}]`);

            if(interaction) {
                this.ReloadControlMessage(party);
                interaction.reply({
                    content: `${requester} renomeou a party para ${party.voiceChannel}.`,
                    ephemeral: false,
                })
            }

        } catch(error) {
            this.logger.error(`Falha ao tentar renomear a party [${party.voiceChannel.name}] - ${Util.getErrorMessage(error)}`);
        }
    }

    public TransferOwnership(newLeaderId: string, party: Party): boolean {
        const guild: Guild | undefined = this.client.guilds.cache.get(party.voiceChannel.guildId);
        const member = guild?.members.cache.get(newLeaderId);

        if(member) {
            try {
                if(party.changeOwner(member)) {
                    this.logger.success(`A liderança da party [${party.voiceChannel.name}] foi passada para [${member.displayName}].`);
                    party.controlMessage?.reply(`A liderança da party agora é de ${member}`);
                    return true;
                }
            } catch (error) {
                this.logger.warning(`Falha ao transferir a liderança da party [${party.voiceChannel.name}] para [${member.displayName}]. - ${Util.getErrorMessage(error)}`);
            }
        }

        return false;
    }

    public async BanMembers(memberIds: string[], party: Party): Promise<GuildMember[]> {
        let promises: Promise<any>[] = [];
        let result: GuildMember[] = [];

        const guild: Guild | undefined = this.client.guilds.cache.get(party.voiceChannel.guildId);
        if(guild) {
            for(const memberId of memberIds) {
                if(memberId === party.ownerId) continue;
                
                const member = guild.members.cache.get(memberId);
                if(member) {
                    party.denyUserEntrance(member);

                    // Se membro está na party, expulsa.
                    if(party.currentParticipants.get(member.id) === member)
                        promises.push(this.KickMember(member, party));

                    promises.push(party.voiceChannel.permissionOverwrites.edit(member, {Connect:  false}));
                    result.push(member);
                }
            }
        }

        try {
            await Promise.all(promises);
        } catch (error) {
            this.logger.error(`Falha ao banir membros da party [${party.voiceChannel.name}] - ${Util.getErrorMessage(error)}`);
        }

        return result;
    }

    public async AllowMembers(memberIds: string[], party: Party): Promise<GuildMember[]> {
        let promises: Promise<any>[] = [];
        let result: GuildMember[] = [];

        const guild: Guild | undefined = this.client.guilds.cache.get(party.voiceChannel.guildId);
        if(guild) {
            for(const memberId of memberIds) {
                const member = guild.members.cache.get(memberId);
                if(member) {
                    party.allowUserEntrance(member);
                    promises.push(party.voiceChannel.permissionOverwrites.edit(member, {Connect:  true}));
                    result.push(member);
                }
            }
        }

        try {
            await Promise.all(promises);
        } catch (error) {
            this.logger.error(`Falha ao permitir membros na party [${party.voiceChannel.name}] - ${Util.getErrorMessage(error)}`);
        }

        return result;
    }

    public async KickMember(member: GuildMember, party: Party): Promise<void>
    {
        try {
            await member.voice.setChannel(null);
            this.logger.success(`${member.displayName} foi expulso de [${party.voiceChannel.name}]`);
        } catch(error) {
            this.logger.error(`Falha ao remover membro do canal - ${Util.getErrorMessage(error)}`);
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

    private controlMessage(party: Party): BaseMessageOptions {
        let embeds = [];
        let components =  [];

        let bannedMembers: string = (party.bannedParticipants.size > 0) ? "" : "Nenhum"
        let allowedMembers: string = (party.allowedParticipants.size > 0) ? "" : "Nenhum"
        for(const member of party.bannedParticipants) {
            bannedMembers = bannedMembers.concat(`${member[1]} `);
        }

        for(const member of party.allowedParticipants) {
            allowedMembers = allowedMembers.concat(`${member[1]} `);
        }

        const embedMessage = new EmbedBuilder()
            .setColor(0x0099FF)
            .addFields({ name: 'Canal', value: `${party.voiceChannel}`, inline: false})
            .addFields({ name: 'Privacidade', value: `${(party.isPrivate) ? `Privada` : `Pública`}`, inline: false})
            .addFields({ name: 'Líder', value: `${this.client.users.cache.get(party.ownerId)}`, inline: false})
            .addFields({ name: 'Membros Banidos', value: `${bannedMembers}`, inline: true})
            .addFields({ name: 'Membros Permitidos', value: `${allowedMembers}`, inline: true})

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

        const togglePrivacy = new ButtonBuilder()
            .setLabel(`${(party.isPrivate) ? "Tornar Pública" : "Tornar Privada"}`)
            .setStyle(ButtonStyle.Primary)
            .setEmoji(`${(party.isPrivate) ? "🔓" : "🔒"}`)
            .setCustomId("btn_togglePartyPrivacy")

        const banMember = new ButtonBuilder()
            .setCustomId("btn_banPartyMembers")
            .setLabel("Banir Membro")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("➖");

        const allowMember = new ButtonBuilder()
            .setCustomId("btn_allowPartyMembers")
            .setLabel("Permitir Membro")
            .setStyle(ButtonStyle.Success)
            .setEmoji("✅");

        const firstRow = new ActionRowBuilder();
        const secondRow = new ActionRowBuilder();
        const thirdRow = new ActionRowBuilder();

        // First row
        firstRow.addComponents(renameParty);
        firstRow.addComponents(togglePrivacy);
        
        // Second row
        secondRow.addComponents(transferPartyOwnership, banMember);

        // Third row
        thirdRow.addComponents(allowMember);

        embeds.push(embedMessage);
        components.push(firstRow,secondRow);
        if(party.isPrivate || party.bannedParticipants.size > 0) components.push(thirdRow);

        const message : any = {
            embeds: embeds,
            components: components,
        }

        return message;
    }

    public async ReloadControlMessage(party: Party)
    {
        try {
            await party.controlMessage?.edit(this.controlMessage(party));
        } catch(error) {
            this.logger.error(`Falha ao criar mensagem de controle para a party ${party.voiceChannel.name} - ${Util.getErrorMessage(error)}`);
        }
    }

}

export default PartyManager;