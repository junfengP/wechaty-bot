import { config } from "process";
import type { Message } from "wechaty-puppet/payload";
import type PuppetXp from "../../src/puppet-xp";
import type { CustomCommand, CustomCommandWithArgs } from "./cmd.js";
import { botName } from "./constant.js";
import { FilePersistant, Serializable } from "./persistant.js";
import { Utils } from "./utils.js";

const savefile = "study.txt"
const configfile = "study-config.txt"

class StudyDailyData implements Serializable {
    data: Map<string, number>;
    constructor(json: any) {
        this.data = new Map();
        for(var k in json) {
            this.data.set(k, json[k]);
        }
    }
    updateCheck(username: string) {
        this.data.set(username, (this.data.get(username) || 0) + 1);
    }

    getUserCheck(username: string): number {
        return this.data.get(username) || 0;
    }

    toJson(): string {
        // const data_json:{[k:string]: number} = {};
        // for(var k of this.data.keys()) {
        //     data_json[k] = this.data.get(k)!
        // }
        // return JSON.stringify(data_json)
        return JSON.stringify(FilePersistant.converMapToJson(this.data));
    }
}

class StudyConfig implements Serializable {
    config: Map<string, number>;
    constructor(json: any) {
        this.config = new Map();
        for(let k in json) {
            this.config.set(k, json[k]);
        }
    }
    getUserConfig(username:string): number {
        return this.config.get(username) || 1;
    }
    setUserConfig(username:string, no: number) {
        this.config.set(username, no);
    }
    toJson(): string {
        return JSON.stringify(FilePersistant.converMapToJson(this.config));
    }
}

class StudyData implements Serializable {
    data: Map<string, StudyDailyData>;
    constructor(json: any) {
        this.data = new Map();
        for(var d in json) {
            this.data.set(d, new StudyDailyData(JSON.parse(json[d])));
        }
    }
    updateCheck(username: string) {
        const today_str = Utils.getTodayStr();
        let today_data = this.data.get(today_str);
        if(!today_data) {
            today_data = new StudyDailyData({});
            this.data.set(today_str, today_data);
        }
        today_data.updateCheck(username);
    }

    getCheckResult(username: string): number {
        const today_str = Utils.getTodayStr();
        let today_data = this.data.get(today_str);
        if(!today_data) {
            return 0;
        }
        return today_data.getUserCheck(username);
    }
    toJson(): string {
        const json = FilePersistant.converMapToJson(this.data);
        return JSON.stringify(json);
    }
}

class StudyUtils {
    static studyData: StudyData;
    static studyConfig: StudyConfig;
    static loadStudyData() {
        const json = FilePersistant.loadFromFile(savefile);
        this.studyData = new StudyData(json);

        const json2 = FilePersistant.loadFromFile(configfile);
        this.studyConfig = new StudyConfig(json2);
    }

    static saveStudyData() {
        FilePersistant.saveToFile(savefile, this.studyData);
    }
    static saveStudyConfig() {
        FilePersistant.saveToFile(configfile, this.studyConfig);
    }
    static updateCheck(username: string) {
        this.studyData.updateCheck(username);
    }

    static updateConfig(username: string, no: number) {
        this.studyConfig.setUserConfig(username, no);
    }

    static getCheckResult(users: string[]): string{
        const result = users.map((user) => {
            const n = this.studyData.getCheckResult(user);
            return `${user}: ${n}/${this.studyConfig.getUserConfig(user)}`
        }).join("\n");
        return "今日打卡情况\n\n" + result;  
    }

}

export class StudyCheckCommand implements CustomCommand {
    cmdName(): string {
        return "打卡";
    }
    constructor() {
        StudyUtils.loadStudyData();
    }
    async consume(msg: Message, puppet: PuppetXp) {
        const roomId = msg.roomId;
        const fromId = msg.fromId; 

        if(!fromId || ! roomId) {
            console.error(`message error, cmd: ${this.cmdName()} room: ${roomId}, from: ${fromId}`);
            return;
        }
        const user = await puppet.contactPayload(fromId);
        StudyUtils.updateCheck(user.name);
        StudyUtils.saveStudyData();
        await puppet.messageSendText(roomId, "打卡成功");
    }
} 

export class StudyResultCommand implements CustomCommand {
    cmdName(): string {
        return "查看打卡";
    }
    async consume(msg: Message, puppet: PuppetXp) {
        const roomId = msg.roomId;
        if(!roomId) {
            console.error(`message error, cmd: ${this.cmdName()}`)
            return;
        }
        const users = await puppet.roomMemberList(roomId);
        const usernames = new Array();
        await users.forEach(async (user) => {
            const name = (await puppet.contactPayload(user)).name;
            if(name === botName) {
                return;
            }
            usernames.push(name);
        })
        const result = StudyUtils.getCheckResult(usernames);
        await puppet.messageSendText(roomId, result);
    }
}

export class StudyConfigCommand implements CustomCommandWithArgs {
    matchCommand(cmd: string): boolean {
        return cmd.startsWith("设定打卡");
    }
    async consume(msg: Message, puppet: PuppetXp) {
        const fromId = msg.fromId!; 
        const roomId = msg.roomId!;
        const text = msg.text!;
        const no_str = text.split("@")[0].replace("设定打卡", "").trim();
        const no = parseInt(no_str);
        if(isNaN(no)) {
            await puppet.messageSendText(roomId, "参数错误");
            return;
        }
        const user = await puppet.contactPayload(fromId);
        StudyUtils.updateConfig(user.name, no);
        StudyUtils.saveStudyConfig();
        await puppet.messageSendText(roomId, "设定成功");
    }
}