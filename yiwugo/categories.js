const { getBrowserAndPage, getCategories } = require('./yiwugo');
const { customLog } = require('../helper/log');

(async function () {
    const { browser, page } = await getBrowserAndPage(true);

    const categories = await getCategories(page);

    customLog('Yiwugo categories found:', categories.length);

    await browser.close();
    process.exit();
}());
