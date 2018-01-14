import {Browser, OnChangeCallback, OnOpenTollInNewTabCallback} from '../browser/browser'

enum BrowserEvents {TRIGGER_CURRENCY_UPDATE, TRIGGER_REDIRECT, TRIGGER_NEW_TOLL_TAB}

export class TypedEventHub {
    constructor(private browser: Browser) {}

    requestCurrencyUpdate() {
        this.browser.publish(BrowserEvents[BrowserEvents.TRIGGER_CURRENCY_UPDATE], true)
    }

    onCurrencyUpdate(callback: OnChangeCallback) {
        this.browser.subscribe(BrowserEvents[BrowserEvents.TRIGGER_CURRENCY_UPDATE], callback)
    }

    requestRedirect(url: string) {
        this.browser.publish(BrowserEvents[BrowserEvents.TRIGGER_REDIRECT], url)
    }

    onRedirect(callback: OnChangeCallback) {
        this.browser.subscribe(BrowserEvents[BrowserEvents.TRIGGER_REDIRECT], callback)
    }

    requestNewTab(url: string) {
        this.browser.publish(BrowserEvents[BrowserEvents.TRIGGER_NEW_TOLL_TAB], url)
    }

    onRequestNewTab(callback: OnOpenTollInNewTabCallback) {
        this.browser.subscribe(BrowserEvents[BrowserEvents.TRIGGER_NEW_TOLL_TAB], callback)
    }
}