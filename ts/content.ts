import {Watcher, WatcherEvent} from "./duolingo/watcher"
import * as $ from "jquery"
import * as loglevel from 'loglevel'
import {BrowserProvider} from "./browser/browser"
import {TypedDatastore, DataKey, DatastoreAccess} from "./siteblock/core"
import * as _ from 'lodash'

loglevel.enableAll() // For debug
let Logger = loglevel.getLogger('Bootstrap')

let browser = BrowserProvider.getBrowser()
let datastore = new TypedDatastore(browser)
let access = new DatastoreAccess(datastore)

if (/.*duolingo\.com/.test(window.location.hostname)) {
    Logger.info("Bootstrapping Duolingo watcher")

    let watcher = new Watcher($)

    watcher.begin()

    watcher.on(WatcherEvent.PRACTICE_END, () => {
        Logger.info("Lesson completed, user is credited with a gem")
        browser.updateCurrencyBackground()
    })
} else {
    Logger.info("Bootstrapping other site watcher")

    let runIfBlacklistSite = (callback: Function) => {
        access.getBlockList((list) => {
            let regexes: RegExp[] = list.map((r) => new RegExp(r, 'i'))
            if (_.find(regexes, (r) => r.test(window.location.href))) {
                callback()
            }
        })
    }

    let runIfNoActiveSession = (callback: Function) => {
        datastore.getData(DataKey.CURRENT_SESSION_VALID_UNTIL, (sessionTs) => {
            let now = new Date().getTime()
            if (now >= sessionTs) {
                callback()
            }
        }, 0)
    }

    runIfBlacklistSite(() => {
        let checkExpiration = () => {
            access.getMillisecondsToSessionExpiration((timeToGo) => {
                if (timeToGo < 0) {
                    // There is no active session, bring the user to the blocked page
                    let url = browser.getUrl("html/toll.html")
                    let urlWithParams = url + "?r=" + encodeURIComponent(window.location.href)
                    browser.redirectTo(urlWithParams)
                } else {
                    // There is an active session but we want to end it later
                    Logger.debug("Active session exists, sleep for", timeToGo)
                    setTimeout(checkExpiration, timeToGo + 1000) // buffer to ensure value is correct later
                }
            })
        }

        checkExpiration()
    })
}
