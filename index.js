const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;
const app = express();
app.use(cors());
app.use(express.json());

function jwtVerify(req, res, next){
    const authHeaders = req.headers.authorization;
    if(!authHeaders){
        return req.status(401).send({message: 'Unauthorized access'})
    }
    const token = authHeaders.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if(err){
            return req.status(403).send({message: 'Forbidden access'})
        }
        req.decoded = decoded;
        next()
      });
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ajd6g.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
      await client.connect();
      const servicesCollection = client.db('ManufactureData').collection('services');
      const usersCollection = client.db('ManufactureData').collection('users');
      const reviewCollection = client.db('ManufactureData').collection('reviews');

      app.get('/services', async(req, res) => {
          const query = req.query;
          const result = await servicesCollection.find(query).toArray()
          res.send(result);
      })
      app.get('/services/:id', jwtVerify, async(req, res) => {
          const id = req.params.id;    
          const query = {_id: ObjectId(id)};
          const result = await servicesCollection.findOne(query);
          res.send(result);
      })
      //manage products
      app.delete('/services/:id', async(req, res) =>{
          const id = req.params.id;
          const query = {_id: ObjectId(id)};
          const result = await servicesCollection.deleteOne(query);
          res.send(result)
      })
      //add product
      app.post('/services', async(req, res) => {
          const query = req.body;
          const result = await servicesCollection.insertOne(query);
          res.send(result);
      })

      // users role
      app.get('/users', async(req, res) => {
          const result = await usersCollection.find().toArray();
          res.send(result);
      })
      app.put('/users/admin/:email', jwtVerify, async(req, res) => {
          const email = req.params.email;
         const requester = req.decoded.email;
        const requesteremail = await usersCollection.findOne({email: requester});
        if(requesteremail.role === 'admin'){
            const filter = {email: email};
            const updateDoc = {
              $set: {role: 'admin'},
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        }else{
            return res.status(403).send({message: 'Fobidden access'})
        }

        app.get('/admin/:email', async(req, res) => {
            const email = req.params.email;
            const adminRole = await usersCollection.findOne({email: email});
            const isAdmin = adminRole.role === 'admin';
            res.send({admin: isAdmin});
        })

      })
      app.put('/users/:email', async(req, res) => {
          const email = req.params.email;
          const user = req.body;
          const query = {email: email};
          const options = { upsert: true };
          const updateDoc = {
            $set: user,
          };
          const result = await usersCollection.updateOne(query, updateDoc, options);
          const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {expiresIn: '1h'});
          res.send({result, token});
      })

      //review
      app.post('/reviews', async(req, res) => {
          const query = req.body;
          const result = await reviewCollection.insertOne(query);
          res.send(result);
      })
      app.get('/reviews', async(req, res) => {
          const result = await reviewCollection.find().toArray()
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