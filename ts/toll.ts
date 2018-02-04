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

$(document).ready(() => {
    const updateCurrencyUI = (currency: number) => {
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
    }

    $('#pay').click((e) => {
        access.decrementCurrency(() => {
            // Give the user more time
            access.giveDefaultTime(() => {
                if (browser.getName() === 'Firefox') {
                    // In firefox since this is a new tab, close this tab
                    setTimeout(() => browser.closeCurrentTab(), 100)
                }
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

    $('#refresh-inventory').click((e) => {
        // Kick one off just in case
        eventHub.requestCurrencyUpdate()

        // Simultaneously update in case too
        access.getCurrency((currency: number) => {
            console.log('Update currency', currency)
            updateCurrencyUI(currency)
        })
    })

    // If the user hasn't setup yet, take them to setup
    access.getDuolingoUsername((uname) => {
        if (uname == '') {
            browser.openOptionsPage()
        }
    })

    access.getAndSubscribeToCurrency((currency: number) => {
        Logger.info("Read currency from store:", currency)

        updateCurrencyUI(currency);

        $('body').removeClass('hidden')
    })

    access.getDefaultTime((minutes) => {
        $('#default-time').html(minutes.toString())
    })

    let query = url.parse(window.location.href).query
    let referrer = querystring.parse(query)['r']
    if (referrer) {
        let returnUrl = url.parse(referrer)
        $('#target-site').html(returnUrl.hostname)
    }

    eventHub.requestCurrencyUpdate()
})