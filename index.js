const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

app.use(cors());
app.use(express.json());



function jwtVerify(req, res, next) {
    const authHeaders = req.headers.authorization;
    if (!authHeaders) {
        return res.status(401).send({ message: 'Unauthorized access' })
    }
    const token = authHeaders.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next()
    });
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ajd6g.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const servicesCollection = client.db('ManufactureData').collection('services');
        const usersCollection = client.db('ManufactureData').collection('users');
        const ordersCollection = client.db('ManufactureData').collection('orders');
        const reviewCollection = client.db('ManufactureData').collection('reviews');
        const paymentsCollection = client.db('ManufactureData').collection('payments');
        const profileCollection = client.db('ManufactureData').collection('profiles');
        const productsCollection = client.db('Electro').collection('products');

        app.post("/create-payment-intent", async (req, res) => {
            const { amount } = req.body;
            const totalAmount = amount * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: totalAmount,
                currency: "usd",
                "payment_method_types": [
                    "card"
                ],
            });
            res.send({ clientSecret: paymentIntent.client_secret, });
        })

        app.get('/services', async (req, res) => {
            const query = {};
            const limit = Number(req.query.limit);
            const page = Number(req.query.pageNumber);
            const count = await servicesCollection.estimatedDocumentCount();
            const result = await servicesCollection.find(query).skip(limit*page).limit(limit).toArray()
            res.send({success: true, data:result, count});
        })
        app.get('/services/:id', jwtVerify, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await servicesCollection.findOne(query);
            res.send(result);
        })
        //update available quantity
        app.put('/service/:id', async(req, res) => {
            const id = req.params.id;
            const data = req.body;
            const query = {_id: ObjectId(id)}
            const options = {upsert: true}
            const updateDoc = {
                $set: {
                    available: data.available,
                }
            }
            const result = await servicesCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })
        //manage products
        app.delete('/services/:id', jwtVerify, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await servicesCollection.deleteOne(query);
            res.send(result)
        })
        //add product
        app.post('/services', jwtVerify, async (req, res) => {
            const query = req.body;
            const result = await servicesCollection.insertOne(query);
            res.send(result);
        })
        // orders
        app.post('/orders', async (req, res) => {
            const query = req.body;
            const result = await ordersCollection.insertOne(query);
            res.send(result)
        })
        app.get('/orders',  async (req, res) => {
            const result = await ordersCollection.find().toArray()
            res.send(result)
        })
        //find orders for single user
        app.get('/order',  async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await ordersCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.findOne(query);
            res.send(result);
        })
        //delete order api
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.deleteOne(query);
            res.send(result);
        })

        app.patch('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    paid: true,
                    trasectionId: payment.transectionId,
                }
            }
            const result = await paymentsCollection.insertOne(payment);
            const updatedOrder = await ordersCollection.updateOne(filter, updateDoc);
            res.send(updateDoc)
        })
        //make shipped true
        app.put('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    shipped: true,
                }
            }
            const result = await ordersCollection.updateOne(filter, updateDoc);
            res.send(result)
        })
        // users role
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        })
        //find per user
        app.get('/user', async(req, res) => {
            const email = req.query.email;
            const query = {email: email};
            const result = await usersCollection.findOne(query);
            res.send(result)
        })
        //get all profile by email
        app.get('/profiles', async(req, res) => {
            const email = req.query.email;
            const query = {email: email};
            const result = await profileCollection.findOne();
            res.send(result)
        })
        //get all profile by email
        app.get('/profiles', async(req, res) => {
            const result = await profileCollection.find().toArray();
            res.send(result)
        })
    //    update user field
       app.put('/profiles/:email', jwtVerify, async(req, res) => {
           const email = req.params.email;
           const data = req.body;
           const filter = {email : email};
           const options = {upsert: true};
           const updateDoc = {
               $set: {
                name: data.name,
                email: data.email,
                profession: data.profession,
                address: {
                    city: data.address.city,
                    state : data.address.state,
                    country: data.address.country
                },
                phone: data.phone,
                image: data.image,
               }
           }
           const result = await profileCollection.updateOne(filter, updateDoc, options);
           res.send(result);
       })


        app.put('/users/admin/:email', jwtVerify, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesteremail = await usersCollection.findOne({ email: requester });
            if (requesteremail.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                };
                const result = await usersCollection.updateOne(filter, updateDoc);
                res.send(result);
            } else {
                return res.status(403).send({ message: 'Fobidden access' })
            }

            // app.get('/admin/:email', async (req, res) => {
            //     const email = req.params.email;
            //     const user = await usersCollection.findOne({ email: email });
            //     const isAdmin = user.role === 'admin';
            //     console.log(isAdmin)
            //     res.send({ admin: isAdmin });
            // })
            //
            app.get('/user', async (req, res) => {
                const email = req.query.email;
                const query = {email : email}
                const user = await usersCollection.findOne(query);
                const isAdmin = user.role === 'admin';
                console.log(isAdmin)
                res.send({ admin: isAdmin });
            })
            //
        })
        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const query = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(query, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
            res.send({ result, token });
        })

        //review
        app.post('/reviews', async (req, res) => {
            const query = req.body;
            const result = await reviewCollection.insertOne(query);
            res.send(result);
        })
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        })

        // getting electro product
        app.get('/products', async (req, res) => {
            const result = await productsCollection.find().toArray();
            res.send(result);
        })


    }
    finally {

    }

}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('manufacture is running')
})
app.listen(port, () => {
    console.log('Server is listening with port', port);
})