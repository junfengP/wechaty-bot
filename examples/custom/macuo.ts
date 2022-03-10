import type { Message } from "wechaty-puppet/payload";
import type PuppetXp from "../../src/puppet-xp";
import type { CustomCommand } from "./cmd";
import * as constant from "./constant.js";
import { FilePersistant, Serializable } from "./persistant.js";
import { Utils } from "./utils.js";

const savefile = "dailyrank.txt"

class MacuoPersonData implements Serializable {
    cnt_win: number;
    cnt_lose: number;

    constructor(json: any) {
        this.cnt_win = json.cnt_win || 0;
        this.cnt_lose = json.cnt_lose || 0;
    }
    updateWinLose(win: boolean, undo=false) {
        if(win) {
            this.cnt_win += undo ? -1 : 1;
        } else {
            this.cnt_lose += undo ? -1 : 1;
        }
    }
    merge(data: MacuoPersonData) {
        this.cnt_win += data.cnt_win
        this.cnt_lose += data.cnt_lose
    }

    clone(): MacuoPersonData {
        return new MacuoPersonData(this.toJson())
    }

    toJson():string{
        return JSON.stringify(this);
    }
}

class MacuoDailyData implements Serializable {
    user_data: Map<string, MacuoPersonData>;
    cnt: number;
    constructor(json: any) {
        this.cnt = json["cnt"] || 0;
        const data_json = json["user_data"] || {};
        this.user_data = new Map();
        for(var k in data_json) {
            this.user_data.set(k, new MacuoPersonData(JSON.parse(data_json[k])))
        }
    }
    updateWinLose(username: string, win: boolean, undo: boolean) {
        let personData = this.user_data.get(username);
        if(!personData) {
            personData = new MacuoPersonData({})
            this.user_data.set(username, personData);
        }
        personData.updateWinLose(win, undo);
    }
    toJson(): string {
        const data_json:{[k:string]: any} = {};
        for(var un of this.user_data.keys()) {
            const pd = this.user_data.get(un);
            data_json[un] = pd!.toJson();
        }
        const json:{[k:string]: any} = {};
        json["user_data"] = data_json;
        json["cnt"] = this.cnt;
        return JSON.stringify(json)
    }

    merge(data: MacuoDailyData) {
        this.cnt += data.cnt
        for(var v of this.user_data) {
            const un = v[0];
            const d = v[1];
            if(data.user_data.has(un)) {
                d.merge(data.user_data.get(un)!)
            }
        }
        for(var v of data.user_data) {
            const un = v[0];
            const d = v[1];
            if(!this.user_data.has(un)) {
                this.user_data.set(un, d.clone())
            }
        }
    }

    clone(): MacuoDailyData{
        return new MacuoDailyData(this.toJson())
    }

    toArray(): Array<any> {
        let result = new Array();
        for(var v of this.user_data) {
            const un = v[0];
            const d = v[1];
            const a = [un, d!.cnt_win, d!.cnt_lose];
            result.push(a);
        }
        result = result.sort(function(a: Array<any>, b: Array<any>):number {
            return a[1] != b[1]? b[1] - a[1] : a[2] - b[2];
        })
        return result;
    }
}

class MacuoData implements Serializable {
    dailyRank = new Map<string, MacuoDailyData>();

    constructor(json: any) {
        for(var k in json) {
            this.dailyRank.set(k, new MacuoDailyData(JSON.parse(json[k])));
        }
    }
    toJson(): string {
        const json:{[k:string]: any} = {};
        for(var date of this.dailyRank.keys()) {
            json[date] = this.dailyRank.get(date)!.toJson()
        }
        return JSON.stringify(json);

    }

}

class MacuoUtils {
    static data: MacuoData;

    static loadDailyRank() {
        const json = FilePersistant.loadFromFile(savefile);
        this.data = new MacuoData(json);
    }

    static saveDailyRank() {
        FilePersistant.saveToFile(savefile, this.data);
    }

    static updateWinLose(username: string, win: boolean, undo: boolean):void {
        const todayStr = Utils.getTodayStr();
        let dailyData = this.data.dailyRank.get(todayStr);
        if(!dailyData) {
            dailyData = new MacuoDailyData({});
            this.data.dailyRank.set(todayStr, dailyData);
        }
        dailyData.updateWinLose(username, win, undo);
    }

