import fs from "fs";
import path from "path";

class Util {
    public static getErrorMessage(error: unknown): string {
        let message: string = "Unknown error";
        if(error instanceof Error) message = error.message;
        return message;
    }

    public static async getCommitHash(): Promise<string>
    {
        return new Promise((resolve, reject) => {
            // Diretório do seu projeto Git
            const repoDir = './';
            
            // Caminho para o arquivo HEAD
            const headFilePath = path.join(repoDir, '.git', 'HEAD');
            
            // Lê o arquivo HEAD
            fs.readFile(headFilePath, 'utf8', (err, data) => {
                if (err) { 
                    resolve("null");
                    return;
                }

                // Obtém a referência ao commit atual do arquivo HEAD
                const headRef = data.trim();
                // Verifica se a referência é direta para um commit (hash)
                const match = headRef.match(/^ref: refs\/heads\/(.*)$/);
                if (match) {
                    // Se a referência for para um branch, precisamos ler o arquivo do branch para obter a hash do commit
                    const branchFilePath = path.join(repoDir, '.git', 'refs', 'heads', match[1]);
                    fs.readFile(branchFilePath, 'utf8', (err, data) => {
                        if (err) { 
                            resolve("null");
                            return;
                        }

                        // Imprime a hash do último commit
                        resolve(data.trim());
                        return;
                    });
                } else {
                    // Se a referência for direta para um commit (hash), imprime a hash diretamente
                    resolve(headRef);
                    return;
                }
            });
        })
    }
}

export default Util;