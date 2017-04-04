import {BrowserProvider} from "./browser/browser"
import * as $ from "jquery"
import * as loglevel from 'loglevel'
import {TypedDatastore, DataKey, DatastoreAccess} from "./siteblock/core"
import {TypedEventHub} from "./siteblock/events"
import * as _ from 'lodash'
import * as url from 'url'
import * as querystring from 'querystring'
import {DuolingoAPI, DuolingoAPIResponse} from './duolingo/api'

loglevel.enableAll() // For debug
let Logger = loglevel.getLogger('Bootstrap')

let browser = BrowserProvider.getBrowser()
let datastore = new TypedDatastore(browser)
let access = new DatastoreAccess(datastore)
let eventHub = new TypedEventHub(browser)

let query = url.parse(window.location.href).query
let returnTo: string = querystring.parse(query)['r']

$(document).ready(() => {
    $('#pay').click((e) => {
        access.decrementCurrency(() => {
            // Give the user more time
            access.giveDefaultTime(() => {
                // Then redirect to the page
                eventHub.requestRedirect(returnTo)
            })
        }, () => {
            Logger.error("Not enough gems")
            alert("Not enough gems to spend!")
        })
    })

    $('#mine').click((e) => {
        eventHub.requestRedirect("https://www.duolingo.com/")
    })

    $('#options').click((e) => {
        browser.openOptionsPage()
    })

    // If the user hasn't setup yet, take them to setup
    access.getDuolingoUsername((uname) => {
        if (uname == '') {
            browser.openOptionsPage()
        }
    })

    access.getAndSubscribeToCurrency((currency: number) => {
        Logger.info("Read currency from store:", currency)
        let currencyAsString: string = (currency).toString()
        $('#gemcount').html("x" + currencyAsString)

        if (currency <= 0) {
            $('#pay').attr('disabled', 'true')
            $('.hide-when-no-potions').hide()
            $('.hide-when-potions').show()
        } else {
            $('#pay').removeAttr('disabled')
            $('.hide-when-potions').hide()
            $('.hide-when-no-potions').show()
        }

        $('body').removeClass('hidden')
    })

    // If the user purchases more time on another page, redirect them for free
    datastore.subscribeToChanges(DataKey.CURRENT_SESSION_VALID_UNTIL, (newTime) => {
        let now = new Date().getTime()
        if (now < newTime) {
            eventHub.requestRedirect(returnTo)
        }
    })

    access.getDefaultTime((minutes) => {
        $('#default-time').html(minutes)
    })

    let returnUrl = url.parse(returnTo)
    $('#target-site').html(returnUrl.hostname)

    eventHub.requestCurrencyUpdate()
})

// Alter back behavior: since we redirected, we should skip the page which causes issues. This is useful
// if the user comes to a blocked site through a search engine or link, we don't want to trap the user.
history.pushState(null, null, document.URL)
window.addEventListener('popstate', function () {
    window.history.go(-2)
});