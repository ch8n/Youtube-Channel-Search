const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const pretty = require("pretty");
const beautify = require("json-beautify");
const _ = require("lodash");
const fs = require("fs");

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const scrapYoutubeCard = async (html) => {
  const $ = cheerio.load(html);
  const videoTitles = $("#contents");
  let videoDetails = [];

  videoTitles.each((index, element) => {
    const title = $(element).find("yt-formatted-string").attr("aria-label");
    const image = $(element).find("#thumbnail > yt-image > img").attr("src");
    const videoUrl = $(element).find("#thumbnail").attr("href");
    let time = "";
    let views = "";
    let others = "";

    $(element)
      .find("#metadata-line > span")
      .each((index, _element) => {
        const metaText = $(_element).text();
        const isView = _.includes(metaText, "views");
        const isTime = _.includes(metaText, "ago");
        if (isView) {
          views = metaText;
        } else if (isTime) {
          time = metaText;
        } else {
          others = metaText;
        }
      });

    videoDetails = [
      ...videoDetails,
      {
        image,
        video: `https://www.youtube.com${videoUrl}`,
        title,
        time,
        views,
        others,
      },
    ];
  });

  videoDetails.map((videoStr) => {
    "Page Transitions In React - React Router V6 and Framer Motion Tutorial by PedroTech 8 months ago 14 minutes, 16 seconds 121,274 views";
    const words = _.split(videoStr, " ");
  });

  return videoDetails;
};

const getHtmlContent = async (page) => {
  const htmlContent = await page.evaluate(() => {
    return document.documentElement.innerHTML;
  });
  return htmlContent;
};

async function scrapeInfiniteScrollPage(page, scrollDelay = 1000) {
  let items = [];
  try {
    let previousHeight;
    while (items.length < 100) {
      items = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("#items .item")).map(
          (item) => item.innerText
        );
      });
      previousHeight = await page.evaluate("document.body.scrollHeight");
      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
      await page.waitForFunction(
        `document.body.scrollHeight > ${previousHeight}`
      );
      await page.waitFor(scrollDelay);
    }
  } catch (e) {
    console.error(e);
  }
  return items;
}

const scrollDown = async (page, times) => {
  for (let index = 0; index < times; index++) {
    await delay(100);
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
  }
};

const sortByTime = async (cardContents) => {
  let minutes = [];
  let hours = [];
  let days = [];
  let weeks = [];
  let months = [];
  let years = [];

  cardContents.forEach((card) => {
    const isMin = _.includes(card.time, "minute");
    const isHour = _.includes(card.time, "hour");
    const isDay = _.includes(card.time, "day");
    const isWeek = _.includes(card.time, "week");
    const isMonth = _.includes(card.time, "month");
    const isYear = _.includes(card.time, "year");
    if (isMin) minutes = [...minutes, card];
    if (isHour) hours = [...hours, card];
    if (isDay) days = [...days, card];
    if (isWeek) weeks = [...weeks, card];
    if (isMonth) months = [...months, card];
    if (isYear) years = [...years, card];
  });

  const sortedMin = _.sortBy(minutes, [
    (card) => {
      const timeValueStr = _.split(card.time, "minute")[0];
      const timeValue = _.toNumber(timeValueStr.trim());
      return timeValue;
    },
  ]);

  const sortedHours = _.sortBy(hours, [
    (card) => {
      const timeValueStr = _.split(card.time, "hour")[0];
      const timeValue = _.toNumber(timeValueStr.trim());
      return timeValue;
    },
  ]);

  const sortedDays = _.sortBy(days, [
    (card) => {
      const timeValueStr = _.split(card.time, "day")[0];
      const timeValue = _.toNumber(timeValueStr.trim());
      return timeValue;
    },
  ]);

  const sortedWeeks = _.sortBy(weeks, [
    (card) => {
      const timeValueStr = _.split(card.time, "week")[0];
      const timeValue = _.toNumber(timeValueStr.trim());
      return timeValue;
    },
  ]);

  const sortedMonths = _.sortBy(months, [
    (card) => {
      const timeValueStr = _.split(card.time, "month")[0];
      const timeValue = _.toNumber(timeValueStr.trim());
      return timeValue;
    },
  ]);

  const sortedYears = _.sortBy(years, [
    (card) => {
      const timeValueStr = _.split(card.time, "year")[0];
      const timeValue = _.toNumber(timeValueStr.trim());
      return timeValue;
    },
  ]);
  const sortedByTime = [
    ...sortedMin,
    ...sortedHours,
    ...sortedDays,
    ...sortedWeeks,
    ...sortedMonths,
    ...sortedYears,
  ];
  return sortedByTime;
};

const saveJson = async (channel, query, content) => {
  const json = beautify(content, null, 2);
  const safeQuery = _.replace(query, " ", "_");
  console.log(safeQuery);
  fs.writeFileSync(`${channel}+${safeQuery}.json`, json);
};

const saveHtml = async (channel, query, contents) => {
  const { renderFile } = require("pug");
  const res = renderFile("Template.pug", { contents });

  const safeQuery = _.replace(query, " ", "_");
  fs.writeFileSync(`${channel}+${safeQuery}.html`, pretty(res));
};

const runPuppeteer = async (channel, query) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--disable-setuid-sandbox", `--window-size=1920,1080`],
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
    ignoreHTTPSErrors: true,
  });
  const page = await browser.newPage();
  await page.goto(`https://www.youtube.com/${channel}/search?query=${query}`, {
    waitUntil: "networkidle2",
  });
  await scrollDown(page, 5);
  const html = await getHtmlContent(page);
  const cardContent = await scrapYoutubeCard(html);
  const sortedContent = await sortByTime(cardContent);
  await saveJson(channel, query, sortedContent);
  await saveHtml(channel, query, sortedContent);
  await page.screenshot({ path: "utube.png", fullPage: true });
  await browser.close();
};

try {
  runPuppeteer("@PedroTechnologies", "tailwind");
  //runPuppeteer("@DevoxxForever", "kotlin");
} catch (error) {
  log.error(error);
}
