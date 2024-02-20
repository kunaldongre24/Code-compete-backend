const { Builder, By, until, Select } = require("selenium-webdriver");
const { Options } = require("selenium-webdriver/chrome");
const axios = require("axios");

class CF_TC {
  constructor() {
    let chromeOptions = new Options();
    chromeOptions.addArguments("--disable-extensions");
    chromeOptions.addArguments("--headless");
    chromeOptions.excludeSwitches("enable-logging");

    // Disable logging
    this.driver = new Builder()
      .forBrowser("chrome")
      .setChromeOptions(chromeOptions)
      .build();
    this.base_url = "https://codeforces.com/";
    this.close = () => this.driver.quit();
  }

  async _getSubmissionID(contest_id, problem_index) {
    await this.driver.get(`${this.base_url}contest/${contest_id}/status`);

    if (await this.wait_till_load('//*[@id="frameProblemIndex"]')) {
      let select = new Select(
        await this.driver.findElement(By.xpath('//*[@id="frameProblemIndex"]'))
      );
      await select.selectByIndex(
        problem_index.charCodeAt(0) - "A".charCodeAt(0) + 1
      );
    } else {
      return [null, "Error while filtering problem index"];
    }

    if (
      await this.wait_till_load(
        `//*[@id="pageContent"]/div[2]/div[6]/table/tbody/tr[2]/td[1]/a`
      )
    ) {
      let content = await this.driver.findElement(
        By.xpath(
          `//*[@id="pageContent"]/div[2]/div[6]/table/tbody/tr[2]/td[1]/a`
        )
      );
      return [true, await content.getText()];
    } else {
      return [null, "Error while finding Submission ID "];
    }
  }

  async _isProblemExists(contest_id, problem_num) {
    let url = `${this.base_url}api/contest.standings?contestId=${contest_id}&from=1&count=1`;
    let response = await axios.get(url);
    let r = response.data;

    if (r["status"] !== "OK") {
      let x = prompt(
        "Codeforces API is down.\nDo you still want to continue (y/n): "
      );
      if (x === "n") {
        return [null, "Codeforces API is down"];
      }
    }

    for (let i of r["result"]["problems"]) {
      if (String(problem_num) === i["index"]) {
        return [true, "Problem found"];
      }
    }
    return [null, "Problem does not exists"];
  }

  async get_testcases(contest_id, problem_num) {
    let problem_exist = await this._isProblemExists(contest_id, problem_num);
    if (!problem_exist[0]) {
      return problem_exist;
    }
    console.log("Found the problem");
    let submission_id = await this._getSubmissionID(contest_id, problem_num);
    if (!submission_id[0]) {
      return submission_id;
    }
    console.log(
      `https://codeforces.com/contest/${contest_id}/submission/${submission_id[1]}`
    );
    await this.driver.get(
      `https://codeforces.com/contest/${contest_id}/submission/${submission_id[1]}`
    );

    if (
      await this.wait_till_load(
        "/html/body/div[6]/div[4]/div/div[4]/div[2]/a",
        10
      )
    ) {
      let click_btn = await this.driver.findElement(
        By.xpath("/html/body/div[6]/div[4]/div/div[4]/div[2]/a")
      );
      await click_btn.click();
    }
    if (await this.wait_till_load('//*[@id="pageContent"]/div[4]/div[3]', 10)) {
      let inputs = await this.driver.findElements(By.className("input"));
      let outputs = await this.driver.findElements(By.className("output"));
      let tc = [];
      for (let i = 0; i < inputs.length; i++) {
        let inputText = await inputs[i].getText();
        let outputText = await outputs[i].getText();
        if (!inputText.includes("...") && !outputText.includes("...")) {
          tc.push([inputText, outputText]);
        }
      }
      tc = tc.slice(1);
      console.log(`Total test cases found : ${tc.length}`);
      await this.close();
      return [true, tc];
    }
    await this.close();
    return [false, "Error while finding test cases"];
  }

  async wait_till_load(xpath_value, delay = 3) {
    try {
      await this.driver.wait(
        until.elementLocated(By.xpath(xpath_value)),
        100 * 1000
      );
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = CF_TC;
