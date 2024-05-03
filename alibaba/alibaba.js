const { getBrowser, navigate, getData, elem, click, _wait} = require('../helper/scraper.js');
const { addOrUpdateRecord, checkRecordExists } = require('../helper/dynamodb');
const { customLog } = require('../helper/log');
const fs = require('fs');

const getBrowserAndPage = async (headless = false) => {
    const browser = await getBrowser({ headless: headless, waitUntil: 'networkidle' });
    const context = await browser.newContext();
    const page = await context.newPage({ target: 'tab' });
    
    await page.route('**/*', (route) => {
        // Block images and media for faster page load and save proxy bandwidth.
        if (route.request().resourceType() === 'image' || route.request().resourceType() === 'media') {
        route.abort();
        } else {
        route.continue();
        }
    });
    return { browser, page };
}

const getProductReviews = async (productPage, url, id) => {
    console.log ("Getting product reviews", id);
    await _wait(2000);

    // By default it shows 'store-review' tab, so get the 'product-review' tab and click on it.
    const productReviewTab = await elem(productPage, 'xpath', '/html/body/div[1]/div[2]/div[1]/div[1]/div[14]/div/div/div[1]/div/div/div/ul/li[1]/div');
    await productReviewTab.click();

    await _wait(3000);

    while (true) {
        // Now try to get reviews.
        const reviewContainer = await elem(productPage, 'xpath', '/html/body/div[1]/div[2]/div[1]/div[1]/div[14]/div/div/div[2]/div/div/div[3]/div');
        const reviewCount = await reviewContainer.count();
        
        customLog ("Review count", reviewCount);
        if (reviewCount === 0) {
            customLog ("No reviews found");
            break;
        }
        for (let i = 0; i < reviewCount; i++) {
            // get the review text.
            const review = await elem(productPage, 'xpath', `/html/body/div[1]/div[2]/div[1]/div[1]/div[14]/div/div/div[2]/div/div/div[3]/div[${i+1}]/div[3]`);
            const reviewText = await review.textContent();

            // get the star count.
            const starContainer = await elem(productPage, 'xpath', `/html/body/div[1]/div[2]/div[1]/div[1]/div[14]/div/div/div[2]/div/div/div[3]/div[${i+1}]/div[2]/div/div/div[2]/label`);
            const starCount = await starContainer.count();
            await addOrUpdateRecord('reviews', {
                id: `${id}-${i}`,
                url: url,
                starCount: starCount,
                reviewText: reviewText
            });
            customLog ("Star count", starCount);
            customLog ("Review", reviewText);
        }

        // Get the next button
        const nextBtn = await elem(productPage, 'xpath', '/html/body/div[1]/div[2]/div[1]/div[1]/div[14]/div/div/div[2]/div/div/div[4]/div/div/button[2]');

        // Wait for navigation to complete
        await _wait(3000);

        // check if the next button is disabled.
        try {
            const isDisabled = await nextBtn.getAttribute('disabled');
            if (isDisabled !== null) {
                break;
            }
        } catch (_) {
            customLog ("Next button is not clickable");
            break;
        }
        // click on the next button.
        try {
            await nextBtn.click();
        } catch (_) {
            customLog ("Next button is not clickable");
            break;
        }
        await _wait(1000);
    }
}

const getProduct = async (page, url) => {
    // navigate to the url.
    const productPage = await navigate(page, url, 2000, 0);
    customLog ("Getting product data");

    let product = {
        title: '',
        prices: [],
        supplier: '',
        supplierLink: '',
        verified: false
    }
    
    // get the title of the product.
    try {
        product.title = await getData(productPage, 'xpath', '//*[@id="container"]/div[2]/div[1]/div[1]/div[1]/div/h1');
    } catch (_) {}
    
    // Determine if the supplier is verified.
    try {
        const vetifyIconLocator = await elem(productPage, 'xpath', '/html/body/div[1]/div[2]/div[1]/div[1]/div[3]/div/div/a/img');
        const verifyIcon = await vetifyIconLocator.getAttribute('src');
        product.verified = true;
    } catch (_) {}


    // get the supplier link and name.
    try {
        const supplier = await elem(productPage, 'xpath', '/html/body/div[1]/div[2]/div[1]/div[1]/div[15]/div/div/div[1]/div/div[1]/a');
        product.supplier = await supplier.textContent();
        product.supplierLink = await supplier.getAttribute('href');
    } catch (_) {}

    // get the price range.
    try {
        const priceLocator = await elem(productPage, 'xpath', '/html/body/div[1]/div[2]/div[1]/div[2]/div/div/div/div[3]/div/div/div');

        // /html/body/div[1]/div[2]/div[1]/div[2]/div/div/div/div[3]/div/div
        const priceLocatorCount = await priceLocator.count();

        for (let i = 0; i < priceLocatorCount; i++) {
            // get the value of sub dives with class name 
            // quality and price.
            let quality;
            try {
                quality = await priceLocator.nth(i).locator('[class=quality]');
            } catch (_) {
                quality = await priceLocator.nth(i).locator('[class=min-moq]');
            }
            const price = await priceLocator.nth(i).locator('[class=price]');
            product.prices.push({
                quality: await quality?.textContent(),
                price: await price.textContent()
            });
        }
    } catch (_) {}

    console.log ("Product: ", product);
    let response = await addOrUpdateRecord('products', {
        ...product,
        id: url
    });
    customLog ("Response: ", response);
    await getProductReviews(productPage, url, response.id);
    return product;
}

