import { randomBytes } from 'crypto';

class Util {
    public static getEndpoints(endpoint: string): string[] {
        return endpoint.split('/');
    }

    public static assembleEndpoints(array: string[]): string {
        return array.join('/');
    }

    public static generateUUID(): string {
        const buf = randomBytes(16);
        buf[6] = (buf[6] & 0x0f) | 0x40; // Definir o 6º byte para '0100' como em uma versão 4 UUID
        buf[8] = (buf[8] & 0x3f) | 0x80; // Definir o 8º byte para '10' como em uma variante RFC4122 UUID
        return buf.toString('hex').match(/.{1,2}/g)!.join('-');
    }

    public static getErrorMessage(error: unknown): string {
        let message: string = "Unknown error";
        if(error instanceof Error) message = error.message;
        return message;
    }
}

export default Util;