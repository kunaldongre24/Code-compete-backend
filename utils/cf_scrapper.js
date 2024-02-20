const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeProblemDetails(cid, pid) {
  try {
    const response = await axios.get(
      `https://codeforces.com/problemset/problem/${cid}/${pid}`
    );
    const html = response.data;
    const $ = cheerio.load(html);

    const title = $(".problem-statement .title").html();
    const timeLimitText = $(".time-limit").html();
    const timeLimit = timeLimitText
      ? parseFloat(timeLimitText.match(/\d+(\.\d+)?/)[0])
      : null; // Extract the numerical value

    const memoryLimitText = $(".memory-limit").html();
    const memoryLimit = memoryLimitText
      ? parseFloat(memoryLimitText.match(/\d+(\.\d+)?/)[0])
      : null;
    const description = $("div.ttypography > div > div:nth-child(2)").html();
    const input_specification = $(
      "div.ttypography > div > div.input-specification"
    );
    input_specification.find(".section-title").remove();
    const output_specification = $(
      "div.ttypography > div > div.output-specification"
    );
    output_specification.find(".section-title").remove();

    const samples = [];
    const sampleTest = $(".sample-tests .sample-test");
    const inputElements = sampleTest.find(".input pre");
    const outputElements = sampleTest.find(".output pre");

    inputElements.each((index, element) => {
      const input = $(element).html();
      const output = $(outputElements[index]).html();
      samples.push({ input, output });
    });

    const note = $("div.ttypography > div > div.note");
    note.find(".section-title").remove();

    const problemDetails = {
      title,
      timeLimit,
      memoryLimit,
      description,
      input_specification: input_specification.html(),
      output_specification: output_specification.html(),
      samples,
      note: note.html(),
    };

    return { status: 1, problemDetails };
  } catch (error) {
    console.error("Error:", error);
    return { status: 0 };
  }
}
module.exports = scrapeProblemDetails;
