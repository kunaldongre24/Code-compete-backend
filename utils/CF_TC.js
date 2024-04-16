const { Builder, By, until, Select } = require("selenium-webdriver");
const { Options } = require("selenium-webdriver/chrome");
const axios = require("axios");

class CF_TC {
  constructor() {
    let chromeOptions = new Options();
    chromeOptions.addArguments("--disable-extensions");
    chromeOptions.addArguments("--headless");
    chromeOptions.addArguments("--no-sandbox");
    chromeOptions.addArguments("--disable-dev-shm-usage");
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
    await this.driver.get(
      `${this.base_url}contest/${contest_id}/status/${problem_index}?order=BY_CONSUMED_TIME_ASC`
    );

    try {
      await this.driver.wait(
        until.elementLocated(By.css(".verdict-accepted")),
        10000
      );
      let submissionIdElement = await this.driver.findElement(
        By.css(".verdict-accepted")
      );
      let submissionRow = await submissionIdElement.findElement(
        By.xpath("./ancestor::tr")
      );
      let submissionLink = await submissionRow.findElement(
        By.css(".view-source")
      );
      let submissionId = await submissionLink.getAttribute("submissionid");

      return [true, submissionId];
    } catch (error) {
      console.error(error);
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
    try {
      let problem_exist = await this._isProblemExists(contest_id, problem_num);
      if (!problem_exist[0]) {
        return problem_exist;
      }
      let submission_id = await this._getSubmissionID(contest_id, problem_num);
      if (!submission_id[0]) {
        return submission_id;
      }
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
      if (
        await this.wait_till_load('//*[@id="pageContent"]/div[4]/div[3]', 3)
      ) {
        let inputs = await this.driver.findElements(By.className("input"));
        let outputs = await this.driver.findElements(By.className("output"));
        let tc = [];
        for (let i = 0; i < inputs.length; i++) {
          let inputText = await inputs[i].getText();
          let outputText = await outputs[i].getText();
          const inputCount = (inputText.match(/\.\.\./g) || []).length;

          const outputCount = (outputText.match(/\.\.\./g) || []).length;

          if (inputCount !== 1 && outputCount !== 1) {
            tc.push([inputText, outputText]);
          }
        }
        tc = tc.slice(1);
        await this.close();
        return [true, tc];
      }
      await this.close();
      return [false, "Error while finding test cases"];
    } catch (err) {
      console.error(err);
      return [false, "Error while finding test cases"];
    }
  }

  async wait_till_load(xpath_value, delay = 3) {
    try {
      await this.driver.wait(
        until.elementLocated(By.xpath(xpath_value)),
        3 * 1000
      );
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = CF_TC;
