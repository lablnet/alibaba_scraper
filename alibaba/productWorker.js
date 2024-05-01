const { parentPort, workerData } = require('worker_threads');
const { getProductsLinksFromCategory } = require('./alibaba');

let browser, page;

const initializeBrowserAndPage = async () => {
    const { getBrowserAndPage } = require('./alibaba');
    ({ browser, page } = await getBrowserAndPage(true));
}

async function processCategory(category) {
    await getProductsLinksFromCategory(page, category);
    console.log ("Processed category: ");
    return `Processed ${category}`;
}

const cleanup = async () => {
    if (browser) {
        await browser.close();
    }
}

initializeBrowserAndPage().then(async() => {
    await processCategory(workerData.category);
    await cleanup();
    parentPort.postMessage(`${workerData.category}`);
    parentPort.postMessage(processCategory(workerData.category));
}).catch((error) => {
    console.error('Error in worker thread:', error);
    cleanup();
});
