const { Worker } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const { categoriesToQueueFile } = require('../helper/file.js');


const queueFilePath = './categories_queue.txt';
const numCPUs = require('os').cpus().length - 1; // Leave one core for the main thread

const readQueue = () => {
    try {
        const data = fs.readFileSync(queueFilePath, 'utf8');
        return data.split('\n').filter(Boolean); // Remove any empty lines
    } catch (err) {
        console.error('Error reading queue file:', err);
        return [];
    }
}

const updateQueue = (categories) => {
    try {
        fs.writeFileSync(queueFilePath, categories.join('\n'), 'utf8');
    } catch (err) {
        console.error('Error updating queue file:', err);
    }
}

const processCategory = (category) => {
    return new Promise((resolve, reject) => {
        const worker = new Worker('./alibaba/productWorker.js', { workerData: { category } });

        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}

async function main() {
    await categoriesToQueueFile();
    let categories = readQueue();

    if (categories.length === 0) {
        console.log('No categories to process. Exiting...');
        // delete the file.
        fs.unlinkSync(queueFilePath);
        return;
    }

    console.log(`Processing ${categories.length} categories with up to ${numCPUs} threads...`);

    while (categories.length > 0) {
        const activeCategories = categories.splice(0, numCPUs); // Take up to numCPUs categories to process

        await Promise.all(activeCategories.map(processCategory)).then((results) => {
           // console.log('Processed categories:', results);
            updateQueue(categories); // Update the queue file after processing
        }).catch((error) => {
            console.error('Error processing categories:', error);
        });

        if (categories.length === 0) {
            console.log('All categories processed. Exiting...');
            break;
        }
    }
}

main();
