# Alibaba Scraper
[https://lablnet.com/project/alibabascraper](https://lablnet.com/project/alibabascraper)

This is a robust web scraper that extracts data from the Alibaba website. It's multi-threaded and utilizes Playwright to efficiently scrape data from the website. This script is capable of scraping the entire Alibaba site, which would take approximately 4-6 months to complete.

### Installation.
- Clone the repository.
- Run `npm install` to install the dependencies.
- Copy `.env.example` to `.env` and update the values.
- Run `node ./alibaba/categories.js` to get the categories and store them in the database.
- Run `node ./alibaba/processProducts.js` to start the scraper.
    - As you can not keep the terminal open so you can use nohup to run the script in background.
    - `nohup node ./alibaba/processProducts.js &`
    - The script will create `categories_queue1` queue file in the root directory, and it will keep runing until the queue is empty.

### Features

* Scrape data from Alibaba website
* Multi-threaded
* Save data to Amazon DynamoDB
* Proxy support
* Proper error handling and logging

### License

* MIT
