import { BrowserProvider } from './browser/browser';
import { $ } from './dom/jquery';
import * as loglevel from 'loglevel';
import { TypedDatastore, DataKey, DatastoreAccess } from './siteblock/core';
import { TypedEventHub } from './siteblock/events';
import * as _ from 'lodash';
import * as url from 'url';
import * as querystring from 'querystring';
import { DuolingoAPI, DuolingoAPIResponse } from './duolingo/api';
import * as Mousetrap from 'mousetrap';

loglevel.enableAll(); // For debug
let Logger = loglevel.getLogger('Bootstrap');

let browser = BrowserProvider.getBrowser();
let datastore = new TypedDatastore(browser);
let access = new DatastoreAccess(datastore);
let eventHub = new TypedEventHub(browser);

$(document).ready(() => {
  const setPayButtonEnabled = (enabled: boolean) => {
    if (enabled) {
      $('#pay').removeAttr('disabled');
      $('#pay-options').removeAttr('disabled');
    } else {
      $('#pay').attr('disabled', 'true');
      $('#pay-options').attr('disabled', 'true');
    }
  };

  const updateCurrencyUI = (currency: number) => {
    let currencyAsString: string = currency.toString();
    $('#gemcount').html('x' + currencyAsString);

    if (currency <= 0) {
      setPayButtonEnabled(false);
      $('.hide-when-no-potions').hide();
      $('.hide-when-potions').show();
    } else {
      setPayButtonEnabled(true);
      $('.hide-when-potions').hide();
      $('.hide-when-no-potions').show();
    }
  };

  function spendCurrency(amount: number) {
    access.decrementCurrency(
      amount,
      () => {
        // Give the user more time
        access.giveDefaultTime(() => {
          if (browser.getName() === 'Firefox') {
            // In firefox since this is a new tab, close this tab
            setTimeout(() => browser.closeCurrentTab(), 100);
          }
        });
      },
      () => {
        Logger.error('Not enough gems');
        alert('Not enough gems to spend!');
      }
    );
  }

  $('#pay').click(e => spendCurrency(1));

  // Keyboard shortcut to spend currency
  Mousetrap.bind('enter', () => {
    spendCurrency(1);
  });

  $('#pay-custom').click(e => {
    const amount = prompt('How many potions do you want to drink?');
    const amountAsNumber = Number(amount);
    console.log('Read amount:', amountAsNumber);

    if (isNaN(amountAsNumber)) {
      return alert('Not a valid number: ' + amountAsNumber);
    }

    const isInteger = amountAsNumber % 1 === 0;
    if (!isInteger) {
      return alert('Enter a whole number. Given: ' + amountAsNumber);
    }

    if (amountAsNumber <= 0) {
      return alert('Enter a number greater than 0. Given: ' + amountAsNumber);
    }

    spendCurrency(amountAsNumber);
  });

  $('#mine').click(e => {
    eventHub.requestRedirect('https://www.duolingo.com/');
  });

  $('#options').click(e => {
    browser.openOptionsPage();
  });

  $('#refresh-inventory').click(e => {
    // Kick one off just in case
    eventHub.requestCurrencyUpdate();

    // Simultaneously update in case too
    access.getCurrency((currency: number) => {
      console.log('Update currency', currency);
      updateCurrencyUI(currency);
    });
  });

  // Support arbitrary links on the page that wouldn't work in an iframe otherwise
  $('.outbound-link').click(e => {
    const href = $(e.target).attr('data-href');
    console.log('Outbound link to', href);
    eventHub.requestRedirect(href);
  });

  // If the user hasn't setup yet, take them to setup
  access.getDuolingoUsername(uname => {
    if (uname == '') {
      browser.openOptionsPage();
    }
  });

  access.getAndSubscribeToCurrency((currency: number) => {
    Logger.info('Read currency from store:', currency);

    updateCurrencyUI(currency);

    $('body').removeClass('hidden');
  });

  access.getDefaultTime(minutes => {
    $('#default-time').html(minutes.toString());
  });

  let query = url.parse(window.location.href).query;
  let referrer = querystring.parse(query)['r'];
  if (referrer) {
    let returnUrl = url.parse(referrer);
    $('#target-site').html(returnUrl.hostname);
  }

  eventHub.requestCurrencyUpdate();
});
