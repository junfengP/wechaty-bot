import type * as PUPPET   from 'wechaty-puppet'

 import {
   PuppetXp,
 }               from '../../src/mod.js'
import { CustomCommand, CustomCommandWithArgs, HelpCommand } from './cmd.js'
import * as constant from './constant.js'
import type { CronEvent } from './cron.js'
import { MacuoUndoWinLoseCommand, MacuoWinLoseCommand, MacuoWinLoseRankCommand, MacuoMonthlyRankCommand, MacuoYearlyRankCommand } from './macuo.js'
import { StudyCheckCommand, StudyCheckEvents, StudyConfigCommand, StudyResultCommand } from './study.js'
import { Utils } from './utils.js'
import { WeatherReportEvent } from './weather.js'
import { WeiboHotBand } from './weibo.js'
 
 /**
  *
  * 1. Declare your Bot!
  *
  */
 const puppet = new PuppetXp()
 const botRe = new RegExp(`@${constant.botName}`)
 
 /**
  *
  * 2. Register event handlers for Bot
  *
  */
 
 puppet
   .on('logout', onLogout)
   .on('login',  onLogin)
   .on('scan',   onScan)
   .on('error',  onError)
   .on('message', onMessage)
 
 /**
  *
  * 3. Start the bot!
  *
  */
 puppet.start()
   .catch(async e => {
     console.error('Bot start() fail:', e)
     await puppet.stop()
     process.exit(-1)
   })
 
 /**
  *
  * 4. You are all set. ;-]
  *
  */
 
 /**
  *
  * 5. Define Event Handler Functions for:
  *  `scan`, `login`, `logout`, `error`, and `message`
  *
  */
 function onScan (payload: PUPPET.payloads.EventScan) {
   if (payload.qrcode) {
     const qrcodeImageUrl = [
       'https://wechaty.js.org/qrcode/',
       payload.qrcode,
     ].join('')
     console.info(`[${payload.status}] ${qrcodeImageUrl}\nScan QR Code above to log in: `)
   } else {
     console.info(`[${payload.status}]`)
   }
 }
 
 function onLogin (payload: PUPPET.payloads.EventLogin) {
   console.info(`${payload.contactId} login`)
 }
 
 function onLogout (payload: PUPPET.payloads.EventLogout) {
   console.info(`${payload.contactId} logouted`)
 }
 
 function onError (payload: PUPPET.payloads.EventError) {
   console.error('Bot error:', payload.data)
   /*
   if (bot.logonoff()) {
     bot.say('Wechaty error: ' + e.message).catch(console.error)
   }
   */
 }
 
 /**
  *
  * 6. The most important handler is for:
  *    dealing with Messages.
  *
  */
 async function onMessage ({
   messageId,
 }: PUPPET.payloads.EventMessage) {
   const msg = await puppet.messagePayload(messageId);

   const fromId = msg.fromId || '';
   const roomId = msg.roomId || '';
   const text = msg.text || '';

   
   if(fromId === '') {
       return;
   }
   const user = await puppet.contactPayload(fromId);
   let logStr = `fromId: ${fromId}, from: ${user.name}, text: ${text}`;
   if(roomId != '') {
       const room = await puppet.roomPayload(roomId);
       logStr = `roomId: ${roomId}, room: ${room.topic}, ` + logStr;
   }
   console.log(logStr)
   if(botRe.test(text)) {
        // contains @bot
        const args = text.trim().split("@");
        if(args.length <= 0) {
                console.error(`wrong input: ${text}`)
        }
        let cmdKey = args[0];
        if(cmdKey === "" && args.length === 2) {
            cmdKey = "帮助";
        }
        if(cmdKey === "" && args.length >= 4) {
            cmdKey = "更新"
        }
        const cmd = cmdMap.get(cmdKey!);

        if(cmd) {
          await cmd.consume(msg, puppet);
          return; 
        }
        let found = false;
        cmdArr.forEach((cmd) => {
            if(cmd.matchCommand(cmdKey!)) {
                found = true;
                cmd.consume(msg, puppet);
            }
        })
        if(!found) {
            const hint = `cmd not found: ${cmdKey}`;
            console.log(hint)
            const hintToUser = hint.length > 20 ? hint.substring(0, 20) + "..." : hint;
            await puppet.messageSendText(roomId! || fromId!, hintToUser);
        }
        
   } else {
        // no @bot
   }



 
//    if (/ding/i.test(text || '')) {
//      await puppet.messageSendText(roomId! || fromId!, 'dong')
//    }
 }
 
 /**
  *
  * 7. Output the Welcome Message
  *
  */
 const welcome = `
 Puppet Version: ${puppet.version()}
 
 Please wait... I'm trying to login in...
 
 `
 console.info(welcome)
 console.info(Utils.getTodayDate())

 /**
  * 8. assemble commands
  */

 function initCmdMap(m: Map<string, any>) {
    initCmdMap0(m, new MacuoWinLoseCommand());
    initCmdMap0(m, new HelpCommand());
    initCmdMap0(m, new MacuoWinLoseRankCommand());
    initCmdMap0(m, new MacuoUndoWinLoseCommand());
    initCmdMap0(m, new MacuoMonthlyRankCommand());
    initCmdMap0(m, new MacuoYearlyRankCommand());
    initCmdMap0(m, new StudyCheckCommand());
    initCmdMap0(m, new StudyResultCommand());
    initCmdMap0(m, new WeiboHotBand());
 }

 function initCmdMap0(m: Map<string, any>, cmd: CustomCommand) {
     m.set(cmd.cmdName(), cmd);
 }

 function initCmdArr(arr: Array<CustomCommandWithArgs>) {
   arr.push(new StudyConfigCommand());
 }

 const cmdMap = new Map<string, CustomCommand>();
 const cmdArr = new Array<CustomCommandWithArgs>();
 initCmdMap(cmdMap);
 initCmdArr(cmdArr);

 /**
  * 9. register cron events
  */

const cronEventArr = new Array<CronEvent>();
registerCronEvents()
cronEvents()
function registerCronEvents() {
  // cronEventArr.push(new StudyCheckEvents({"hour": new Date().getHours(), "minute": new Date().getMinutes() + 1, "jobName": "study check", "roomName": "机器人测试群"}))
  cronEventArr.push(new StudyCheckEvents({"hour": 22, "minute": 30, "jobName": "study check", "roomName": "社会主义接班人学习打卡群"}))
  cronEventArr.push(new StudyCheckEvents({"hour": 23, "minute": 59, "jobName": "study check", "roomName": "社会主义接班人学习打卡群"}))
  cronEventArr.push(new WeatherReportEvent({"hour": 6, "minute": 30, "jobName": "wether check", "roomName": "天胡", "city":"福州", "province":"福建"}));
}
async function cronEvents() {
  for(var event of cronEventArr) {
    await event.trigger(puppet);
  }
  setTimeout(cronEvents, constant.CRON_TIMER_PERIOD);
}