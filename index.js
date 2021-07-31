const puppeteer = require('puppeteer');
const CREDS = require('./creds')
 
const scrollTo = async(page, selector) =>{
    // scroll selector into view
    await page.evaluate(selector => {
        const element = document.querySelector(selector);
        if ( element ) {
            element.scrollTop = element.offsetTop;
            console.log(`Scrolled to selector ${selector}`);
        } else {
            console.error(`Cannot find selector ${selector}`);
        }
    }, selector);
}

const loginIntoAccount = async (page) => {
    await page.click('#login-button');

    await page.type('#UserEmail', CREDS.username);
    await page.type('#LoginPassword', CREDS.password);
    await Promise.all([
        page.click('#btnLogin_popup'),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
}

const searchForRooms = async (page) =>{
    await Promise.all([
        page.click('#btn-search'),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
}

const openAdvert = async (page, n) =>{
    await Promise.all([
        page.click(`#roomAdvert_${n} > div`),
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);
}

const reactToAdvert = async (page) =>{
    await Promise.all([
        page.evaluate(() => {autofill('custom')}),
        page.evaluate(() => {document.querySelector('#BtnSendMessage').click()})
    ]);
}

const urlsOfUnwatchedAdverts = async (page) =>{
    return await page.$$eval("#search-results-page-1 > div > div > div", adverts =>{
        adverts = adverts.filter(advert =>{
            output = true
            try{
                output = !advert.querySelector(`#icon-conv-${advert.getAttribute("data-roomid")}`)
            }catch{
                console.log(":(")
            }
            console.log(output)
            return output
        })
        links = adverts.map(advert => advert.getAttribute("href"))

        return links
    })
}



(async () => {
    const browser = await puppeteer.launch({ 
        headless: true, 
        // args: [
        //     '--no-sandbox',
        //     '--disable-setuid-sandbox'
        // ] 
    });
    const page = await browser.newPage(); 

    await page.setViewport({width: 1200, height: 720});
    await page.goto('https://kamernet.nl', { waitUntil: 'networkidle0' });
    
    await loginIntoAccount(page)
    await searchForRooms(page)
    // await page.goto('https://kamernet.nl/huren/kamers-groningen?pageno=1', { waitUntil: 'networkidle0' });

    let urls = await urlsOfUnwatchedAdverts(page)

    if(urls.length != 0)
        for(let i=0; i<urls.length; i++){
            let url = urls[i]    
            await page.goto(url, { waitUntil: 'networkidle0' });
            await scrollTo(page, "#BtnSendMessage")
            await reactToAdvert(page)

            console.log(`sent message to ${url}`)
        }
    else
        console.log("There is nothing new")

    await browser.close();
})().catch(function (err) {
    console.error(err)
    console.log("Promise Rejected");
});
