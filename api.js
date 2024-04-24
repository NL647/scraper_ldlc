const puppeteer = require('puppeteer');
const fastify = require('fastify')({ logger: true });
const path = require('path');

const popupSelector = '#cookieConsentBanner > div';
const acceptButtonSelector = '#cookieConsentRefuseButton';

async function acceptCookiesFromPopup(page, popupSelector, acceptButtonSelector) {
    try {
        await page.waitForSelector(popupSelector);
        await page.click(acceptButtonSelector);
        return true;
    } catch (error) {
        console.error('Error handling the cookie popup:', error);
        return false;
    }
}

async function scrapeData(ref) {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        const url = `https://www.ldlc.com/fr-be/fiche/${ref}.html`;
        await page.goto(url);

        await acceptCookiesFromPopup(page, popupSelector, acceptButtonSelector);

        const xpathExpressions = [
            '/html/body/div[4]/div[2]/div[1]/h1', // Title
            '/html/body/div[4]/div[2]/div[2]/div[3]/aside/div[1]/div', // Price
            '/html/body/div[4]/div[2]/div[2]/div[2]/p[1]', // Description
            '/html/body/div[4]/div[2]/div[2]/div[3]/aside/div[4]/div/div[2]/div/span', // Availability
            '/html/body/div[4]/div[2]/div[2]/div[1]/div[2]/div/div[1]/div[3]/a/img' // Image URL
        ];

        const scrapedValues = [];

        for (const xpath of xpathExpressions) {
            const node = await page.waitForSelector('xpath/' + xpath);
            const textContent = await page.evaluate(node => node.textContent.trim(), node);
            scrapedValues.push(textContent);
        }

        const imageURLNode = await page.waitForSelector('xpath/' + xpathExpressions[4]);
        const imageURL = await page.evaluate(node => node.getAttribute('src'), imageURLNode);
        scrapedValues.push(imageURL);

        await browser.close();

        const scrapedData = {
            title: scrapedValues[0],
            price: scrapedValues[1],
            description: scrapedValues[2],
            availability: scrapedValues[3],
            imageURL: scrapedValues[4],
            ref: ref
        };

        // Log the pretty JSON response
        console.log(JSON.stringify(scrapedData, null, 2));

        return scrapedData;
    } catch (error) {
        console.error('Error occurred during scraping:', error);
        return { error: 'Internal Server Error' };
    }
}



fastify.post('/scrape', async (request, reply) => {
    try {
        const { ref } = request.body;
        const scrapedData = await scrapeData(ref);
        reply.send(scrapedData);
    } catch (error) {
        console.error('Error occurred during scraping:', error); // Log the error for debugging
        reply.status(500).send({ error: 'Internal Server Error' }); // Send a generic error message
    }
});

const start = async () => {
    try {
        await fastify.listen(3000, '0.0.0.0');
        fastify.log.info(`Server listening on ${fastify.server.address().port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
