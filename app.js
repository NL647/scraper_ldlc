const puppeteer = require('puppeteer');
const Table = require('cli-table');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');



const popupSelector = '#cookieConsentBanner > div'
const acceptButtonSelector = '#cookieConsentRefuseButton'
//close cookie banniere clicking on refuse button
async function acceptCookiesFromPopup(page, popupSelector, acceptButtonSelector) {
  try {
    // Waiting for the cookie consent popup to appear
    await page.waitForSelector(popupSelector);

    // Clicking the "Accept" button to accept cookies
    await page.click(acceptButtonSelector);

    // Cookies have been accepted successfully
    return true;
  } catch (error) {
    // An error occurred while accepting cookies
    console.error('Error handling the cookie popup:', error);
    return false;
  }
}

async function run(url) {
  const browser = await puppeteer.launch({ headless: true }); // Change 'headless' to false to see the browser
  const page = await browser.newPage();

  
  await page.goto(url);
   // Accept cookies and wait for banner to close
   await acceptCookiesFromPopup(page, popupSelector, acceptButtonSelector);
   

  const xpathExpressions = [
    '/html/body/div[4]/div[2]/div[1]/h1', // Title
    '/html/body/div[4]/div[2]/div[2]/div[3]/aside/div[1]/div', // Price
    '/html/body/div[4]/div[2]/div[2]/div[2]/p[1]', // Description
    '/html/body/div[4]/div[2]/div[2]/div[3]/aside/div[4]/div/div[2]/div/span', // Availability
    '/html/body/div[4]/div[2]/div[2]/div[1]/div[2]/div/div[1]/div[3]/a/img' // Image URL
  ];

  try {
    // Array to store the scraped values
    const scrapedValues = [];

    for (const xpath of xpathExpressions) {
      // Wait for the element with the specified XPath to appear
      const node = await page.waitForSelector('xpath/' + xpath);

      // Extract text content using evaluate
      const textContent = await page.evaluate(node => node.textContent.trim(), node);

      // If it's the image URL, extract the src attribute
      if (xpath.includes('img')) {
        const imageURL = await page.evaluate(node => node.getAttribute('src'), node);
        scrapedValues.push(imageURL);
      } else {
        // Push the scraped value to the array
        scrapedValues.push(textContent);
      }
    }

    // Extract reference number from URL
    const url = await page.evaluate(() => window.location.href);
    const ref = url.split('/').pop().split('.')[0];

    // Download the image and save it with the reference number as the filename
    const imagePath = path.join(__dirname,'images', ref + '.jpg');
    const imageURL = scrapedValues[4];
    const imageBuffer = await page.goto(imageURL);
    await fs.writeFile(imagePath, await imageBuffer.buffer());

    // Add reference number and image path to scraped values
    scrapedValues.push(ref);
    scrapedValues.push(imagePath);

    // Display the scraped values in a tableau
    const table = new Table({
      head: ['Champs', 'Valeur'],
      colWidths: [20, 100]
    });

    scrapedValues[1] = scrapedValues[1].replace('€', '.') + '€';

    table.push(
      ['Titre', scrapedValues[0]],
      ['Prix', scrapedValues[1]],
      ['Description', scrapedValues[2].replace('.', '.\n')],
      ['Disponibilité', scrapedValues[3]],
      ['Image URL', scrapedValues[4]],
      ['Ref', scrapedValues[5]],
      ['Image Path', scrapedValues[6]]
    );

    // Add scraped values to SQLite database
    const db = new sqlite3.Database('scraped_data.db');
    db.serialize(function () {
      db.run("CREATE TABLE IF NOT EXISTS products (title TEXT, price TEXT, description TEXT, availability TEXT, imageURL TEXT, ref TEXT, imagePath TEXT)");

      const insertStmt = db.prepare("INSERT INTO products (title, price, description, availability, imageURL, ref, imagePath) VALUES (?, ?, ?, ?, ?, ?, ?)");
      insertStmt.run(scrapedValues[0], scrapedValues[1], scrapedValues[2], scrapedValues[3], scrapedValues[4], scrapedValues[5], scrapedValues[6]);
      insertStmt.finalize();

      console.log("Scraped data added to SQLite db.");
    });

    db.close();
    console.log(table.toString());
  } catch (error) {
    console.error('Error occurred:', error);
  } finally {
    // Close the browser
    await browser.close();
  }
}

//read urls from texte file and scrap data
async function readFileAndRun() {
  try {
    const data = await fs.readFile('./file.txt', 'utf-8');
    const array = data.toString().split("\n");
    for (const line of array) {
      console.log(line);
      await run(line);
    }
  } catch (err) {
    console.error('Error occurred:', err);
  }
}

readFileAndRun();
