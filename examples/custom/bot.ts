import type * as PUPPET   from 'wechaty-puppet'

 import {
   PuppetXp,
 }               from '../../src/mod.js'
import { CustomCommand, HelpCommand } from './cmd.js'
import * as constant from './constant.js'
import { MacuoUndoWinLoseCommand, MacuoWinLoseCommand, MacuoWinLoseRankCommand } from './macuo.js'
 
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
   let logStr = `from: ${user.name}, text: ${text}`;
   if(roomId != '') {
       const room = await puppet.roomPayload(roomId);
       logStr = `room: ${room.topic}, ` + logStr;
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
        const cmd = cmdMap.get(cmdKey);

        if(!cmd) {
            await puppet.messageSendText(roomId! || fromId!, `cmd not found: ${cmdKey}`)
        }
        await cmd.consume(msg, puppet);
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

 /**
  * 8. assemble commands
  */

 function initCmdMap(m: Map<string, any>) {
    initCmdMap0(m, new MacuoWinLoseCommand());
    initCmdMap0(m, new HelpCommand());
    initCmdMap0(m, new MacuoWinLoseRankCommand());
    initCmdMap0(m, new MacuoUndoWinLoseCommand());
 }

 function initCmdMap0(m: Map<string, any>, cmd: CustomCommand) {
     m.set(cmd.cmdName(), cmd);
 }

 const cmdMap = new Map();
 initCmdMap(cmdMap);

 