import puppeteer from 'puppeteer';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';


// Custom delay function using setTimeout
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));


// Rename the function to match the import
async function scrapeCNNCoupons(urls) {
    const browser = await puppeteer.launch({ 
        headless: 'new',  // Use new headless mode
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    let coupons = [];

    for (const url of urls) {
        let page = await browser.newPage();
        // Set user-agent and viewport to mimic real browser behavior
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3');
        await page.setViewport({ width: 1480, height: 900 });

        let codesFetched = 0;  // Counter to track how many coupons have been processed

        while (codesFetched < 10) {  // Limiting to 10 coupons for testing, adjust as needed
            try {
                // Reload the main page on every iteration
                await page.goto(url, { waitUntil: 'networkidle2' });

                // Wait for the coupon elements to load
                await page.waitForSelector('div._1ip0fbda._1ip0fbdb._1ip0fbdc');
                await page.evaluate(() => {
                    let buttons;
                    do {
                        buttons = Array.from(document.querySelectorAll('div._1ip0fbda._1ip0fbdb._1ip0fbdc div[role="button"][title="See code"]'));
                        buttons.forEach(button => {
                            if (button.innerText.includes("SEE DEAL")) {
                                button.remove(); // Remove button if it contains "Get Deal"
                            }
                        });
                    } while (buttons.length > 0 && buttons.some(button => button.innerText.includes("SEE DEAL")));
                });

                // Remove the buttons of already processed coupons
                await page.evaluate((codesFetched) => {
                    for (let i = 0; i < codesFetched; i++) {
                        document.querySelector(`div._1ip0fbda._1ip0fbdb._1ip0fbdc div[role="button"][title="See code"]`).remove();
                    }
                }, codesFetched);

                const buttonsLeft = await page.evaluate(() => {
                    return document.querySelectorAll('div._1ip0fbda._1ip0fbdb._1ip0fbdc div[role="button"][title="See code"]').length > 0;
                });

                // Break the loop if no buttons are left
                if (!buttonsLeft) {
                    console.log('No more coupon buttons left to process on this URL.');
                    break;
                }

                // Select the next coupon data to process
                const coupon = await page.evaluate((codesFetched) => {
                    const couponTile = document.querySelectorAll('div._1ip0fbda._1ip0fbdb._1ip0fbdc')[codesFetched];
                    const title = couponTile.querySelector('h3.az57m40.az57m4e')?.innerText.trim() || '';
                    const callout = couponTile.querySelector('div.coupon-tile-callout')?.innerText.trim() || '';
                    const description = couponTile.querySelector('p.coupon-tile-description')?.innerText.trim() || '';
                    const type = couponTile.querySelector('span.coupon-tile-type')?.innerText.trim() || '';
                    const expiration = couponTile.querySelector('span.az57m40.az57m4c')?.innerText.trim() || '';

                    return {
                        title, callout, description, type, expiration, couponButtonExists: true
                    };
                }, codesFetched);

                // If there's a coupon button to click (valid COUPON CODE type)
                if (coupon.type === '') {
                    console.log(`Processing coupon ${codesFetched + 1}: ${coupon.title}`);

                    // Click the coupon button to open a new tab
                    const [newPage] = await Promise.all([
                        new Promise(resolve => browser.once('targetcreated', target => resolve(target.page()))),
                        page.click(`div._1ip0fbda._1ip0fbdb._1ip0fbdc div[role="button"][title="See code"]`) // Click the button
                    ]);

                    // Wait for the new page to load
                    await newPage.waitForSelector('h4.az57m40.az57m46._1s9cypgb', { timeout: 5000 }).catch(() => null);
                    // Adjust the selector if necessary

                    // Extract the coupon code from the new page
                    const couponCode = await newPage.evaluate(() => {
                        const codeElement = document.querySelector('h4[class*="az57m"]');
                        return codeElement ? codeElement.innerText.trim() : 'No code available';
                    });
					var terms = '';
                    const collapsiblePanel = await newPage.$('div[data-testid="voucherPopup-collapsablePanel-header"] button');
                    var imagelogo = await newPage.evaluate(() => {
                        const img = document.querySelector('.rw4de07 img');
                        return img ? img.src : null;
                    });
                    
                    console.log(imagelogo);
					if (collapsiblePanel) {
						await collapsiblePanel.click();  // Click the collapsible panel

						// Wait for the content inside the collapsible panel
						await newPage.waitForSelector('div[data-testid="voucherPopup-collapsablePanel-contentPanel"]', { timeout: 6000 });

						// Extract HTML content from the collapsible panel
						const collapsibleContentHtml = await newPage.evaluate(() => {
							const collapsibleElement = document.querySelector('div._1mq6bor0._1mq6bor9._1mq6bor2');
							return collapsibleElement ? collapsibleElement.innerHTML.trim() : '';
						});
						terms = collapsibleContentHtml;
					}
                    // Log the coupon code
                    console.log(`Coupon code for ${coupon.title}: ${couponCode}`);
                    coupons.push({ 
                        Company: url.replace('https://coupons.cnn.com/',''),  // Adjust if needed
                        Title: coupon.title,
                        ExpiryDate: coupon.expiration,  // You may need to fetch expiry date if available
                        Code: couponCode,
                        Terms: terms,  // Adjust if necessary
                        Logo: imagelogo
                    });

                    // Close the newly opened tab
                    await newPage.close();

                    // Increment the number of fetched codes
                    codesFetched++;

                    // Optional: add a small delay to avoid bot detection
                    await delay(1000);
                } else {
                    codesFetched++;
                }
            } catch (error) {
                console.error(`Error occurred while processing ${url}: ${error.message}`);
                break; // Break the loop on error to continue with the next URL
            }
        }

        await page.close(); // Close the page after processing each URL
    }

    // Modify the saveCouponsToExcel call to handle duplicates
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

// Change the export syntax
export { scrapeCNNCoupons };

// Remove all the Express-related code below this line




// Start the server
// const PORT = 3000;
// app.listen(PORT, () => {
//     console.log(`Server running at http://localhost:${PORT}`);
// });

// Remove everything after this point
