import fs from "fs";
import path from "path";

class Util {
    public static getErrorMessage(error: unknown): string {
        let message: string = "Unknown error";
        if(error instanceof Error) message = error.message;
        return message;
    }

    public static getCommitHash(): string {
        try {
            const filePath = path.join('./', 'dist', 'VERSION');
            const headData = fs.readFileSync(filePath, 'utf8').trim();
    
            if (headData) {
                return headData;
            } else {
                return "unknown";
            }
        } catch (err) {
            return "unknown";
        }
    }
}

export default Util;