import { DuolingoAPI, DuolingoAPIResponse } from './duolingo/api';
import { $ } from './dom/jquery';
import * as loglevel from 'loglevel';
import * as _ from 'lodash';
import { BrowserProvider } from './browser/browser';
import { TypedDatastore, DataKey, DatastoreAccess } from './siteblock/core';

loglevel.enableAll(); // For debug
let Logger = loglevel.getLogger('Options');

let browser = BrowserProvider.getBrowser();
let datastore = new TypedDatastore(browser);
let access = new DatastoreAccess(datastore);

let quickSuggest = [
  ['Reddit', 'https?://.*?reddit.com/.*'],
  ['Facebook', 'https?://www.facebook.com/.*'],
  ['Hacker News', 'https?://news.ycombinator.com/.*'],
  ['Youtube', 'https?://www.youtube.com/.*'],
  ['Twitter', 'https?://twitter.com/.*'],
  ['VK', 'https?://vk.com/.*'],
  ['Instagram', 'https?://www.instagram.com/.*'],
  ['LinkedIn', 'https?://www.linkedin.com/.*'],
  ['Imgur', 'https?://imgur.com/.*'],
  ['Tumblr', 'https?://www.tumblr.com/.*']
];

class SiteBlacklist {
  constructor(private e: JQuery) {}

  getArray(): string[] {
    let asString = this.e.val();
    let parts: string[] = asString.split('\n');
    let nonEmptyParts = _.filter(parts, s => s.length > 0);
    return nonEmptyParts;
  }

  setArray(a: string[]) {
    let uniqs = _.uniq(a);
    let joined = uniqs.join('\n');
    this.e.val(joined);
  }
}

let doSaveAnimation = () => {
  $('#save').html('Saving..');
  $('#save').addClass('btn-success');
  $('#save').removeClass('btn-primary');
  $('#save').attr('disabled', 'true');
};

let stopSaveAnimation = () => {
  $('#save').html('Saved.');

  setTimeout(() => {
    $('#save').html('Save');
    $('#save').addClass('btn-primary');
    $('#save').removeClass('btn-success');
    $('#save').removeAttr('disabled');
  }, 1000);
};

let updateDuolingoLinkStatus = (text: string, icon: string) => {
  let icn = $('<i/>', { class: `glyphicon glyphicon-${icon}` });
  $('#duolingo-link-status')
    .html('')
    .append(icn)
    .append(' ')
    .append(text);
};

$(document).ready(() => {
  Logger.info('Attach to dom. Browser:', browser);

  let blacklist = new SiteBlacklist($('#blocked-sites'));

  // Fetch suggested sites
  let suggestedSites = quickSuggest.map(suggestion => {
    return $('<a/>', { class: 'btn btn-xs btn-danger suggestion', text: suggestion[0] }).on('click', evt => {
      let a = blacklist.getArray();
      a.push(suggestion[1]);
      blacklist.setArray(a);
    });
  });
  $('#suggested-sites').append(suggestedSites);

  // Fetch other info
  Logger.info('Get infos');
  access.getDefaultTime(minutes => {
    $('#minutes-per-currency').val(minutes);
  });

  access.getDefaultCurrencyPerLesson(gain => {
    $('#currency-per-lesson').val(gain);
  });

  access.getDuolingoUsername(username => {
    $('#duolingo-username').val(username);
  });

  access.getExpPerReward(exp => {
    $('#exp-per-reward').val(exp);
  });

  // Load from save
  access.getBlockList(list => {
    blacklist.setArray(list);
  });

  $('#save').on('click', evt => {
    doSaveAnimation();

    let currencyPerLesson = parseInt($('#currency-per-lesson').val());
    let minutesPerCurrency = parseInt($('#minutes-per-currency').val());
    let duoUsername: string = $('#duolingo-username').val();
    let expPerReward = parseInt($('#exp-per-reward').val());

    access.setBlockList(blacklist.getArray(), () => {});
    access.setDefaultCurrencyPerLesson(currencyPerLesson, () => {});
    access.setDefaultTime(minutesPerCurrency, () => {});
    access.setExpPerReward(expPerReward, () => {});

    access.getDuolingoUsername(oldUsername => {
      let rawFieldUsername = duoUsername;
      let newUsername = $.trim(rawFieldUsername);

      if (!newUsername) {
        updateDuolingoLinkStatus('Enter your duolingo username', 'exclamation-sign');
        stopSaveAnimation();
        return;
      }

      if (oldUsername != newUsername) {
        // Get new username info
        let api = new DuolingoAPI($, newUsername);
        api.getData((data: DuolingoAPIResponse) => {
          console.log(data);
          if (!data.error) {
            Logger.info('Set new duolingo username', newUsername, 'Base points', data.totalPoints);
            access.setDuolingoUsernameAndInitializeInventory(newUsername, data.totalPoints);

            updateDuolingoLinkStatus(
              `User now set to <a href="https://www.duolingo.com/${newUsername}">${newUsername}</a>, who has ${
                data.totalPoints
              } total EXP.<br/><br/>Try visiting a site on your blocklist!`,
              'ok'
            );
          } else {
            updateDuolingoLinkStatus(
              `Username was not found. Please double-check your username (and make sure it's not your e-mail address).<br/><small>Details: ${
                data.error
              }</small>`,
              'remove'
            );
          }

          stopSaveAnimation();
        });
      } else {
        updateDuolingoLinkStatus(`The username is still set to ${oldUsername}`, 'ok');
        stopSaveAnimation();
      }
    });

    evt.stopPropagation();
    return false;
  });
});
