const puppeteer = require("puppeteer");
let browserCount = 0;

const pages = new Map();
let browser; // Declare the browser variable outside the function scope

function checkEmpty(val) {
  return val === null || val.match(/^ *$/) !== null ? 0 : val;
}

async function scrapeDynamicContent(eventId, onData) {
  let page;

  if (pages.has(`${eventId}`)) {
    page = pages.get(`${eventId}`);
  } else {
    if (!browser) {
      browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox"],
      });
      browserCount++;
      console.log("count " + browserCount);
    }
    page = await browser.newPage();
    pages.set(`${eventId}`, page);
  }

  await page.goto(`https://www.lc247.live/#/fullmarkets/${eventId}`);
  const interval = setInterval(async () => {
    try {
      await page.waitForSelector("table#bookMakerMarketList");

      const bmRows = await page.$$('tr[id^="bookMakerSelection_"]');
      const bmData = await Promise.all(
        bmRows.map(async (row, index) => {
          const tds = await row.$$("td");
          const back1Value = await tds[0].$eval(
            "dd#back_1 a",
            (a) => a.textContent
          );
          const lay1Value = await tds[1].$eval(
            "dd#lay_1 a",
            (a) => a.textContent
          );

          return {
            sid: index + 1,
            nat: await row.$eval("th", (th) => th.textContent),
            l1: checkEmpty(lay1Value),
            ls1: checkEmpty(lay1Value),
            mname: "Bookmaker",
            b1: checkEmpty(back1Value),
            bs1: checkEmpty(back1Value),
          };
        })
      );

      const rows = await page.$$('tr[id^="fancyBetMarket_"]');
      const data = await Promise.all(
        rows.map(async (row, index) => {
          const tds = await row.$$("td");
          const nat = await row.$eval("th", (th) => th.textContent);

          // Add a condition to exclude specific nat values
          if (
            !nat.toLowerCase().includes(" even ") &&
            !nat.toLowerCase().includes(" odd ") &&
            !nat.toLowerCase().includes(" to ") &&
            !nat.toLowerCase().includes("total match") &&
            !nat.toLowerCase().includes(" face ") &&
            !nat.toLowerCase().includes("highest") &&
            !nat.toLowerCase().includes("playing") &&
            !nat.toLowerCase().includes("favourite") &&
            !nat.toLowerCase().includes("lunch") &&
            !nat.toLowerCase().includes("total") &&
            !nat.toLowerCase().includes("method") &&
            !nat.toLowerCase().includes("bhav")
          ) {
            const lay1Value = await tds[0].$eval("a#runsInfo", (a) => {
              const text = a.innerText.trim();
              return text.split("\n")[0].trim();
            });
            const lay1SpanValue = await tds[0].$eval(
              "a#runsInfo span",
              (span) => span.textContent
            );
            const back1Value = await tds[1].$eval("a#runsInfo", (a) => {
              const text = a.innerText.trim();
              return text.split("\n")[0].trim();
            });
            const back1SpanValue = await tds[1].$eval(
              "a#runsInfo span",
              (span) => span.textContent
            );

            return {
              sid: index + 1,
              nat: await row.$eval("th", (th) => th.textContent),
              srno: index + 1,
              gstatus: "",
              l1: checkEmpty(lay1Value),
              ls1: checkEmpty(lay1SpanValue),
              b1: checkEmpty(back1Value),
              bs1: checkEmpty(back1SpanValue),
            };
          } else {
            return null; // Exclude the row by returning null
          }
        })
      );

      const format = {
        BMmarket: { bm1: bmData, bm2: [] },
        Fancymarket: data.filter((item) => item !== null),
        eventId,
      };
      onData(format); // Invoke the callback function with the new data
    } catch (error) {
      console.error("Error scraping dynamic content lc");
      if (pages.has(`${eventId}`)) {
        await page.close();
        pages.delete(`${eventId}`);
      }
      clearInterval(interval);
    }
  }, 500);
}

module.exports = { pages, scrapeDynamicContent };
