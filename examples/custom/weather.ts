import type { Message } from "wechaty-puppet/payload";
import type PuppetXp from "../../src/puppet-xp";
import { got } from "got";
import { AbstractCronEvent } from "./cron.js";
import * as constant from "./constant.js";
import { Utils } from "./utils.js";

class WeatherUtils {
    static async fetchWeatherInfo(city: string, province:string):Promise<string> {
        const response = await got.get(`https://www.douyacun.com/api/openapi/weather?province=${province}&city=${city}&weather_type=forecast_hour|forecast_day|alarm|observe|life_index|air&token=${constant.WEATHER_API_TOKEN}`);
        const data = JSON.parse(response.body);
        if (data.code != 0) {
            console.log(`请求天气信息失败：${data.message}`);
            return "获取天气信息失败";
        }
        const d = data.data;
        const today = d.forecast_day[1];
        const result = `天气信息开发版\n${province}-${city}\n` +
            `气温：${today.max_degree}/${today.min_degree}°C 湿度：${d.observe.humidity}%\n` +
            `天气：${d.observe.weather} 风力：${d.observe.wind_power}级\n` +
            (d.life_index.clothes.detail ? `穿衣：${d.life_index.clothes.detail}\n` : `穿衣：${d.life_index.clothes.info}\n`) +
            `紫外线：${d.life_index.ultraviolet.info}，${d.life_index.ultraviolet.detail}`;
        return result;
    }
}

export class WeatherReportEvent extends AbstractCronEvent {
    city: string;
    province: string;
    roomName: string;
    constructor(json: any) {
        super(json);
        this.city = json["city"];
        this.province = json["province"];
        this.roomName = json["roomName"];
    }
    async trigger0(puppet: PuppetXp) {
        const room = await Utils.searchRoomByTopic(puppet, this.roomName);
        if(!room) {
            console.error(`Weather Report Event, topic ${this.roomName} not found`);
            return;
        }
        const roomId = room.id;
        await puppet.messageSendText(roomId, await WeatherUtils.fetchWeatherInfo(this.city, this.province));
    }
    
}