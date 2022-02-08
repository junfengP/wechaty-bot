export class Utils {
    static getTodayDate():Date {
        return new Date(Date.now() + 8 * 3600 * 1000)
    }
    static getTodayStr():string {
        const d = this.getTodayDate()
        return `${d.getMonth() + 1}.${d.getDate()}`
    }
}