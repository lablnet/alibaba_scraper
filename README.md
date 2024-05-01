# Alibaba Scrapper.
This is robust scrapper that scrapes data from Alibaba website. It is multi-threaded. It use playwright to scrape data from the website.

### Installation.
- Clone the repository.
- Run `npm install` to install the dependencies.
- Copy `.env.example` to `.env` and update the values.
- Run `node ./alibaba/categories.js` to get the categories and store them in the database.
- Run `node ./alibaba/processProducts.js` to start the scrapper.
    - As you can not keep the terminal open so you can use nohup to run the script in background.
    - `nohup node ./alibaba/processProducts.js &`
    - The script will create `categories_queue1` queue file in the root directory, and it will keep runing until the queue is empty.

### Features
- Scrape data from alibaba website.
- Multi-threaded.
- Save data to Amazon DynamoDB.
- Proxy support.
- Proper error handling and logging.

### License
- MIT
