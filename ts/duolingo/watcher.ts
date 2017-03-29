import * as loglevel from 'loglevel'
import * as events from 'events'

export enum WatcherEvent {NULL, HOME_PAGE, SKILL_PAGE, PRACTICE_HOME, PRACTICE_END, QUESTION_PENDING, QUESTION_RIGHT, QUESTION_WRONG}

var Logger = loglevel.getLogger('Watcher')

/**
 * Watcher is a state machine which fires events when page loads occur. It polls 
 * regularly to see if the state has changed.
 */
export class Watcher {
    events = new events.EventEmitter()
    currentPage: WatcherEvent = WatcherEvent.NULL

    constructor(private $: JQueryStatic) {}

    begin() {
        Logger.info("Watcher will now observe page for events")
        setInterval(this.tick, 100)
    }

    tick = () => {
        var detectedPage = this.currentPage
        
        let path = window.location.pathname // TODO: This may not work in other languages due to URL localization
        if (path == '/') {
            detectedPage = WatcherEvent.HOME_PAGE
        } else if (/\/skill\/[^\/]+?\/[^\/]+?$/.test(path)) {
            detectedPage = WatcherEvent.SKILL_PAGE
        } else if (/^\/skill\/[^\/]+?\/[^\/]+?\/.*$/.test(path) || /^\/practice$/.test(path)) {
            // We are in a practice session which could be a review or new lesson
            if (this.$('#untimed-button').length) {
                detectedPage = WatcherEvent.PRACTICE_HOME
            } else if (this.$('#next_button:visible').length) {
                // Check if the question has been answered
                if (this.$('.badge-wrong-big').length) {
                    detectedPage = WatcherEvent.QUESTION_WRONG
                } else if (this.$('.badge-correct-big').length) {
                    detectedPage = WatcherEvent.QUESTION_RIGHT
                } else {
                    detectedPage = WatcherEvent.QUESTION_PENDING
                }
            } else if (this.$('#end-carousel').length) {
                detectedPage = WatcherEvent.PRACTICE_END
            }
        }

        if (this.currentPage != detectedPage) {
            this.currentPage = detectedPage
            this.triggerEvent(detectedPage)
        }
    }

    private triggerEvent(evt: WatcherEvent) {
        Logger.info(`Watcher will trigger event: ${WatcherEvent[evt]}`)
        this.events.emit(WatcherEvent[evt])
    }

    on(evt: WatcherEvent, listener: Function) {
        this.events.on(WatcherEvent[evt], listener)
    }
}
