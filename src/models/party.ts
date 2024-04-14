import { VoiceBasedChannel, GuildMember, Message } from "discord.js";
import {v4 as uuidv4} from "uuid"

class Party
{
    static readonly renameInterval = 5*60*1000;

    public partyId: string;
    public ownerId: string;
    public connectedUsers: number = 0;
    public readonly voiceChannel: VoiceBasedChannel;
    public controlMessage?: Message;
    public currentParticipants: Map<string, GuildMember>;
    public bannedParticipants: Map<string, GuildMember>;
    public allowedParticipants: Map<string, GuildMember>;
    public isPrivate: boolean = false;

    private lastRenameTimestamp: number = 0;

    constructor(ownerId: string, voiceChannel: VoiceBasedChannel) {
        this.partyId = uuidv4();
        this.ownerId = ownerId;
        this.voiceChannel = voiceChannel;
        this.currentParticipants = new Map<string, GuildMember>();
        this.bannedParticipants = new Map<string, GuildMember>();
        this.allowedParticipants = new Map<string, GuildMember>();
    }
    
    public addUser(member: GuildMember): void {
        if(this.currentParticipants.get(member.id)) return;

        this.currentParticipants.set(member.id, member);
        this.connectedUsers++;
    }

    public removeUser(member: GuildMember): void {
        if(!this.currentParticipants.get(member.id)) return;

        this.currentParticipants.delete(member.id);
        this.connectedUsers--;
    }

    public denyUserEntrance(member: GuildMember): void {
        if(member.id === this.ownerId) return;

        this.bannedParticipants.set(member.id, member);
        this.allowedParticipants.delete(member.id);
    }

    public allowUserEntrance(member: GuildMember): void {
        if(member.id === this.ownerId) return;

        this.allowedParticipants.set(member.id, member);
        this.bannedParticipants.delete(member.id);
    }

    public async rename(newName: string): Promise<void> {
        if (this.isRenameable()) {
            await this.voiceChannel.setName(newName);
            this.lastRenameTimestamp = Date.now();
        } else {
            throw new Error('Só é possível alterar o nome da Party uma vez a cada 5 minutos.');
        }
    }

    public togglePrivacity() {
        const newPrivacy: boolean = !this.isPrivate;
        if (newPrivacy === true) {
            this.currentParticipants.forEach((participant) => {
                this.allowUserEntrance(participant);
            })
        }

        this.isPrivate = newPrivacy;
    }

    public isRenameable(): boolean
    {
        const elapsedTimeSinceLastRename = Date.now() - this.lastRenameTimestamp;

        return elapsedTimeSinceLastRename >= Party.renameInterval;
    }

    public changeOwner(participant: GuildMember): boolean {
        if(!this.currentParticipants.get(participant.id)) {
            throw new Error("Tentativa de passar a liderança para alguém que atualmente não é membro da party.")
        }

        this.ownerId = participant.id;
        return true;
    }

    public getNextRenameTimestamp(): number {
        return this.lastRenameTimestamp + Party.renameInterval;
    }
}

export default Party;