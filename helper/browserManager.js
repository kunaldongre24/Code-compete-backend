const puppeteer = require("puppeteer");

class BrowserManager {
  constructor() {
    this.browser = null;
    this.browserPromise = null;
  }

  async launchBrowser() {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox"],
      });
      this.browser = await this.browserPromise;
    }
  }

  async getBrowser() {
    if (!this.browser) {
      await this.launchBrowser();
    }
    return this.browser;
  }

  async releaseBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.browserPromise = null;
    }
  }

  hasBrowser() {
    return !!this.browser;
  }
}

module.exports = { BrowserManager };
