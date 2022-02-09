
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
        try {
            const data = fs.readFileSync(filename).toString();
            if(data === "") {
                return {};
            }
            return JSON.parse(data)
        } catch(error) {
            console.log(`load config ${filename} failed, err: ${error}`)
            return {};
        }
        
    }
    static converMapToJson(m: Map<string, any>):Object {
        const data_json:{[k:string]: any} = {};
        for(var k of m.keys()) {
            const v = m.get(k)!;
            if(v instanceof Map) {
                data_json[k] = this.converMapToJson(v);
            } else if (v.toJson) {
                data_json[k] = v.toJson();
            } else {
                data_json[k] = v;
            }
        }
        return data_json;
    }
}