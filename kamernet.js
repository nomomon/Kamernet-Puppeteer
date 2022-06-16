// scroll selector into view
import Settings from "./settings.js";
import puppeteer from "puppeteer";
import chalk from "chalk";

async function scrollTo(page, selector) {
    await page.evaluate(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.scrollTop = element.offsetTop;
            console.log(`Scrolled to selector ${selector}`);
        } else {
            console.error(`Cannot find selector ${selector}`);
        }
    }, selector);
}

async function loginIntoAccount(page) {
    await page.click('#login-button');

    await page.type('#UserEmail', Settings.USERNAME);
    await page.type('#LoginPassword', Settings.PASSWORD);
    await Promise.all([
        page.click('#btnLogin_popup'),
        page.waitForNavigation({waitUntil: 'networkidle0'}),
    ]);
}

async function searchForRooms(page) {
    await Promise.all([
        page.click('#btn-search'),
        page.waitForNavigation({waitUntil: 'networkidle0'}),
    ]);
}

async function openAdvert(page, n) {
    await Promise.all([
        page.click(`#roomAdvert_${n} > div`),
        page.waitForNavigation({waitUntil: 'networkidle0'}),
    ]);
}

async function reactToAdvert(page) {
    await Promise.all([
        page.evaluate(() => {
            autofill('custom')
        }),
        page.evaluate(() => {
            document.querySelector('#BtnSendMessage').click()
        })
    ]);
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
    try {
        const browser = await puppeteer.launch({
            headless: true,
            // args: [
            //     '--no-sandbox',
            //     '--disable-setuid-sandbox'
            // ]
        });
        const page = await browser.newPage();

        await page.setViewport({width: 1200, height: 720});
        await page.goto('https://kamernet.nl/nl', {waitUntil: 'networkidle0'})
            .catch(async () => {
                await browser.close();
                lookForRooms().catch(err => {
                    console.error(chalk.red(err))
                    console.log("Promise Rejected");
                });
            })

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

                await page.goto(url, {waitUntil: 'networkidle0'});
                try {
                    await scrollTo(page, "#BtnSendMessage")
                    await reactToAdvert(page)
                    console.log(`${chalk.green("[SUCCESS]: ")}Message sent to ${url}`)
                } catch (e) {
                    console.log(`${chalk.red("[FAILURE]: ")}Failed to send message to ${url}`);
                }

            }
        }


        await browser.close();
    } catch (e) {
        console.log(chalk.red("[UNEXPECTED ERROR]: "), e);
    }
}
