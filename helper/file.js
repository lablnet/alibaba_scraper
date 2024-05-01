const { readAllRecords } = require('../helper/dynamodb.js');
const { customLog } = require('../helper/log');
const fs = require('fs');

const categoriesToQueueFile = async () => {
    let categories = await readAllRecords('categories');
    // open the file categories_queue.txt if not exists it will create it.
    const file = fs.createWriteStream('categories_queue.txt');
    for (let category of categories) {
        file.write(`${category.id.S}\n`);
        customLog (`Category ${category.id.S} added to queue file`);
    }
    customLog ("Categories to queue file successful", categories.length);
}

module.exports = {
    categoriesToQueueFile
}
