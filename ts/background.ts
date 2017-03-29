import {Browser, BrowserProvider} from "./browser/browser"
import {DuolingoAPI, DuolingoAPIResponse} from "./duolingo/api"
import * as $ from "jquery"
import {TypedDatastore, DataKey, DatastoreAccess} from "./siteblock/core"
import * as loglevel from 'loglevel'

/// <reference path="./node_modules/chrome/index.d.ts"/>

let browser = BrowserProvider.getBrowser()
let datastore = new TypedDatastore(browser)
let access = new DatastoreAccess(datastore)

loglevel.enableAll() // For debug
let Logger = loglevel.getLogger('Options')

class CurrencyUpdater {
    private updating = false

    update() {
        if (this.updating) {
            Logger.info("Skip updating because we're currently updating")
        } else {
            this.updating = true
            this.doUpdate(() => {
                this.updating = false
            })
        }
    }

    private doUpdate(callback: Function) {
        access.getDuolingoUsername((username) => {
            let api = new DuolingoAPI($, username)

            api.getData((data: DuolingoAPIResponse) => {
                if (data.error) {
                    Logger.error(data)
                } else {
                    access.getLastCheckPoints((oldPoints) => {
                        if (oldPoints > 0) {
                            let diff = data.totalPoints - oldPoints
                            let overflow = diff % 10
                            let lessonsCompleted = diff / 10

                            Logger.info(data.totalPoints, oldPoints, diff, overflow, lessonsCompleted)

                            if (lessonsCompleted > 0) {
                                let newPoints = data.totalPoints - overflow
                                Logger.info("Set new points:", newPoints)
                                access.incrementCurrency(lessonsCompleted, () => {
                                    access.setLastCheckPoints(newPoints, () => {
                                        callback()
                                    })
                                })
                            } else {
                                Logger.info("No changes were made.")
                                callback()
                            }
                        } else {
                            Logger.error("Points are unititialized, user must do setup")
                            callback()
                        }
                    })
                }
            })
        })
    }
}

let currencyUpdater = new CurrencyUpdater()

chrome.runtime.onMessage.addListener(function(request, sender) {
    if (request.redirect != undefined) {
        chrome.tabs.update(sender.tab.id, {url: request.redirect});
    } else if (request.updateCurrency != undefined) {
        currencyUpdater.update()
    }
});

chrome.runtime.onInstalled.addListener((details) => {
    console.log("Was installed")
    access.getDuolingoUsername((uname) => {
        if (uname == '') {
            browser.openOptionsPage()
        }
    })
})