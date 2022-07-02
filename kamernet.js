// scroll selector into view
import Settings from "./settings.js";
import puppeteer from "puppeteer";
import chalk from "chalk";
import fs from "fs/promises";

const DISTANCE_INDEX = {
    0: 1,
    1: 2,
    2: 3,
    5: 4,
    10: 5,
    20: 6
}

let myMessage = (await fs.readFile('message.txt')).toString().trim();
if (!myMessage)
    throw new Error(chalk.red("Please fill in message.txt!"));

function scrollTo(page, selector) {
    return page.$eval(selector, element => {
        element.scrollIntoView()
    });
}

async function loginIntoAccount(page) {
    await page.click('#login-button');

    await page.type('#UserEmail', Settings.USERNAME);
    await page.type('#LoginPassword', Settings.PASSWORD);
    await page.click('#btnLogin_popup')
    await page.waitForNavigation();
}

async function chooseDistance(page, distance) {
    let el = await page.waitForSelector('[aria-labelledby="select2-RadiusId__-container"]');
    el.click();

    let el2 = await page.waitForSelector('#select2-RadiusId__-results :nth-child(' + DISTANCE_INDEX[distance] + ')');
    el2.click();

    await delay(500);
}

async function searchForRooms(page) {
    await page.waitForSelector('.select2-selection__rendered');
    await chooseDistance(page, Settings.RADIUS);
    await page.click('#btn-search')
    await page.waitForNavigation({waitUntil: 'networkidle0'});
}

async function openAdvert(page, n) {
    await page.click(`#roomAdvert_${n} > div`);
    await page.waitForNavigation({waitUntil: 'networkidle0'});
}

const noInternationalBlacklist = [
    "no international",
    "no expats",
    "geen international",
    "only dutch",
].map(phrase => new RegExp(phrase, 'gui'));

function delay(ms) {
    return new Promise(r => setTimeout(r, ms))
}

async function reactToAdvert(page) {
    let description = String((await page.waitForSelector('.room-description')).innerText);

    if (Settings.INTERNATIONAL_STUDENT) {
        for (const phrase of noInternationalBlacklist) {
            if (description.search(phrase) !== -1) {
                throw new Error("No internationals")
            }
        }
    }

    await page.evaluate(myMessage => {
        $('#roomReactionFormMobileDesktop #Message').val(myMessage);
        updateAndExpandTextArea();

        $('#roomReactionFormMobileDesktop').submit();
    }, myMessage)

    await page.waitForSelector('#askLandlord > div > div.response.col.s12.m8.extra-margin.mobile-hide > a'); // wait for successfully sent message
}

async function urlsOfUnwatchedAdverts(page, pageNum) {
    // DEBUG:  page.on("console", a => {console.log(a.type().substring(0, 3).toUpperCase() + " " + a.text())})

    return await page.$$eval("#search-results-page-" + pageNum + " .rowSearchResultRoom .tile-wrapper", adverts => {

        console.log("adverts length: " + adverts.length);
        adverts = adverts.filter(advert => {
            let hasntReplied = true;
            let roomId = advert.getAttribute("data-roomid");
            try {
                hasntReplied = !advert.querySelector(`#icon-conv-${roomId}`)
            } catch {
                console.log(":(")
            }
            return hasntReplied;
        })

        let links = [];

        adverts.forEach(advert => {
            [...advert.getElementsByTagName("a")].forEach(a => {
                let link = a.getAttribute("href");
                if (links[links.length - 1] === link) return;

                if (link.startsWith("https://kamernet.nl/en/for-rent/") || link.startsWith("https://kamernet.nl/huren/")) {
                    links.push(link);
                }
            })
        })

        return links;
    })
}

export async function lookForRooms() {
    let browser, page;
    try {
        browser = await puppeteer.launch({
            headless: true, // set it false to see chrome
            defaultViewport: null,
            args: [
                '--start-maximized',
                '--disable-dev-shm-usage'
            ],
        });

        page = (await browser.pages())[0];

        await page.goto('https://kamernet.nl/nl')
        await page.waitForSelector("#login-button");

        console.log("Logging in to Kamernet...")
        await loginIntoAccount(page)

        console.log("Searching for rooms...")
        await searchForRooms(page)


        for (let pageNumber = 1; pageNumber <= Settings.PAGE_COUNT; pageNumber++) {
            await page.goto('https://kamernet.nl/en/for-rent/rooms-' + Settings.CITY.replace(/\s/g, '-') + '?pageno=' + pageNumber, {waitUntil: 'networkidle0'});

            console.log(chalk.red(" ===== Getting URLs on page " + pageNumber + " ====="));

            let urls = await urlsOfUnwatchedAdverts(page, pageNumber)

            if (urls.length === 0) {
                console.log(chalk.yellow("[INFO]: ") + "There is nothing new on this page!");
            }

            for (let i = 0; i < urls.length; i++) {
                let url = urls[i];

                console.log(chalk.grey(`Sending message to ${url.toString().substring("https://kamernet.nl".length)}`))

                await page.goto(url);
                try {
                    await reactToAdvert(page)
                    console.log(`${chalk.green("[SUCCESS]: ")}Message sent to ${url}`)
                } catch (e) {
                    console.log(`${chalk.red("[FAILURE]: ")}Failed to send message to ${url}`);
                    console.log(chalk.red(e));
                }
            }
        }

        await browser.close();
    } catch (e) {
        console.log(chalk.red("[UNEXPECTED ERROR]: " + e));
        await page.close();
        await browser.close();
        await lookForRooms()
    }
}