    static updateDailyCount(undo: boolean): void {
        const todayStr = Utils.getTodayStr();
        let dailyData = this.data.dailyRank.get(todayStr);
        if(!dailyData) {
            dailyData = new MacuoDailyData({});
            this.data.dailyRank.set(todayStr, dailyData);
        }
        dailyData.cnt += undo ? -1 : 1;
    }

    static showTodayWinLoseRank():string {
        const dateKey = Utils.getTodayStr();
        const data = this.data.dailyRank.get(dateKey);
        const prefix = `${dateKey}-输赢榜\n`
        if(!data) {
            return  prefix + "今日还没有数据哦~"
        }
        const dataArr = data.toArray();
        let showStr = dataArr.filter((v)=> {
            return v[1] != 0 || v[2] != 0;
        }).map((v) => `${v[0]}: +${v[1]} -${v[2]}`).join("\n")

        let bestVal = 0;
        let worstVal = 0;
        dataArr.forEach( (v) => {
            if(v[1] > bestVal) {
                bestVal = v[1];
            }
            if(v[2] > worstVal) {
                worstVal = v[2];
            }
        });
        const bestUser = new Array<string>();
        const worstUser = new Array<string>();
        dataArr.forEach((v) => {
            if(v[1] === bestVal) {
                bestUser.push(v[0]);
            }
            if(v[2] === worstVal) {
                worstUser.push(v[0]);
            }
        })
        if(bestVal > 0) {
            showStr += `\n\n当前最旺: ${bestUser.join(" ")}`
        }
        if(worstVal > 0) {
            showStr +=  `\n当前最霉: ${worstUser.join(" ")}`
        }
        if(data.cnt > 0) {
            showStr += `\n今日局数：${data.cnt}`
        }
        return prefix + showStr;
    }

    static showCurMonthWinLostRank():string {
        const todayKey = Utils.getTodayStr();
        const data = this.data.dailyRank.has(todayKey) ? this.data.dailyRank.get(todayKey)!.clone() : new MacuoDailyData({});
    
        const d = new Date();
        const monthStr = `${d.getMonth() + 1}`
        for(var date of this.data.dailyRank.keys()) {
            if (date === todayKey) {
                continue
            }
            if(!date.startsWith(monthStr + ".")) {
                continue
            }
            data.merge(this.data.dailyRank.get(date)!)
        }

        if(data.cnt === 0 ) {
            return "本月还没有麻将数据，请大家积极一点！"
        }

        const prefix = `${monthStr}月-输赢榜\n`
        const dataArr = data.toArray();
        let showStr = dataArr.filter((v)=> {
            return v[1] != 0 || v[2] != 0;
        }).slice(0, 10).map((v) => `${v[0]}: +${v[1]} -${v[2]}`).join("\n")

        let bestVal = 0;
        let worstVal = 0;
        dataArr.forEach( (v) => {
            if(v[1] > bestVal) {
                bestVal = v[1];
            }
            if(v[2] > worstVal) {
                worstVal = v[2];
            }
        });
        const bestUser = new Array<string>();
        const worstUser = new Array<string>();
        dataArr.forEach((v) => {
            if(v[1] === bestVal) {
                bestUser.push(v[0]);
            }
            if(v[2] === worstVal) {
                worstUser.push(v[0]);
            }
        })
        if(bestVal > 0) {
            showStr += `\n\n本月最旺: ${bestUser.join(" ")}`
        }
        if(worstVal > 0) {
            showStr +=  `\n本月最霉: ${worstUser.join(" ")}`
        }
        if(data.cnt > 0) {
            showStr += `\n本月局数：${data.cnt}`
        }
        return prefix + showStr;
    }

