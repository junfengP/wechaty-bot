import type * as PUPPET   from 'wechaty-puppet'
import type {
    PuppetXp,
  }               from '../../src/mod.js'

export interface CustomCommand {
    cmdName():string;
    consume(msg: PUPPET.payload.Message, puppet: PuppetXp): any;
}

export class HelpCommand implements CustomCommand{
    cmdName(): string {
        return "帮助";
    }
    async consume(msg: PUPPET.payload.Message, puppet: PuppetXp){
        const {
            fromId,
            roomId,
          } = msg;
          await puppet.messageSendText(roomId! || fromId!, hint)
    }


}

const hint = `输赢榜使用规则如下：
1. 更新榜单
大赢家：哈哈哈@大输家们@我
大输家：气死了@大赢家们@我
其他人：@大赢家们@我@大输家们

2. 撤销更新
完整命令前缀加上“撤销”二字
如：撤销哈哈哈@大输家@我

3. 查看榜单
榜单@我
`
