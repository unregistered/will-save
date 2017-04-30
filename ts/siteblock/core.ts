/// <reference path="../../node_modules/@types/node/index.d.ts" />
import * as events from 'events'
import {Browser, OnReadCallback, OnWriteCallback, OnChangeCallback} from '../browser/browser'

export enum DataKey {CURRENCY_COUNT, CURRENT_SESSION_VALID_UNTIL, BLACKLIST, MINUTES_PER_CURRENCY,
     CURRENCY_PER_REVIEW, DUOLINGO_USERNAME, DUOLINGO_LAST_CHECK_POINTS}

export class TypedDatastore {
    constructor(private browser: Browser) {}

    setData(key: DataKey, value: any, onComplete: OnWriteCallback) {
        let keyAsString: string = DataKey[key]
        this.browser.writeData(keyAsString, value, onComplete)
    }

    getData(key: DataKey, onRead: (value: any) => void, defaultVal: any = undefined) {
        this.browser.readData(DataKey[key], (obj) => {
            let val = obj[DataKey[key]]
            let valOrDefault = val ? val : defaultVal
            onRead(valOrDefault)
        })
    }

    subscribeToChanges(key: DataKey, onChange: OnChangeCallback) {
        this.browser.subscribeToChanges(DataKey[key], onChange)
    }
}

export class DatastoreAccess {
    constructor(private store: TypedDatastore) {}

    incrementCurrency(times: number, onComplete: (newLevel: number) => void) {
        this.getDefaultCurrencyPerLesson((gain) => {
            this.store.getData(DataKey.CURRENCY_COUNT, (currency: number) => {
                let newLevel = currency += gain * times
                this.store.setData(DataKey.CURRENCY_COUNT, newLevel, () => {
                    onComplete(newLevel)
                })
            }, 0)
        })
    }

    decrementCurrency(onSuccess: (newCurrency: number) => void, onFail: () => void) {
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

    getAndSubscribeToCurrency(withCurrency: OnChangeCallback) {
        this.store.getData(DataKey.CURRENCY_COUNT, (currency: number) => {
            withCurrency(currency)
            this.store.subscribeToChanges(DataKey.CURRENCY_COUNT, withCurrency)
        }, 0)
    }

    giveDefaultTime(onComplete: () => void) {
        this.getDefaultTime((minutes) => {
            let now = new Date().getTime()
            let timeToAdd = minutes * 60 * 1000
            this.store.setData(DataKey.CURRENT_SESSION_VALID_UNTIL, now + timeToAdd, () => {
                onComplete()
            })
        })
    }

    getDefaultTime(withMinutes: (minutes: number) => void) {
        this.store.getData(DataKey.MINUTES_PER_CURRENCY, (minutes) => {
            withMinutes(minutes)
        }, 10)
    }

    setDefaultTime(minutes: number, onComplete: () => void) {
        this.store.setData(DataKey.MINUTES_PER_CURRENCY, minutes, onComplete)
    }

    getDefaultCurrencyPerLesson(withGain: (gain: number) => void) {
        this.store.getData(DataKey.CURRENCY_PER_REVIEW, (gain: number) => {
            withGain(gain)
        }, 1)
    }

    setDefaultCurrencyPerLesson(gain: number, onComplete: () => void) {
        this.store.setData(DataKey.CURRENCY_PER_REVIEW, gain, onComplete)
    }

    getMillisecondsToSessionExpiration(withTime: (time: number) => void) {
        this.store.getData(DataKey.CURRENT_SESSION_VALID_UNTIL, (sessionTs) => {
            let now = new Date().getTime()
            withTime(sessionTs - now)
        }, 0)
    }

    getBlockList(onResult: (blocklist: string[]) => void) {
        this.store.getData(DataKey.BLACKLIST, (list) => {
            onResult(list)
        }, [])
    }

    setBlockList(newList: string[], onComplete: () => void) {
        this.store.setData(DataKey.BLACKLIST, newList, onComplete)
    }

    getDuolingoUsername(withName: (username: string) => void) {
        this.store.getData(DataKey.DUOLINGO_USERNAME, withName, "")
    }

    setDuolingoUsernameAndInitializeInventory(name: string, initialPoints: number) {
        this.store.setData(DataKey.DUOLINGO_USERNAME, name, () => {})
        this.store.setData(DataKey.DUOLINGO_LAST_CHECK_POINTS, initialPoints, () => {})
    }

    getLastCheckPoints(withPoints: (points: number) => void) {
        this.store.getData(DataKey.DUOLINGO_LAST_CHECK_POINTS, withPoints, -1)
    }

    setLastCheckPoints(points: number, onComplete: () => void) {
        this.store.setData(DataKey.DUOLINGO_LAST_CHECK_POINTS, points, onComplete)
    }
}