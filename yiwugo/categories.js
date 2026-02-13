const { getBrowserAndPage, getCategories } = require('./yiwugo');
const { customLog } = require('../helper/log');
const fs = require('fs');

/**
 * Get all Yiwugo categories and save to file.
 *
 * Usage: node yiwugo/categories.js
 */
(async function () {
    customLog('Fetching Yiwugo categories...');

    const { browser, page } = await getBrowserAndPage(true);

    try {
        const categories = await getCategories(page);
        customLog(`Found ${categories.length} categories`);

        fs.writeFileSync(
            'yiwugo_categories.json',
            JSON.stringify(categories, null, 2),
            'utf8'
        );
        customLog('Categories saved to yiwugo_categories.json');
    } finally {
        await browser.close();
        process.exit();
    }
}());
