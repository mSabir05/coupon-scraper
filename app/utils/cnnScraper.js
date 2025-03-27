// import { chromium } from 'playwright';
import { chromium } from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const isLocal = !!process.env.CHROME_EXECUTABLE_PATH;



async function scrapeCNNCoupons(urls) { 
    const browser = await puppeteer.launch({
        args: isLocal ? puppeteer.defaultArgs() : [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
        defaultViewport: {
            width: 1480,
            height: 900
        },
        executablePath: process.env.CHROME_EXECUTABLE_PATH || await chromium.executablePath(),
        headless: true
    });
    let coupons = [];

    for (const url of urls) {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3');
        await page.setViewport({ width: 1480, height: 900 });
        let codesFetched = 0;

        while (codesFetched < 10) {
            try {
                await page.goto(url, { waitUntil: 'networkidle0' });
                await page.waitForSelector('div._1ip0fbda._1ip0fbdb._1ip0fbdc');

                // Remove "SEE DEAL" buttons
                await page.evaluate(() => {
                    let buttons;
                    do {
                        buttons = Array.from(document.querySelectorAll('div._1ip0fbda._1ip0fbdb._1ip0fbdc div[role="button"][title="See code"]'));
                        buttons.forEach(button => {
                            if (button.innerText.includes("SEE DEAL")) {
                                button.remove();
                            }
                        });
                    } while (buttons.length > 0 && buttons.some(button => button.innerText.includes("SEE DEAL")));
                });

                // Remove processed buttons
                await page.evaluate((codesFetched) => {
                    for (let i = 0; i < codesFetched; i++) {
                        document.querySelector(`div._1ip0fbda._1ip0fbdb._1ip0fbdc div[role="button"][title="See code"]`)?.remove();
                    }
                }, codesFetched);

                const buttonsLeft = await page.$$('div._1ip0fbda._1ip0fbdb._1ip0fbdc div[role="button"][title="See code"]');
                if (buttonsLeft.length === 0) {
                    console.log('No more coupon buttons left to process on this URL.');
                    break;
                }

                const coupon = await page.evaluate((codesFetched) => {
                    const couponTile = document.querySelectorAll('div._1ip0fbda._1ip0fbdb._1ip0fbdc')[codesFetched];
                    return {
                        title: couponTile.querySelector('h3.az57m40.az57m4e')?.innerText.trim() || '',
                        expiration: couponTile.querySelector('span.az57m40.az57m4c')?.innerText.trim() || '',
                        type: couponTile.querySelector('span.coupon-tile-type')?.innerText.trim() || ''
                    };
                }, codesFetched);

                if (coupon.type === '') {
                    console.log(`Processing coupon ${codesFetched + 1}: ${coupon.title}`);

                    const [newPage] = await Promise.all([
                        browser.waitForTarget(target => target.opener() === page.target()),
                        page.click(`div._1ip0fbda._1ip0fbdb._1ip0fbdc div[role="button"][title="See code"]`)
                    ]).then(async ([target]) => [await target.page()]);

                    await newPage.waitForSelector('h4.az57m40.az57m46._1s9cypgb', { timeout: 5000 })
                        .catch(() => null);

                    const couponCode = await newPage.evaluate(() => {
                        const codeElement = document.querySelector('h4[class*="az57m"]');
                        return codeElement ? codeElement.innerText.trim() : 'No code available';
                    });

                    let terms = '';
                    const collapsiblePanel = await newPage.$('div[data-testid="voucherPopup-collapsablePanel-header"] button');
                    const imagelogo = await newPage.evaluate(() => {
                        const img = document.querySelector('.rw4de07 img');
                        return img ? img.src : null;
                    });

                    if (collapsiblePanel) {
                        await collapsiblePanel.click();
                        await newPage.waitForSelector('div[data-testid="voucherPopup-collapsablePanel-contentPanel"]', 
                            { timeout: 6000 });
                        terms = await newPage.evaluate(() => {
                            const element = document.querySelector('div._1mq6bor0._1mq6bor9._1mq6bor2');
                            return element ? element.innerHTML.trim() : '';
                        });
                    }

                    coupons.push({
                        Company: url.replace('https://coupons.cnn.com/', ''),
                        Title: coupon.title,
                        ExpiryDate: coupon.expiration,
                        Code: couponCode,
                        Terms: terms,
                        Logo: imagelogo
                    });

                    await newPage.close();
                    codesFetched++;
                    await delay(1000);
                } else {
                    codesFetched++;
                }
            } catch (error) {
                console.error(`Error processing ${url}: ${error.message}`);
                break;
            }
        }
        await page.close(); // Changed from context.close()
    }
    await browser.close();
    await saveCouponsToExcel(coupons);
    return './coupons_cnn.xlsx';
}

function saveCouponsToExcel(newCoupons) {
    try {
        if (!Array.isArray(newCoupons) || newCoupons.length === 0) {
            console.log('No new coupons to save');
            return null;
        }

        const fileName = 'coupons_cnn.xlsx';
        const publicDir = path.join(process.cwd(), 'public');
        const filePath = path.join(publicDir, fileName);

        // Create public directory if it doesn't exist
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        // Create new workbook
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(newCoupons, {
            header: ['Company', 'Title', 'ExpiryDate', 'Code', 'Terms', 'Logo']
        });
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Coupons');
        
        try {
            // Write to a buffer first
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            
            // Write buffer to file
            fs.writeFileSync(filePath, buffer);
            console.log(`File saved successfully at: ${filePath}`);
            return fileName;
        } catch (writeError) {
            console.error('Error writing file:', writeError);
            // Try alternative save method
            try {
                const tempPath = path.join(publicDir, `temp_${Date.now()}_${fileName}`);
                XLSX.writeFile(workbook, tempPath);
                fs.renameSync(tempPath, filePath);
                console.log(`File saved successfully using alternative method at: ${filePath}`);
                return fileName;
            } catch (altError) {
                console.error('Alternative save method failed:', altError);
                throw new Error('Failed to save file using both methods');
            }
        }
    } catch (error) {
        console.error('Error in saveCouponsToExcel:', error);
        throw error;
    }
}

export { scrapeCNNCoupons };