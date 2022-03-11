import type { Message } from "wechaty-puppet/payload";
import type PuppetXp from "../../src/puppet-xp";
import type { CustomCommand } from "./cmd";
import * as constant from "./constant.js";
import { MacuoUtils } from "./macuo.js";



async function updateLucky(msg: Message, puppet: PuppetXp) {
    const roomId = msg.roomId || '';
    const text = msg.text || '';
    const fromId = msg.fromId;
    if(!fromId || ! roomId) {
        console.error(`message error, text: ${text} room: ${roomId}, from: ${fromId}`);
        return;
    }
    const user = await puppet.contactPayload(fromId);
    var reply = "";
    var username = "";
    const args = text.trim().split("@");
    const type = args[0]!.trim();
    if(args.length === 2) {
        username = user.name;
    } else if (args.length === 3) {
        username = args[1]!.trim() === constant.botName ? args[2]!.trim() : args[1]!.trim()
    } else {
        reply = "参数输入错误，使用格式：\n自己更新：具体大牌@bot\n他人更新：具体大牌@他@bot"
        await puppet.messageSendText(roomId, reply);
        return
    }
    MacuoUtils.updateLucky(username, type, type.startsWith("撤销"))
    MacuoUtils.saveDailyRank()
    await puppet.messageSendText(roomId, MacuoUtils.showTodayWinLoseRank())
}

class MacuoLuckyCommand implements CustomCommand  {
    public cmdName(): string {
        return "(撤销)?(金雀|抢金|三金倒|金龙|天胡|金坎|清一色|混一色)";
    }
    async consume(msg: Message, puppet: PuppetXp) {
        await updateLucky(msg, puppet);
    }
}


export {
    MacuoLuckyCommand
}