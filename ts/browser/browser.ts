/// <reference path="../../node_modules/@types/chrome/index.d.ts"/>
/// <reference path="../../node_modules/web-ext-types/global/index.d.ts"/>

export interface Browser {
    getUrl(url: string): string
    writeData(key: string, val: string, onWrite: Function): void
    readData(key: String, onRead: Function): void

    subscribeToChanges(key: String, onChange: Function): void

    redirectTo(url: string): void
    openOptionsPage(): void

    updateCurrencyBackground(): void
}

class ChromeBrowser implements Browser {
    private keysToEventHandler: {[Key: string]: [Function]} = {}

    constructor() {
        this.startListeningForChanges()
    }

    getUrl(url: string) {
        return chrome.extension.getURL(url);
    }

    writeData(key, val, onComplete) {
        var o = {}
        o[key] = val
        chrome.storage.local.set(o, onComplete)
    }

    readData(key, onValue) {
        chrome.storage.local.get(key, onValue)
    }

    private startListeningForChanges() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            for (var key in changes) {
                var storageChange = changes[key]

                let callbacks = this.keysToEventHandler[key]
                if (callbacks != undefined) {
                    callbacks.forEach((cb) => cb(storageChange.newValue, storageChange.oldValue))
                }
            }
        })
    }

    subscribeToChanges(key: string, onChange: Function) {
        let existingList = this.keysToEventHandler[key]
        if (existingList == undefined) {
            this.keysToEventHandler[key] = [onChange]
        } else {
            existingList.push(onChange)
        }
    }

    redirectTo(url) {
        chrome.runtime.sendMessage({redirect: url})
    }

    openOptionsPage() {
        chrome.runtime.openOptionsPage()
    }

    updateCurrencyBackground() {
        chrome.runtime.sendMessage({updateCurrency: true})
    }
}

class FirefoxBrowser implements Browser {
    private keysToEventHandler: {[Key: string]: [Function]} = {}
    private browserId = "will-save@unregistered"

    constructor() {
        this.startListeningForChanges()
    }

    getUrl(url: string): string {
        return browser.extension.getURL(url)
    }

    writeData(key, val, onComplete) {
        var o = {}
        o[key] = val
        browser.storage.local.set(o).then(onComplete)
    }

    readData(key, onValue) {
        console.log("Read data")
        browser.storage.local.get(key).then((val) => {
            console.log("Promise resolved", val)
            onValue()
        })
    }

    private startListeningForChanges() {
        browser.storage.onChanged.addListener((changes, namespace) => {
            for (var key in changes) {
                var storageChange = changes[key]

                let callbacks = this.keysToEventHandler[key]
                if (callbacks != undefined) {
                    callbacks.forEach((cb) => cb(storageChange.newValue, storageChange.oldValue))
                }
            }
        })
    }

    subscribeToChanges(key: string, onChange: Function) {
        let existingList = this.keysToEventHandler[key]
        if (existingList == undefined) {
            this.keysToEventHandler[key] = [onChange]
        } else {
            existingList.push(onChange)
        }
    }

    redirectTo(url) {
        browser.runtime.sendMessage(this.browserId, {redirect: url})
    }

    openOptionsPage() {
        browser.runtime.openOptionsPage()
    }

    updateCurrencyBackground() {
        browser.runtime.sendMessage(this.browserId, {updateCurrency: true})
    }
}

export class BrowserProvider {
    static getBrowser(): Browser {
        if (window.chrome) {
            return new ChromeBrowser()
        }

        if (browser) {
            return new FirefoxBrowser()
        }

        throw "Unsupported Browser"
    }
}