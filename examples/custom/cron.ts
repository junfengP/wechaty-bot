import type PuppetXp from "../../src/puppet-xp";
import { CRON_TIMER_PERIOD } from "./constant.js";

export interface CronEvent {
    trigger(puppet: PuppetXp):void;
}

export abstract class AbstractCronEvent implements CronEvent{
    hour: number;
    minute: number;
    lastExecuteTime: number;
    dayOfWeek: string;
    dayOfMonth: number;
    jobName: string;

    constructor(json: any) {
        this.hour = json["hour"];
        this.minute = json["minute"];
        this.lastExecuteTime = 0;
        this.dayOfWeek = json["dayOfWeek"];
        this.dayOfMonth = json["dayOfMonth"];
        this.jobName = json["jobName"];
    }
    async trigger(puppet: PuppetXp) {
        const d = new Date();
        let triggerd = this.lastExecuteTime + 2 * CRON_TIMER_PERIOD < Date.now();

        triggerd = triggerd && d.getHours() === this.hour;
        triggerd = triggerd && d.getMinutes() === this.minute;
        if(this.dayOfWeek) {
            triggerd = triggerd && this.dayOfWeek.indexOf(d.getDay().toString()) != -1;
        }
        if(this.dayOfMonth) {
            triggerd = triggerd && this.dayOfMonth === d.getDate();
        }
        if(triggerd) {
            console.log(`${new Date()}, triggered ${this.jobName}`)
            this.lastExecuteTime = Date.now();
            await this.trigger0(puppet);
        }
    }
    abstract trigger0(puppet: PuppetXp): void;
}