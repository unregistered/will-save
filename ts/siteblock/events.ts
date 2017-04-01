import {Browser} from '../browser/browser'

enum BrowserEvents {TRIGGER_CURRENCY_UPDATE, TRIGGER_REDIRECT}

export class TypedEventHub {
    constructor(private browser: Browser) {}

    requestCurrencyUpdate() {
        this.browser.publish(BrowserEvents[BrowserEvents.TRIGGER_CURRENCY_UPDATE], true)
    }

    onCurrencyUpdate(callback: Function) {
        this.browser.subscribe(BrowserEvents[BrowserEvents.TRIGGER_CURRENCY_UPDATE], callback)
    }

    requestRedirect(url: string) {
        this.browser.publish(BrowserEvents[BrowserEvents.TRIGGER_REDIRECT], url)
    }

    onRedirect(callback: Function) {
        this.browser.subscribe(BrowserEvents[BrowserEvents.TRIGGER_REDIRECT], callback)
    }
}