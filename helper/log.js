const fs = require('fs');

const customLog = (...messages) => {
    const timestamp = new Date().toISOString();
    console.log(timestamp, ...messages);
    const logMessage = `${timestamp} ${messages.join(' ')}\n`;
    fs.appendFileSync('app.log', logMessage);
}

module.exports = {
    customLog
}
