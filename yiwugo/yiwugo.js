const { getBrowser, navigate, getData, elem, _wait } = require('../helper/scraper.js');
const { addOrUpdateRecord, checkRecordExists } = require('../helper/dynamodb');
const { customLog } = require('../helper/log');

const BASE_URL = 'https://www.yiwugo.com';

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
        const type = route.request().resourceType();
        if (type === 'image' || type === 'media' || type === 'font') {
            route.abort();
        } else {
            route.continue();
        }
    });

    return { browser, page };
};

/**
 * Get all top-level product categories from Yiwugo.
 */
const getCategories = async (page, autoSave = true) => {
    const categories = [];
    const url = `${BASE_URL}/product/`;

    await navigate(page, url, 3000);

    // Get category links from the main product directory page.
    const categoryLinks = await page.$$('a[href*="/product/"]');

    for (let i = 0; i < categoryLinks.length; i++) {
        try {
            const name = await categoryLinks[i].textContent();
            const href = await categoryLinks[i].getAttribute('href');

            if (!name || !href || name.trim().length === 0) continue;
            // Skip non-category links (e.g. pagination, home).
            if (href === '/product/' || href.includes('page=')) continue;

            const fullLink = href.startsWith('http') ? href : `${BASE_URL}${href}`;
            const trimmedName = name.trim();

            categories.push({ name: trimmedName, link: fullLink });

            if (autoSave) {
                await addOrUpdateRecord('yiwugo_categories', {
                    id: fullLink,
                    name: trimmedName,
                    link: fullLink
                });
            }
        } catch (_) {
            // Skip broken elements.
        }
    }

    customLog('Yiwugo categories found:', categories.length);
    return categories;
};

/**
 * Scrape a single product detail page.
 */
const getProduct = async (page, url) => {
    try {
        await navigate(page, url, 2000, 0);
    } catch (err) {
        customLog('Failed to navigate to product:', url, err.message);
        return null;
    }

    customLog('Getting Yiwugo product data:', url);

    const product = {
        title: '',
        price: '',
        minOrder: '',
        supplier: '',
        supplierLink: '',
        location: '',
        category: '',
        images: []
    };

    // Title
    try {
        product.title = await page.$eval(
            'h1, .product-title, .proTit',
            el => el.textContent.trim()
        );
    } catch (_) {}

    // Price
    try {
        product.price = await page.$eval(
            '.price, .product-price, .proPrice',
            el => el.textContent.trim()
        );
    } catch (_) {}

    // Min order quantity
    try {
        product.minOrder = await page.$eval(
            '.min-order, .moq, .proMoq',
            el => el.textContent.trim()
        );
    } catch (_) {}

    // Supplier name
    try {
        product.supplier = await page.$eval(
            '.company-name a, .shopName a, .supplierName a',
            el => el.textContent.trim()
        );
    } catch (_) {}

    // Supplier link
    try {
        const href = await page.$eval(
            '.company-name a, .shopName a, .supplierName a',
            el => el.getAttribute('href')
        );
        product.supplierLink = href && href.startsWith('http') ? href : `${BASE_URL}${href}`;
    } catch (_) {}

    // Location (district/market)
    try {
        product.location = await page.$eval(
            '.location, .address, .shopAddress',
            el => el.textContent.trim()
        );
    } catch (_) {}

    // Product images
    try {
        const imgs = await page.$$eval(
            '.product-img img, .proImg img, .gallery img',
            els => els.map(el => el.getAttribute('src')).filter(Boolean)
        );
        product.images = imgs.map(src =>
            src.startsWith('http') ? src : `https:${src}`
        );
    } catch (_) {}

    customLog('Product:', product.title || '(no title)', product.price || '(no price)');

    await addOrUpdateRecord('yiwugo_products', {
        ...product,
        id: url
    });

    return product;
};

/**
 * Get product links from a category listing page and scrape each product.
 */
const getProductsLinksFromCategory = async (page, categoryUrl) => {
    for (let pageNum = 1; ; pageNum++) {
        const url = pageNum === 1
            ? categoryUrl
            : `${categoryUrl}${categoryUrl.includes('?') ? '&' : '?'}page=${pageNum}`;

        customLog('Yiwugo catego page', pageNum, url);

        try {
            await navigate(page, url, 3000, 0);
            await _wait(3000);

            // Collect product links from listing.
            const links = await page.$$eval(
                'a[href*="/product/detail"], a[href*="/productDetail"]',
                els => els.map(el => el.getAttribute('href')).filter(Boolean)
            );

            // Deduplicate
            const uniqueLinks = [...new Set(links)].map(href =>
                href.startsWith('http') ? href : `${BASE_URL}${href}`
            );

            customLog('Product links found on page', pageNum, ':', uniqueLinks.length);

            if (uniqueLinks.length === 0) {
                customLog('No more products, stopping pagination.');
                break;
            }

            for (const productLink of uniqueLinks) {
                const key = { id: productLink };
                const exists = await checkRecordExists('yiwugo_products', key);
                if (exists) {
                    customLog('Product already scraped, skipping:', productLink);
                    continue;
                }
                await getProduct(page, productLink);
            }
        } catch (error) {
            customLog('Error on category page', pageNum, ':', error.message);
        }
    }
};

module.exports = {
    getBrowserAndPage,
    getCategories,
    getProduct,
    getProductsLinksFromCategory
};
