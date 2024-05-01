const { DynamoDBClient, ListTablesCommand, CreateTableCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { customLog } = require('./log');
require('dotenv').config();

// Creating the DynamoDB client with AWS SDK v3
const dynamoDBClient = new DynamoDBClient({
  region: process.env.REGION,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

async function checkRecordExists(tableName, key) {
  const params = {
    TableName: tableName,
    Key: key,
  };

  try {
    const { Item } = await docClient.send(new GetCommand(params));
    return Item !== undefined;
  } catch (error) {
    customLog ('Error checking record exists:', error);
    throw error;
  }
}

async function readAllRecords(tableName) {
  const params = {
    TableName: tableName,
  };

  try {
    const { Items } = await docClient.send(new ScanCommand(params));
    return Items;
  } catch (error) {
    customLog ('Error reading all records:', error);
    throw error;
  }
}

async function addOrUpdateRecord(tableName, item) {
  if (!item.id) {
    item.id = uuidv4();
  }

  const params = {
    TableName: tableName,
    Item: item,
  };

  try {
    await docClient.send(new PutCommand(params));
    customLog ('Add/Update successful', params);
    return params.Item;
  } catch (error) {
    customLog ('Error adding/updating record:', error);
    throw error;
  }
}

async function createTableIfNotExists(tableName) {
  const listTablesCommand = new ListTablesCommand({});
  const { TableNames } = await dynamoDBClient.send(listTablesCommand);
  if (!TableNames.includes(tableName)) {
    const params = {
      TableName: tableName,
      KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1,
      },
    };

    try {
      await dynamoDBClient.send(new CreateTableCommand(params));
      customLog (`Table "${tableName}" created successfully.`);
    } catch (error) {
      customLog ('Error creating table:', error);
      throw error;
    }
  } else {
    customLog (`Table "${tableName}" already exists.`);
  }
}

(async function () {
  if (!fs.existsSync('.installed')) {
    let tables = process.env.TABLES.split(',');
    for (let table of tables) {
      await createTableIfNotExists(table);
    }
    fs.writeFileSync('.installed', '');
  }
})();

module.exports = {
    checkRecordExists,
    addOrUpdateRecord,
    createTableIfNotExists,
    readAllRecords
};
