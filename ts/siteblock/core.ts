/// <reference path="../../node_modules/@types/node/index.d.ts" />
import * as events from 'events'
import {Browser} from '../browser/browser'

export enum DataKey {CURRENCY_COUNT, CURRENT_SESSION_VALID_UNTIL, BLACKLIST, MINUTES_PER_CURRENCY,
     CURRENCY_PER_REVIEW, DUOLINGO_USERNAME, DUOLINGO_LAST_CHECK_POINTS}

export class TypedDatastore {
    constructor(private browser: Browser) {}

    setData(key: DataKey, value: any, onComplete: Function) {
        let keyAsString: string = DataKey[key]
        this.browser.writeData(keyAsString, value, onComplete)
    }

    getData(key: DataKey, onRead: Function, defaultVal: any = undefined) {
        this.browser.readData(DataKey[key], (obj) => {
            let val = obj[DataKey[key]]
            let valOrDefault = val ? val : defaultVal
            onRead(valOrDefault)
        })
    }

    subscribeToChanges(key: DataKey, onChange: Function) {
        this.browser.subscribeToChanges(DataKey[key], onChange)
    }
}

export class DatastoreAccess {
    constructor(private store: TypedDatastore) {}

    incrementCurrency(times: number, onComplete: Function) {
        this.getDefaultCurrencyPerLesson((gain) => {
            this.store.getData(DataKey.CURRENCY_COUNT, (currency: number) => {
                let newLevel = currency += gain * times
                this.store.setData(DataKey.CURRENCY_COUNT, newLevel, () => {
                    onComplete(newLevel)
                })
            }, 0)
        })
    }

    decrementCurrency(onSuccess: Function, onFail: Function) {
        this.store.getData(DataKey.CURRENCY_COUNT, (currency) => {
            if (currency > 0) {
                let newCurrency = currency - 1
                this.store.setData(DataKey.CURRENCY_COUNT, newCurrency, () => {
                    onSuccess(newCurrency)
                })
            } else {
                onFail()
            }
        })
    }

    getAndSubscribeToCurrency(withCurrency: Function) {
        this.store.getData(DataKey.CURRENCY_COUNT, (currency: number) => {
            withCurrency(currency)
            this.store.subscribeToChanges(DataKey.CURRENCY_COUNT, withCurrency)
        }, 0)
    }

    giveDefaultTime(onComplete: Function) {
        this.getDefaultTime((minutes) => {
            let now = new Date().getTime()
            let timeToAdd = minutes * 60 * 1000
            this.store.setData(DataKey.CURRENT_SESSION_VALID_UNTIL, now + timeToAdd, () => {
                onComplete()
            })
        })
    }

    getDefaultTime(withMinutes: Function) {
        this.store.getData(DataKey.MINUTES_PER_CURRENCY, (minutes) => {
            withMinutes(minutes)
        }, 10)
    }

    setDefaultTime(minutes: number, onComplete: Function) {
        this.store.setData(DataKey.MINUTES_PER_CURRENCY, minutes, onComplete)
    }

    getDefaultCurrencyPerLesson(withGain: Function) {
        this.store.getData(DataKey.CURRENCY_PER_REVIEW, (gain: number) => {
            withGain(gain)
        }, 1)
    }

    setDefaultCurrencyPerLesson(gain: number, onComplete: Function) {
        this.store.setData(DataKey.CURRENCY_PER_REVIEW, gain, onComplete)
    }

    getMillisecondsToSessionExpiration(withTime: Function) {
        this.store.getData(DataKey.CURRENT_SESSION_VALID_UNTIL, (sessionTs) => {
            let now = new Date().getTime()
            withTime(sessionTs - now)
        }, 0)
    }

    getBlockList(onResult: Function) {
        this.store.getData(DataKey.BLACKLIST, (list) => {
            onResult(list)
        }, [])
    }

    setBlockList(newList: string[], onComplete: Function) {
        this.store.setData(DataKey.BLACKLIST, newList, onComplete)
    }

    getDuolingoUsername(withName: Function) {
        this.store.getData(DataKey.DUOLINGO_USERNAME, withName, "")
    }

    setDuolingoUsernameAndInitializeInventory(name: string, initialPoints: number) {
        this.store.setData(DataKey.DUOLINGO_USERNAME, name, () => {})
        this.store.setData(DataKey.DUOLINGO_LAST_CHECK_POINTS, initialPoints, () => {})
    }

    getLastCheckPoints(withPoints: Function) {
        this.store.getData(DataKey.DUOLINGO_LAST_CHECK_POINTS, withPoints, -1)
    }

    setLastCheckPoints(points: number, onComplete: Function) {
        this.store.setData(DataKey.DUOLINGO_LAST_CHECK_POINTS, points, onComplete)
    }
}