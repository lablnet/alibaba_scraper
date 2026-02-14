const { parentPort, workerData } = require('worker_threads');
const { getProductsLinksFromCategory } = require('./yiwugo');

let browser, page;

const initializeBrowserAndPage = async () => {
    const { getBrowserAndPage } = require('./yiwugo');
    ({ browser, page } = await getBrowserAndPage(true));
};

async function processCategory(category) {
    await getProductsLinksFromCategory(page, category);
    console.log('Processed Yiwugo category:', category);
    return `Processed ${category}`;
}

const cleanup = async () => {
    if (browser) {
        await browser.close();
    }
};

initializeBrowserAndPage().then(async () => {
    await processCategory(workerData.category);
    await cleanup();
    parentPort.postMessage(`${workerData.category}`);
}).catch((error) => {
    console.error('Error in Yiwugo worker thread:', error);
    cleanup();
});
