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
            const repoDir = './';
            const headFilePath = path.join(repoDir, '.git', 'HEAD');
            
            const headData = fs.readFileSync(headFilePath, 'utf8').trim();
            const match = headData.match(/^ref: refs\/heads\/(.*)$/);
    
            if (match) {
                const branchFilePath = path.join(repoDir, '.git', 'refs', 'heads', match[1]);
                const branchData = fs.readFileSync(branchFilePath, 'utf8').trim();
                return branchData;
            } else {
                return headData;
            }
        } catch (err) {
            return "null";
        }
    }
}

export default Util;