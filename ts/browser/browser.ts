/// <reference path="../../node_modules/@types/chrome/index.d.ts"/>
/// <reference path="../../node_modules/web-ext-types/global/index.d.ts"/>

export type OnWriteCallback = () => void;
export type OnReadCallback = (items: { [keys: string]: any }) => void;
export type OnChangeCallback = (newValue: any, oldValue?: any) => void;
export type BrowserSubscribeCallback = (value: any, tabId?: number) => void;
export type OnOpenTollInNewTabCallback = (url: string) => void;

export type BrowserType = 'Chrome' | 'Firefox';

function getTollPageUrl(browser: Browser) {
  return browser.getUrl('html/toll.html') + '?r=' + encodeURIComponent(window.location.href);
}

export interface Browser {
  getName(): BrowserType;

  // Data APIs
  getUrl(url: string): string;
  writeData(key: string, val: string, onWrite: () => void): void;
  readData(key: String, onRead: OnReadCallback): void;
  subscribeToChanges(key: String, onChange: OnChangeCallback): void;

  // Message sending
  publish(key: string, obj: any): void;
  subscribe(key: string, callback: BrowserSubscribeCallback): void;

  // Tabs
  redirectTab(tabId: number, url: string): void;
  closeCurrentTab(): void;
  openTab(url: string): void;

  // Misc
  openOptionsPage(): void;
  runOnFirstInstall(callback: () => void): void;
}

class ChromeBrowser implements Browser {
  private keysToEventHandler: { [Key: string]: [OnChangeCallback] } = {};

  constructor() {
    this.startListeningForChanges();
  }

  getName(): BrowserType {
    return 'Chrome';
  }

  getUrl(url: string) {
    return chrome.extension.getURL(url);
  }

  writeData(key, val, onComplete) {
    var o = {};
    o[key] = val;
    chrome.storage.local.set(o, onComplete);
  }

  readData(key, onValue) {
    chrome.storage.local.get(key, onValue);
  }

  private startListeningForChanges() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      for (var key in changes) {
        var storageChange = changes[key];

        let callbacks = this.keysToEventHandler[key];
        if (callbacks != undefined) {
          callbacks.forEach(cb => cb(storageChange.newValue, storageChange.oldValue));
        }
      }
    });
  }

  subscribeToChanges(key: string, onChange: OnChangeCallback) {
    let existingList = this.keysToEventHandler[key];
    if (existingList == undefined) {
      this.keysToEventHandler[key] = [onChange];
    } else {
      existingList.push(onChange);
    }
  }

  publish(key: string, obj: any) {
    chrome.runtime.sendMessage({ key: key, val: obj });
  }

  subscribe(key: string, callback: BrowserSubscribeCallback) {
    chrome.runtime.onMessage.addListener((request, sender) => {
      if (request.key == key) {
        callback(request.val, sender.tab.id);
      }
    });
  }

  redirectTab(tabId: number, url: string) {
    chrome.tabs.update(tabId, { url: url });
  }

  openTab(url: string) {
    console.log('No-op in chrome');
    // NO-OP
  }

  closeCurrentTab() {
    console.log('No-op in chrome');
  }

  redirectTo(url) {
    chrome.runtime.sendMessage({ redirect: url });
  }

  openOptionsPage() {
    chrome.runtime.openOptionsPage();
  }

  updateCurrencyBackground() {
    chrome.runtime.sendMessage({ updateCurrency: true });
  }

  runOnFirstInstall(callback: () => void) {
    chrome.runtime.onInstalled.addListener(details => {
      callback();
    });
  }
}

class FirefoxBrowser implements Browser {
  private keysToEventHandler: { [Key: string]: [OnChangeCallback] } = {};
  private extensionId = 'will-save@unregistered';

  constructor() {
    this.startListeningForChanges();
  }

  getName(): BrowserType {
    return 'Firefox';
  }

  getUrl(url: string): string {
    return browser.extension.getURL(url);
  }

  writeData(key, val, onComplete) {
    var o = {};
    o[key] = val;
    browser.storage.local.set(o).then(onComplete);
  }

  readData(key, onValue) {
    browser.storage.local.get(key).then(val => {
      onValue(val);
    });
  }

  private startListeningForChanges() {
    browser.storage.onChanged.addListener((changes, namespace) => {
      for (var key in changes) {
        var storageChange = changes[key];

        let callbacks = this.keysToEventHandler[key];
        if (callbacks != undefined) {
          callbacks.forEach(cb => cb(storageChange.newValue, storageChange.oldValue));
        }
      }
    });
  }

  subscribeToChanges(key: string, onChange: OnChangeCallback) {
    let existingList = this.keysToEventHandler[key];
    if (existingList == undefined) {
      this.keysToEventHandler[key] = [onChange];
    } else {
      existingList.push(onChange);
    }
  }

  publish(key: string, obj: any) {
    browser.runtime.sendMessage(this.extensionId, { key: key, val: obj });
  }

  subscribe(key: string, callback: BrowserSubscribeCallback) {
    browser.runtime.onMessage.addListener((request, sender) => {
      if (request.key == key) {
        callback(request.val);
      }
      return true;
    });
  }

  redirectTab(tabId: number, url: string) {
    browser.tabs.update(tabId, { url: url });
  }

  openTab(url: string) {
    browser.tabs.create({
      url: url
    });
  }

  closeCurrentTab() {
    browser.tabs.getCurrent().then(currentTab => browser.tabs.remove(<any>currentTab.id));
  }

  redirectTo(url) {
    browser.runtime.sendMessage(this.extensionId, { redirect: url });
  }

  openOptionsPage() {
    browser.runtime.openOptionsPage();
  }

  updateCurrencyBackground() {
    browser.runtime.sendMessage(this.extensionId, { updateCurrency: true });
  }

  runOnFirstInstall(callback: () => void) {
    browser.runtime.onInstalled.addListener(details => {
      callback();
    });
  }
}

export class BrowserProvider {
  static getBrowser(): Browser {
    // getBrowserInfo is firefox only https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/runtime/getBrowserInfo
    if (window.chrome && !('getBrowserInfo' in window.chrome.runtime)) {
      return new ChromeBrowser();
    }

    if (browser) {
      return new FirefoxBrowser();
    }

    throw 'Unsupported Browser';
  }
}
