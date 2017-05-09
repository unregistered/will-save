import {Browser, BrowserProvider} from "./browser/browser"
import {DuolingoAPI, DuolingoAPIResponse} from "./duolingo/api"
import * as $ from "jquery"
import {TypedDatastore, DataKey, DatastoreAccess} from "./siteblock/core"
import * as loglevel from 'loglevel'
import {TypedEventHub} from './siteblock/events'

let browser = BrowserProvider.getBrowser()
let datastore = new TypedDatastore(browser)
let access = new DatastoreAccess(datastore)

loglevel.enableAll() // For debug
let Logger = loglevel.getLogger('Background')

class CurrencyUpdater {
    private lastUpdatingTime = 0

    update() {
        let now = new Date().getTime()
        let minimumMsBetweenChecks = 5000
        if (this.lastUpdatingTime + minimumMsBetweenChecks > now) {
            Logger.info("Skip updating because we're currently updating")
        } else {
            Logger.info("Do an update because enough time has passed")
            this.lastUpdatingTime = now
            this.doUpdate(() => {
                // Reset so that we can check again
                this.lastUpdatingTime = 0
            })
        }
    }

    private doUpdate(callback: () => void) {
        access.getDuolingoUsername((username) => {
            let api = new DuolingoAPI($, username)

            api.getData((data: DuolingoAPIResponse) => {
                if (data.error) {
                    Logger.error(data)
                } else {
                    Logger.info("Received API response", data)
                    access.getLastCheckPoints((oldPoints) => {
                        if (oldPoints > 0) {
                            let diff = data.totalPoints - oldPoints
                            let overflow = diff % 10
                            let lessonsCompleted = Math.floor(diff / 10)

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

browser.runOnFirstInstall(() => {
    Logger.info("Was installed")
    access.getDuolingoUsername((uname) => {
        if (uname == '') {
            browser.openOptionsPage()
        }
    })
})

let eventHub = new TypedEventHub(browser)

eventHub.onCurrencyUpdate(() => {
    Logger.info("Received currency update request")
    currencyUpdater.update();
})

eventHub.onRedirect((url: string, tabId: number) => {
    browser.redirectTab(tabId, url)
})