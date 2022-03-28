import type { Message } from "wechaty-puppet/payload";
import type PuppetXp from "../../src/puppet-xp";
import { FilePersistant, Serializable } from "./persistant.js";


const savefile = "autoreply.txt"
const AUTO_REPLY_MODE_FULL = "full";
const AUTO_REPLY_MODE_PART = "part";
const AUTO_REPLY_MODE_REG = "reg";

const AUTO_REPLY_REPLY_MODE_PLAIN = "plain";
const AUTO_REPLY_REPLY_MODE_TEMPLATE = "template";

class AutoReplyRule implements Serializable{
    keyword: string;
    mode: string;
    mention: boolean;
    creator: string;
    reply_msg: string;
    reply_mode: string;
    constructor(json: any) {
        this.keyword = json["keyword"];
        this.mode = json["mode"] || AUTO_REPLY_MODE_FULL;
        this.mention = json["mention"] || false;
        this.creator = json["creator"] || "";
        this.reply_msg = json["reply_msg"];
        this.reply_mode = json["reply_mode"] || AUTO_REPLY_REPLY_MODE_PLAIN;
    }
    toJson(): string {
        return JSON.stringify(this);
    }
    match(msg: Message): boolean {
        const text = msg.text!.trim();
        var matched = false;
        switch(this.mode) {
            case AUTO_REPLY_MODE_FULL:
                matched = this.keyword === text;
                break;
            case AUTO_REPLY_MODE_PART:
                matched = text.indexOf(this.keyword) != -1;
                break;
            case AUTO_REPLY_MODE_REG:
                const re = new RegExp(this.keyword);
                matched = re.test(text);
                break;
            default:
                throw new Error(`unsupport moe: ${this.mode} in auto reply`);
        }
        return matched;
    }

    getReply(msg: Message): string {
        var replyMsg = "";
        switch(this.reply_mode) {
            case AUTO_REPLY_REPLY_MODE_PLAIN:
                replyMsg = this.reply_msg;
                break;
            case AUTO_REPLY_REPLY_MODE_TEMPLATE:
                // todo
                break;
        }
        return replyMsg;
    }
    mentionUser(): boolean {
        return this.mention;
    }
    
}

class AutoReplyUtils {
    static loadAutoReplyRules(): Array<AutoReplyRule> {
        const values = FilePersistant.loadArrayFromFile(savefile)
        return (values as Array<any>).map((v) => {
            return new AutoReplyRule(v);
        })
    }
}

export class AutoReply {
    rules: Array<AutoReplyRule>;

    constructor() {
        this.rules = AutoReplyUtils.loadAutoReplyRules();
    }
    async process(msg: Message, puppet: PuppetXp) {
        const fromId = msg.fromId; 
        const roomId = msg.roomId;
        if(!fromId && !roomId) {
            return;
        }
        for (const rule of this.rules) {
            if(rule.match(msg)) {
                const reply_msg = rule.getReply(msg);
                const user = await puppet.contactPayload(fromId!);
                const mentionUserStr = rule.mentionUser()? ` @${user.name}` : "";
                await puppet.messageSendText(roomId || fromId!, reply_msg + mentionUserStr);
            }
        }
    }
}