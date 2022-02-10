import type { CustomCommand, CustomCommandWithArgs } from "./cmd.js";
import type { Message } from "wechaty-puppet/payload";
import type PuppetXp from "../../src/puppet-xp";
import { got } from "got";

class WeiboUtils {
    static async fetchWeiboHotBand():Promise<string> {
        const response = await got({
            method: 'get',
            url: 'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot&title=%E5%BE%AE%E5%8D%9A%E7%83%AD%E6%90%9C&extparam=filter_type%3Drealtimehot%26mi_cid%3D100103%26pos%3D0_0%26c_type%3D30%26display_time%3D1540538388&luicode=10000011&lfid=231583',
            headers: {
                Referer: 'https://s.weibo.com/top/summary?cate=realtimehot',
                'MWeibo-Pwa': 1,
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
            },
        });

        const hotBand = JSON.parse(response.body).data.cards[0].card_group
        .slice(1, 30)
        .filter((item: { promotion: any; }) => item.promotion === undefined)
        .map((item: { desc: any; }, index: number) => {
            return `${index + 1}、${item.desc}`;
        }).slice(0, 20).join("\n");

        return "以下是当前的微博热搜哦~\n\n" + hotBand;
    }
}

export class WeiboHotBand implements CustomCommand {
    cmdName(): string {
        return "微博热搜";
    }
    async consume(msg: Message, puppet: PuppetXp) {
        const roomId = msg.roomId!;
        await puppet.messageSendText(roomId, await WeiboUtils.fetchWeiboHotBand());
    }

}