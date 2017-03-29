/// <reference path="../../node_modules/@types/chrome/index.d.ts"/>

export interface Browser {
    name: string
    getUrl(url: string): string
    writeData(key: string, val: string, onWrite: Function): void
    readData(key: String, onRead: Function): void

    subscribeToChanges(key: String, onChange: Function): void

    redirectTo(url: string): void
    openOptionsPage(): void
}

class ChromeBrowser implements Browser {
    name: "Chrome"
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
        chrome.storage.sync.set(o, onComplete)
    }

    readData(key, onValue) {
        chrome.storage.sync.get(key, onValue)
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

    subscribeToChanges(key, onChange) {
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

export class BrowserProvider {
    static getBrowser() {
        if (window.chrome) {
            return new ChromeBrowser()
        }

        throw "Unsupported Browser"
    }
}