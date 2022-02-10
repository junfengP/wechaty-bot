import type { Message } from "wechaty-puppet/payload";
import type PuppetXp from "../../src/puppet-xp";
import type { CustomCommand, CustomCommandWithArgs } from "./cmd.js";
import { botName } from "./constant.js";
import { AbstractCronEvent, CronEvent } from "./cron.js";
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

    static getUncheckUsers(users: string[]): string[] {
        return users.filter((user) => {
            return this.studyData.getCheckResult(user) < this.studyConfig.getUserConfig(user);
        })
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
        for(var i = 0; i < users.length; i++) {
            const u = users[i]!;
            const name = (await puppet.contactPayload(u)).name;
            if(name === botName) {
                continue;
            }
            usernames.push(name);
        }
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
        const no_str = text.split("@")[0]!.replace("设定打卡", "").trim();
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

export class StudyCheckEvents extends AbstractCronEvent {
    roomName: string;
    constructor(json: any) {
        super(json);
        this.roomName = json["roomName"];

    }
    async trigger0(puppet: PuppetXp) {
        const room = await Utils.searchRoomByTopic(puppet, this.roomName);
        if(!room) {
            console.error(`Study Check Event, topic ${this.roomName} not found`);
            return;
        }
        const roomId = room.id;
        const users = room.memberIdList;
        const userMap = new Map<string, string>();

        const usernames = new Array();
        for(var i = 0; i < users.length; i++) {
            const uid = users[i]!;
            const name = (await puppet.contactPayload(uid)).name;
            if(name === botName) {
                continue;
            }
            usernames.push(name);
            userMap.set(name, uid);
        }

        const result = StudyUtils.getCheckResult(usernames);
        await puppet.messageSendText(roomId, result);

        const uncheckUsers = StudyUtils.getUncheckUsers(usernames);
        if(uncheckUsers.length === 0) {
            await puppet.messageSendText(roomId, "今日已全员打卡");
        } else {
            const uncheckUserIds = uncheckUsers.map((username) => {
                return userMap.get(username)!
            })
            uncheckUserIds.forEach(id => console.log(`uncheck id: ${id}`));
            await puppet.messageSendText(roomId, "请完成今日打卡\n@" + uncheckUsers.join(" @"));
            // await puppet.messageSendText(roomId, "请完成今日打卡", uncheckUserIds);
        }
    }
}