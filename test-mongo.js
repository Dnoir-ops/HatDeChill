const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

// Lấy các biến thành phần từ .env
const MONGO_USER = process.env.MONGO_USER;
const MONGO_PASS = process.env.MONGO_PASS;
const MONGO_HOST = process.env.MONGO_HOST;
const MONGO_DB = process.env.MONGO_DB;
const MONGO_OPTIONS = process.env.MONGO_OPTIONS || 'retryWrites=true&w=majority&appName=Cluster0';

// Gộp lại thành uri
const uri = `mongodb+srv://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PASS)}@${MONGO_HOST}/${MONGO_DB}?${MONGO_OPTIONS}`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
