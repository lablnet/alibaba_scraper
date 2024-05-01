// this script will run every week.
const { getBrowserAndPage, getCategories } = require('./alibaba');
const { customLog } = require('../helper/log');

(async function () {
    const { browser, page } = await getBrowserAndPage(true);

    const categories = await getCategories(page);

    customLog("Number of Categories are: ", categories.length);

    await browser.close();
    process.exit();
}());
