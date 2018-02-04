import * as $ from 'jquery';
import * as loglevel from 'loglevel';
import { BrowserProvider } from './browser/browser';
import { TypedDatastore, DataKey, DatastoreAccess } from './siteblock/core';
import { TypedEventHub } from './siteblock/events';
import * as _ from 'lodash';

loglevel.enableAll(); // For debug
let Logger = loglevel.getLogger('Bootstrap');

let browser = BrowserProvider.getBrowser();
let datastore = new TypedDatastore(browser);
let access = new DatastoreAccess(datastore);
let eventHub = new TypedEventHub(browser);

if (/.*duolingo\.com/.test(window.location.hostname)) {
  // Don't block duolingo
} else {
  let runIfBlacklistSite = (callback: () => void) => {
    access.getBlockList(list => {
      let regexes: RegExp[] = list.map(r => new RegExp(r, 'i'));
      if (_.find(regexes, r => r.test(window.location.href))) {
        callback();
      }
    });
  };

  let runIfNoActiveSession = (callback: () => void) => {
    datastore.getData(
      DataKey.CURRENT_SESSION_VALID_UNTIL,
      sessionTs => {
        let now = new Date().getTime();
        if (now >= sessionTs) {
          callback();
        }
      },
      0
    );
  };

  runIfBlacklistSite(() => {
    let startBlock = () => {
      let url = browser.getUrl('html/toll.html') + '?r=' + encodeURIComponent(window.location.href);

      $(document).ready(() => {
        console.info('Will-Save will block this page');
        if (browser.getName() === 'Chrome') {
          let e = $('<iframe>', { src: url, id: 'will-save-ui' });
          $('body').append(e);
        } else if (browser.getName() === 'Firefox') {
          const wrapper = $('<div>', { id: 'will-save-ui' });

          const msg = $('<div>', { class: 'fallback-text' });
          msg.html(
            'Will-Save has blocked this page, until you use a Potion.<br/><small>(Refresh if it does not update)</small>'
          );

          wrapper.append(msg);

          $('body').append(wrapper);

          eventHub.requestNewTab(url);
        } else {
          throw new Error('Unrecognized Browser');
        }
      });
    };

    let endBlock = () => {
      console.log('Remove blocker:', $('#will-save-ui'));
      $('#will-save-ui').remove();
    };

    let endBlockIfNeeded = (now: number, newTime: number) => {
      if (now < newTime) {
        // We can unblock now
        setTimeout(() => endBlock(), 100);

        // But we'll want to re-check in a bit
        let dt = newTime - now + 1000;
        Logger.debug('We will check again in', dt);
        setTimeout(checkExpiration, dt);
      }
    };

    let checkExpiration = () => {
      access.getMillisecondsToSessionExpiration(timeToGo => {
        if (timeToGo < 0) {
          // There is no active session, bring the user to the blocked page
          Logger.info('No active session, Will-Save will block this page');
          startBlock();
        } else {
          // There is an active session but we want to end it later
          Logger.info('Active session exists, sleep for', timeToGo);
          setTimeout(checkExpiration, timeToGo + 1000); // buffer to ensure value is correct later
        }
      });
    };

    checkExpiration();

    // If the user purchases time, we should unblock
    datastore.subscribeToChanges(DataKey.CURRENT_SESSION_VALID_UNTIL, newTime => {
      Logger.info('User spent potion on extra time');
      let now = new Date().getTime();
      endBlockIfNeeded(now, newTime);

      // But we'll want to re-check in a bit
      let dt = newTime - now + 1000;
      Logger.debug('We will check again in', dt);
      setTimeout(checkExpiration, dt);
    });

    // setInterval(() => {
    //     datastore.getData(DataKey.CURRENT_SESSION_VALID_UNTIL, (newTime: number) => {
    //         let now = new Date().getTime()
    //         endBlockIfNeeded(now, newTime);
    //     })
    // }, 2000);
  });
}
