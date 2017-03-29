import * as loglevel from 'loglevel'
import * as _ from 'lodash'

let Logger = loglevel.getLogger('Duolingo API')

export class DuolingoAPIResponse {
    error: string
    totalPoints: number
}

export class DuolingoAPI {
    constructor(private jQuery: JQueryStatic, private username: string) {}

    getEndpoint(): string {
        return "https://www.duolingo.com/users/" + this.username
    }

    getData(onComplete: Function) {
        this.jQuery.getJSON(this.getEndpoint(), (data) => {
            Logger.debug(data)       
            onComplete({
                totalPoints: _.sum(this.extractLanguagePoints(data))
            })
        }).fail((jqxhr: JQueryXHR, textStatus, error) => {
            Logger.error(jqxhr, textStatus, error)

            let getErr = () => {
                if (jqxhr.status == 404) {
                    return "User not found, check your Duolingo username and try again"
                } else {
                    return textStatus
                }
            }

            onComplete({
                error: getErr(),
                totalPoints: -1
            })
        })
    }

    private extractLanguagePoints(data): number[] {
        if (data.languages == undefined) {
            Logger.error("Unexpected API response:", data)
            return []
        } else {
            return data.languages.map((l) => {
                if (l.points != undefined) {
                    return l.points
                } else {
                    Logger.error("Language missing points", l)
                    return 0
                }
            })
        }
    }
}