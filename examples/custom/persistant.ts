
import * as fs from 'fs';

export interface Serializable {
    toJson():string;
}

export class FilePersistant {
    static saveToFile(filename: string, data: Serializable) {
        const str = data.toJson();
        fs.writeFile(filename, str, (err) => {
            if (err) throw err;
        })
    }

    static loadFromFile(filename: string):Object {
        const data = fs.readFileSync(filename).toString();
        if(data === "") {
            return {};
        }
        return JSON.parse(data)
    }
}