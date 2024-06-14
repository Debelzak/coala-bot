import fs from "fs";
import path from "path";

class Util {
    public static getErrorMessage(error: unknown): string {
        let message: string = "Unknown error";
        if(error instanceof Error) message = error.message;
        return message;
    }

    public static getCommitHash(): Promise<string>
    {
        return new Promise((resolve, reject) => {
            const repoDir = './';
            
            const headFilePath = path.join(repoDir, '.git', 'HEAD');
            
            fs.readFile(headFilePath, 'utf8', (err, data) => {
                if (err) { 
                    resolve("null");
                    return;
                }

                const headRef = data.trim();
                const match = headRef.match(/^ref: refs\/heads\/(.*)$/);
                if (match) {
                    const branchFilePath = path.join(repoDir, '.git', 'refs', 'heads', match[1]);
                    fs.readFile(branchFilePath, 'utf8', (err, data) => {
                        if (err) { 
                            resolve("null");
                            return;
                        }

                        resolve(data.trim());
                        return;
                    });
                } else {
                    resolve(headRef);
                    return;
                }
            });
        })
    }
}

export default Util;