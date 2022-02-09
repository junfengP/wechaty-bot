export class Utils {
    static getTodayDate():Date {
        return new Date(Date.now() + 8 * 3600 * 1000)
        // return new Date();
    }
    static getTodayStr():string {
        const d = new Date();
        return `${d.getMonth() + 1}.${d.getDate()}`
    }
}