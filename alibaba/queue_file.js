// Run every 1 hours.
const { categoriesToQueueFile } = require('../helper/file.js');
const os = require('os');
const fs = require('fs');

const queueFilePath = './categories_queue.txt';

// if file is not exists call the function to create it.
(async function async () {
    if (!fs.existsSync(queueFilePath)) {
       await categoriesToQueueFile();
    }
})();
