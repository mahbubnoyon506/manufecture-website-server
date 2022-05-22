const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;
const app = express();
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ajd6g.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
      await client.connect();
      const servicesCollection = client.db('ManufactureData').collection('services')
      app.get('/services', async(req, res) => {
          const query = req.query;
          const result = await servicesCollection.find(query).toArray()
          res.send(result);
      })
      app.get('/services/:id', async(req, res) => {
          const id = req.params.id;
          const query = {_id: ObjectId(id)};
          const result = await servicesCollection.findOne(query);
          res.send(result);
      })
    }
    finally{

    }

}
run().catch(console.dir)

app.get('/', (req, res) =>{
res.send('Hello world')
})
app.listen(port, ()=> {
    console.log('Server is listening with post', port);
})