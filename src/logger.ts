class Logger {
    private readonly source: string;
    public static silent: boolean = false;

    constructor(source: string) {
        this.source = source;
    }

    public error(message : string) {
        console.log(`[\x1b[31mFALHA!\x1b[0m]\x1b[34m[${this.getDate()}]\x1b[0m\x1b[36m[${this.source}]\x1b[0m ${message}`);
    }

    public success(message : string) {
        if(!Logger.silent) console.log(`[ \x1b[32mINFO\x1b[0m ]\x1b[34m[${this.getDate()}]\x1b[0m\x1b[36m[${this.source}]\x1b[0m ${message}`);
    }

    public warning(message : string) {
        console.log(`[ \x1b[33mWARN\x1b[0m ]\x1b[34m[${this.getDate()}]\x1b[0m\x1b[36m[${this.source}]\x1b[0m ${message}`);
    }

    private getDate(): string {
        const date: Date = new Date(Date.now());
        
        const padZero = (num: number): string => {
            return num < 10 ? `0${num}` : `${num}`;
        };
    
        const hours = padZero(date.getHours());
        const minutes = padZero(date.getMinutes());
        const seconds = padZero(date.getSeconds());
        
        return `${hours}:${minutes}:${seconds}`;
    }
}

export default Logger;