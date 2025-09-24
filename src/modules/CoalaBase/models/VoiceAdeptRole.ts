import sqlite3 from "sqlite3";
const { Database } = sqlite3;

export default class VoiceAdeptRole {
    public guildId : string = '';
    public guildName : string = '';
    public roleId: string = '';
    public roleName: string = '';
    public announceWebhookURL?: string;
    public expirationDays: number = 0;

    private static readonly db: sqlite3.Database = new Database("./database/VoiceAdeptRole.db");

    public static DB_GetAll(): Promise<Map<string, VoiceAdeptRole>> {
        let voiceAdeptRoles = new Map<string, VoiceAdeptRole>();

        return new Promise((resolve, reject) => {
            VoiceAdeptRole.db.each("SELECT * FROM roles", (error: Error, row: VoiceAdeptRole) => {
                let role = new VoiceAdeptRole();
                role.guildId = row.guildId;
                role.roleId = row.roleId;
                role.expirationDays = row.expirationDays;
                role.announceWebhookURL = row.announceWebhookURL;
                voiceAdeptRoles.set(row.guildId, role);
            }, (error: Error, numberOfRows: number) => {
                if(error) {
                    reject(error);
                    return;
                }
                resolve(voiceAdeptRoles)
            })
        })
    }

    public DB_Delete(): void {
        VoiceAdeptRole.db.run(`DELETE FROM roles WHERE guildId=?`, [this.guildId]);
    }

    public DB_Save(): void {
        VoiceAdeptRole.db.get("SELECT * FROM roles WHERE guildId=?", [this.guildId], (err: Error, row: VoiceAdeptRole) => {
            if(row) {
                VoiceAdeptRole.db.run(`UPDATE roles SET guildName=?, roleName=?, expirationDays=?, announceWebhookURL=? WHERE guildId=?`, [this.guildName, this.roleName, this.expirationDays, this.announceWebhookURL, this.guildId])
            } else {
                VoiceAdeptRole.db.run(`INSERT INTO roles (guildId, guildName, roleId, roleName, expirationDays, announceWebhookURL) VALUES (?, ?, ?, ?, ?, ?)`, [this.guildId, this.guildName, this.roleId, this.roleName, this.expirationDays, this.announceWebhookURL])
            }
        })
    }

    public static DB_Initialize(): void {
        VoiceAdeptRole.db.exec(`
            CREATE TABLE IF NOT EXISTS roles
            (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guildId VARCHAR(50) NOT NULL UNIQUE,
                guildName VARCHAR(50) NOT NULL,
                roleId VARCHAR(50) NOT NULL,
                roleName VARCHAR(50) NOT NULL,
                announceWebhookURL VARCHAR(200) NULL,
                expirationDays INTEGER NOT NULL
            );
        `);
    }
}

VoiceAdeptRole.DB_Initialize();