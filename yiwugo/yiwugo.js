const { getBrowser, navigate, getData, elem, _wait } = require('../helper/scraper.js');
const { customLog } = require('../helper/log');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.yiwugo.com';

/**
 * Get browser and page configured for Yiwugo scraping.
 */
const getBrowserAndPage = async (headless = false) => {
    const browser = await getBrowser({ headless: headless });
    const context = await browser.newContext({
        locale: 'zh-CN',
        extraHTTPHeaders: {
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        }
    });
    const page = await context.newPage();

    await page.route('**/*', (route) => {
        if (route.request().resourceType() === 'media') {
            route.abort();
        } else {
            route.continue();
        }
    });
    return { browser, page };
};

/**
 * Get product details from a Yiwugo product page.
 *
 * @param {object} page - Playwright page object.
 * @param {string} url - Product URL.
 * @returns {object} - Product data.
 */
const getProduct = async (page, url) => {
    await navigate(page, url, 2000, 60000);
    customLog('Getting Yiwugo product data:', url);

    let product = {
        url: url,
        title: '',
        price: '',
        minOrder: '',
        supplier: '',
        supplierLink: '',
        location: '',
        images: [],
        attributes: {}
    };

    // Title
    try {
        product.title = await getData(page, 'tag', 'h1.shop_name', 'text');
        product.title = product.title?.trim() || '';
    } catch (_) {
        try {
            product.title = await getData(page, 'tag', '.proDetaiName h1', 'text');
            product.title = product.title?.trim() || '';
        } catch (_) {}
    }

    // Price
    try {
        const priceEl = await elem(page, 'tag', '.price_text, .proPrice em');
        product.price = (await priceEl.first().textContent())?.trim() || '';
    } catch (_) {}

    // Min order quantity
    try {
        const moqEl = await elem(page, 'tag', '.起批量, .proMoq');
        product.minOrder = (await moqEl.first().textContent())?.trim() || '';
    } catch (_) {}

    // Supplier name
    try {
        const supplierEl = await elem(page, 'tag', '.company_name a, .shopName a');
        product.supplier = (await supplierEl.first().textContent())?.trim() || '';
        product.supplierLink = await supplierEl.first().getAttribute('href') || '';
        if (product.supplierLink && !product.supplierLink.startsWith('http')) {
            product.supplierLink = BASE_URL + product.supplierLink;
        }
    } catch (_) {}

    // Location
    try {
        const locEl = await elem(page, 'tag', '.company_address, .shopAddress');
        product.location = (await locEl.first().textContent())?.trim() || '';
    } catch (_) {}

    // Product images
    try {
        const imgEls = await page.$$('.proDetailImg img, .detailImg img, .gallery img');
        for (const img of imgEls) {
            const src = await img.getAttribute('src');
            if (src && !src.includes('placeholder')) {
                const fullSrc = src.startsWith('http') ? src : BASE_URL + src;
                product.images.push(fullSrc);
            }
        }
    } catch (_) {}

    // Product attributes
    try {
        const attrRows = await page.$$('.proDetailAttr tr, .detailAttr li');
        for (const row of attrRows) {
            const text = (await row.textContent())?.trim() || '';
            const parts = text.split(/[：:]/);
            if (parts.length >= 2) {
                product.attributes[parts[0].trim()] = parts.slice(1).join(':').trim();
            }
        }
    } catch (_) {}

    customLog('Product:', JSON.stringify(product, null, 2));
    return product;
};

/**
 * Search products on Yiwugo by keyword.
 *
 * @param {object} page - Playwright page object.
 * @param {string} keyword - Search keyword.
 * @param {number} maxPages - Maximum pages to scrape.
 * @returns {Array} - List of product links.
 */
const searchProducts = async (page, keyword, maxPages = 5) => {
    const encodedKeyword = encodeURIComponent(keyword);
    let allLinks = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const url = `${BASE_URL}/s.htm?keyword=${encodedKeyword}&page=${pageNum}`;
        customLog(`Searching page ${pageNum}:`, url);

        try {
            await navigate(page, url, 3000, 60000);
            await _wait(2000);

            const productLinks = await page.$$eval(
                '.pro_list_product a.productloc, .proList .proName a',
                (links) => links.map(a => a.href).filter(h => h.includes('/product/'))
            );

            if (productLinks.length === 0) {
                customLog('No more products found, stopping.');
                break;
            }

            allLinks = allLinks.concat(productLinks);
            customLog(`Found ${productLinks.length} products on page ${pageNum}`);
        } catch (error) {
            customLog('Error on page', pageNum, error.message);
            break;
        }
    }

    // Deduplicate
    allLinks = [...new Set(allLinks)];
    customLog(`Total unique product links: ${allLinks.length}`);
    return allLinks;
};

/**
 * Get categories from Yiwugo.
 *
 * @param {object} page - Playwright page object.
 * @returns {Array} - List of categories with name and link.
 */
const getCategories = async (page) => {
    const url = `${BASE_URL}/market/`;
    await navigate(page, url, 3000, 60000);
    customLog('Getting Yiwugo categories');

    let categories = [];

    try {
        const catLinks = await page.$$('.cate_list a, .marketList a');
        for (const link of catLinks) {
            const name = (await link.textContent())?.trim() || '';
            let href = await link.getAttribute('href') || '';
            if (href && !href.startsWith('http')) {
                href = BASE_URL + href;
            }
            if (name && href) {
                categories.push({ name, link: href });
            }
        }
    } catch (error) {
        customLog('Error getting categories:', error.message);
    }

    customLog(`Found ${categories.length} categories`);
    return categories;
};

/**
 * Get product links from a category page.
 *
 * @param {object} page - Playwright page object.
 * @param {string} categoryUrl - Category URL.
 * @param {number} maxPages - Maximum pages to scrape.
 * @returns {Array} - List of product links.
 */
const getProductsFromCategory = async (page, categoryUrl, maxPages = 10) => {
    let allLinks = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const url = `${categoryUrl}${categoryUrl.includes('?') ? '&' : '?'}page=${pageNum}`;
        customLog(`Category page ${pageNum}:`, url);

        try {
            await navigate(page, url, 3000, 60000);
            await _wait(2000);

            const productLinks = await page.$$eval(
                '.pro_list_product a.productloc, .proList .proName a',
                (links) => links.map(a => a.href).filter(h => h.includes('/product/'))
            );

            if (productLinks.length === 0) {
                customLog('No more products, stopping.');
                break;
            }

            allLinks = allLinks.concat(productLinks);
            customLog(`Found ${productLinks.length} products on page ${pageNum}`);
        } catch (error) {
            customLog('Error on category page', pageNum, error.message);
            break;
        }
    }

    allLinks = [...new Set(allLinks)];
    customLog(`Total unique product links from category: ${allLinks.length}`);
    return allLinks;
};

/**
 * Save products to a JSON file.
 *
 * @param {Array} products - Array of product objects.
 * @param {string} filename - Output filename.
 */
const saveToFile = (products, filename = 'yiwugo_products.json') => {
    const outputPath = path.resolve(filename);
    fs.writeFileSync(outputPath, JSON.stringify(products, null, 2), 'utf8');
    customLog(`Saved ${products.length} products to ${outputPath}`);
};

module.exports = {
    getBrowserAndPage,
    getProduct,
    searchProducts,
    getCategories,
    getProductsFromCategory,
    saveToFile
};
