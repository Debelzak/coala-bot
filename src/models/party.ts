import { VoiceBasedChannel, GuildMember, BaseMessageOptions, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";
import {v4 as uuidv4} from "uuid"

class Party
{
    static readonly renameInterval = 5*60*1000;

    public partyId: string;
    public ownerId: string;
    public connectedUsers: number = 0;
    public voiceChannel!: VoiceBasedChannel;
    public participants: GuildMember[] = [];
    public isPrivate: boolean = false;

    private lastRenameTimestamp: number = 0;

    constructor(ownerId: string) {
        this.partyId = uuidv4();
        this.ownerId = ownerId;
    }
    
    public async addUser(member: GuildMember): Promise<void> {
        const currentMember = this.participants.filter((participant) => participant === member);
        const isAlreadyMember: boolean = (currentMember.length > 0);
        if(isAlreadyMember) return;
        
        this.participants.push(member);
        this.connectedUsers++;
    }

    public async removeUser(member: GuildMember): Promise<void> {
        this.participants = this.participants.filter((participant) => participant !== member);
        this.connectedUsers--;

        // Deleta party se vazia.
        if(this.connectedUsers <= 0) {
            await this.voiceChannel.delete();
        }
    }

    public async rename(newName: string): Promise<void> {
        if (this.isRenameable()) {
            await this.voiceChannel.setName(newName);
            this.lastRenameTimestamp = Date.now();
        } else {
            throw new Error('Só é possível alterar o nome da Party uma vez a cada 5 minutos.');
        }
    }

    public isRenameable(): boolean
    {
        const elapsedTimeSinceLastRename = Date.now() - this.lastRenameTimestamp;

        return elapsedTimeSinceLastRename >= Party.renameInterval;
    }

    public getNextRenameTimestamp(): number {
        return this.lastRenameTimestamp + Party.renameInterval;
    }

    public async togglePrivacy(): Promise<void> {
        const newPrivacy: boolean = !this.isPrivate;
        if (newPrivacy) {
            for(const participant of this.participants)
            {
                this.voiceChannel.permissionOverwrites.edit(participant, {Connect:  true});
            }
        }
        await this.voiceChannel.permissionOverwrites.edit(this.voiceChannel.guild.roles.everyone, {Connect: !newPrivacy});
        this.isPrivate = newPrivacy;
    }
}

export default Party;