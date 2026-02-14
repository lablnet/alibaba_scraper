const { Worker } = require('worker_threads');
const fs = require('fs');
const { categoriesToQueueFile } = require('../helper/file.js');

const queueFilePath = './yiwugo_categories_queue.txt';
const numCPUs = require('os').cpus().length - 1;

const readQueue = () => {
    try {
        const data = fs.readFileSync(queueFilePath, 'utf8');
        return data.split('\n').filter(Boolean);
    } catch (err) {
        console.error('Error reading queue file:', err);
        return [];
    }
};

const updateQueue = (categories) => {
    try {
        fs.writeFileSync(queueFilePath, categories.join('\n'), 'utf8');
    } catch (err) {
        console.error('Error updating queue file:', err);
    }
};

const processCategory = (category) => {
    return new Promise((resolve, reject) => {
        const worker = new Worker('./yiwugo/productWorker.js', { workerData: { category } });
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
};

async function main() {
    // Read categories from DynamoDB and write to queue file.
    // For Yiwugo, we use 'yiwugo_categories' table.
    let categories = readQueue();

    if (categories.length === 0) {
        console.log('No Yiwugo categories to process. Run yiwugo/categories.js first.');
        return;
    }

    console.log(`Processing ${categories.length} Yiwugo categories with up to ${numCPUs} threads...`);

    while (categories.length > 0) {
        const activeCategories = categories.splice(0, numCPUs);

        await Promise.all(activeCategories.map(processCategory)).then(() => {
            updateQueue(categories);
        }).catch((error) => {
            console.error('Error processing Yiwugo categories:', error);
        });

        if (categories.length === 0) {
            console.log('All Yiwugo categories processed. Exiting...');
            break;
        }
    }
}

main();
