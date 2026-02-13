const { getBrowserAndPage, searchProducts, getProduct, saveToFile } = require('./yiwugo');
const { customLog } = require('../helper/log');

/**
 * Example: Search and scrape Yiwugo products by keyword.
 *
 * Usage: node yiwugo/searchProducts.js "keyword"
 */
(async function () {
    const keyword = process.argv[2] || '杯子';
    const maxPages = parseInt(process.argv[3]) || 3;

    customLog(`Searching Yiwugo for: "${keyword}" (max ${maxPages} pages)`);

    const { browser, page } = await getBrowserAndPage(true);

    try {
        const productLinks = await searchProducts(page, keyword, maxPages);
        customLog(`Found ${productLinks.length} product links`);

        const products = [];
        for (let i = 0; i < productLinks.length; i++) {
            customLog(`Scraping product ${i + 1}/${productLinks.length}`);
            try {
                const product = await getProduct(page, productLinks[i]);
                products.push(product);
            } catch (error) {
                customLog(`Error scraping product: ${error.message}`);
            }
        }

        saveToFile(products, `yiwugo_${keyword}_products.json`);
        customLog(`Done! Scraped ${products.length} products.`);
    } finally {
        await browser.close();
        process.exit();
    }
}());