    static showCurYearWinLostRank():string {
        const todayKey = Utils.getTodayStr();
        const data = this.data.dailyRank.has(todayKey) ? this.data.dailyRank.get(todayKey)!.clone() : new MacuoDailyData({});
    
        for(var date of this.data.dailyRank.keys()) {
            if (date === todayKey) {
                continue
            }
            data.merge(this.data.dailyRank.get(date)!)
        }

        if(data.cnt === 0 ) {
            return "本月还没有麻将数据，请大家积极一点！"
        }

        const prefix = `年度-输赢榜\n`
        const dataArr = data.toArray();
        let showStr = dataArr.filter((v)=> {
            return v[1] != 0 || v[2] != 0;
        }).slice(0, 10).map((v) => `${v[0]}: +${v[1]} -${v[2]}`).join("\n")

        let bestVal = 0;
        let worstVal = 0;
        dataArr.forEach( (v) => {
            if(v[1] > bestVal) {
                bestVal = v[1];
            }
            if(v[2] > worstVal) {
                worstVal = v[2];
            }
        });
        const bestUser = new Array<string>();
        const worstUser = new Array<string>();
        dataArr.forEach((v) => {
            if(v[1] === bestVal) {
                bestUser.push(v[0]);
            }
            if(v[2] === worstVal) {
                worstUser.push(v[0]);
            }
        })
        if(bestVal > 0) {
            showStr += `\n\n今年最旺: ${bestUser.join(" ")}`
        }
        if(worstVal > 0) {
            showStr +=  `\n今年最霉: ${worstUser.join(" ")}`
        }
        if(data.cnt > 0) {
            showStr += `\n今年局数：${data.cnt}`
        }
        return prefix + showStr;
    }
}

class MacuoWinLoseCommand implements CustomCommand  {
    constructor() {
        MacuoUtils.loadDailyRank()
    }
    public cmdName(): string {
        return "更新";
    }
    async consume(msg: Message, puppet: PuppetXp) {
        const roomId = msg.roomId || '';
        const text = msg.text || '';

        const args = text.trim().split("@");
        let botIdx = 1;
        for(var i = 1; i < args.length; i++) {
            if(args[i]!.trim() === constant.botName) {
                botIdx = i;
                break;
            }
        }
        if (botIdx === 1 || botIdx === args.length - 1) {
            await puppet.messageSendText(roomId, `args error: ${text}`)
            return;
        }
        for(var i = 1; i < botIdx; i++) {
            MacuoUtils.updateWinLose(args[i]!.trim(), true, false);
        }
        for(var i = botIdx + 1; i < args.length; i++) {
            MacuoUtils.updateWinLose(args[i]!.trim(), false, false);
        }
        MacuoUtils.updateDailyCount(false);
        MacuoUtils.saveDailyRank()
        await puppet.messageSendText(roomId, MacuoUtils.showTodayWinLoseRank())
    }
}

class MacuoUndoWinLoseCommand implements CustomCommand  {
    constructor() {
        MacuoUtils.loadDailyRank()
    }
    public cmdName(): string {
        return "撤销";
    }
    async consume(msg: Message, puppet: PuppetXp) {
        const roomId = msg.roomId || '';
        const text = msg.text || '';

        const args = text.trim().split("@");
        let botIdx = 1;
        for(var i = 1; i < args.length; i++) {
            if(args[i]!.trim() === constant.botName) {
                botIdx = i;
                break;
            }
        }
        if (botIdx === 1 || botIdx === args.length - 1) {
            await puppet.messageSendText(roomId, `args error: ${text}`)
            return;
        }
        for(var i = 1; i < botIdx; i++) {
            MacuoUtils.updateWinLose(args[i]!.trim(), true, true);
        }
        for(var i = botIdx + 1; i < args.length; i++) {
            MacuoUtils.updateWinLose(args[i]!.trim(), false, true);
        }
        MacuoUtils.updateDailyCount(true);
        MacuoUtils.saveDailyRank()
        await puppet.messageSendText(roomId, MacuoUtils.showTodayWinLoseRank())
    }
}

class MacuoWinLoseRankCommand implements CustomCommand {
    cmdName(): string {
        return "榜单";
    }
    async consume(msg: Message, puppet: PuppetXp) {
        const roomId = msg.roomId || '';
        await puppet.messageSendText(roomId, MacuoUtils.showTodayWinLoseRank())
    }

}

class MacuoMonthlyRankCommand implements CustomCommand {
    cmdName(): string {
        return "月度榜单";
    }
    async consume(msg: Message, puppet: PuppetXp) {
        const roomId = msg.roomId || '';
        await puppet.messageSendText(roomId, MacuoUtils.showCurMonthWinLostRank())
    }
}

class MacuoYearlyRankCommand implements CustomCommand {
    cmdName(): string {
        return "年度榜单";
    }
    async consume(msg: Message, puppet: PuppetXp) {
        const roomId = msg.roomId || '';
        await puppet.messageSendText(roomId, MacuoUtils.showCurYearWinLostRank())
    }
}

export {
    MacuoWinLoseCommand, 
    MacuoWinLoseRankCommand, 
    MacuoUndoWinLoseCommand,
    MacuoMonthlyRankCommand,
    MacuoYearlyRankCommand
}