const getCategories = async (page, autoSave = true, url = "https://sale.alibaba.com/category/products/index.html?wx_navbar_transparent=true&path=/category/products/index.html&ncms_spm=a27aq.cp_template&prefetchKey=allcategoriesv2&categoryIds=43") => {
    let categories = [];

    // navigate to the url.
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // click on the more categories button.
    const moreCatagoriesBtn = await elem(page, 'xpath', '/html/body/div[1]/div[1]/div[2]/div[2]/div[2]/div/div[1]/div[24]/div/div/div[1]')
    await moreCatagoriesBtn.click();

    // get the categories.
    const categoriesLocator = await elem(page, 'xpath', '/html/body/div[1]/div[1]/div[2]/div[3]/div[1]/div/div[1]/a', 1000);
    const categoriesCount = await categoriesLocator.count();

    for (let i = 0; i < categoriesCount; i++) {
        const category = await categoriesLocator.nth(i);
        // hover the elemen and wait for 1 second.
        await category.hover();
        await _wait(1000);
        // now get categories items
        const categoryItemsLocator = await elem(page, 'xpath', '/html/body/div[1]/div[1]/div[2]/div[3]/div[1]/div/div[2]/a', 1000);
        const categoryItemsCount = await categoryItemsLocator.count();
        customLog ("categoryItemsCount is: ", categoryItemsCount);

        for (let j = 0; j < categoryItemsCount; j++) {
            const categoryItem = await categoryItemsLocator.nth(j);
            categories.push({
                name: await categoryItem.textContent(),
                link: await categoryItem.getAttribute('href')
            });
            if (autoSave) {
                await addOrUpdateRecord('categories', {
                    name: await categoryItem.textContent(),
                    link: await categoryItem.getAttribute('href'),
                    id: await categoryItem.getAttribute('href')
                });
            }
        }
    }
    return categories;
}

const getProductsLinksFromCategory = async (page, url) => {

    for (let x = 1;; x++) {

        // update the url with page number.
        url = `${url}&page=${x}`;
        customLog ("Page X", x, url)

        try {
            const categoryPage = await navigate(page, url, 2000, 0);

            // wait for 5 seconds.
            await _wait(7000);

            // get all a tags.
            const links = await categoryPage.$$('a');
            // get data-spm-anchor-id attribute of each.
            let pCounts = 0;
            console.log ("Links count: ", links.length);
            await _wait(5000);
            let productLinks = [];
            for (let i = 0; i < links.length; i++) {
                const a = await links[i].getAttribute('data-spm-anchor-id');
                if (a === "a2700.galleryofferlist.normal_offer.d_title") {
                    const link = await links[i].getAttribute('href');
                    let productLink = `https:${link}`;
                    pCounts++;
                    productLinks.push(productLink);
                }
            }
            customLog ("pCounts: ", pCounts);
            for (let i = 0; i < productLinks.length; i++) {
                customLog ("Product link: ", productLinks[i]);

                let key = { id: productLinks[i] };
                let exists = await checkRecordExists('products', key);
                if (exists) {
                    customLog ("Product exists");
                    continue;
                } 
                await getProduct(page, productLinks[i]);
            }

            if (pCounts === 0) {
                break;
            }
        } catch (error) {
            customLog ("Error occured ", error);
        }
    }
}

module.exports = {
    getBrowserAndPage,
    getCategories,
    getProductsLinksFromCategory
}
