import type { RoomPayload } from "wechaty-puppet/dist/esm/src/schemas/room";
import type PuppetXp from "../../src/puppet-xp";

export class Utils {
    static getTodayDate():Date {
        return new Date(Date.now() + 8 * 3600 * 1000)
        // return new Date();
    }
    static getTodayStr():string {
        const d = new Date();
        return `${d.getMonth() + 1}.${d.getDate()}`
    }
    static roomMapCache: Map<string, any> = new Map();

    static async searchRoomByTopic(puppet: PuppetXp, topic: string):Promise<RoomPayload> {
        const cache = this.roomMapCache.get(topic);
        if(cache) {
            return cache;
        }
        const id_list = await puppet.roomList();
        for(var id of id_list) {
            const room = await puppet.roomPayload(id);
            const t = room.topic;
            this.roomMapCache.set(t, room);
        }
        return this.roomMapCache.get(topic);
    }
}