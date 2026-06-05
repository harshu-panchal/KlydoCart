const mongoose = require('mongoose');

const uri = "mongodb+srv://klydocart:Klydocart%40123@cluster0.7mq15xm.mongodb.net/SpeeUp?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  
  const products = await db.collection('products').find({productName: {$regex: /vage chilly/i}}).toArray();
  console.log(`Found ${products.length} products`);
  
  for (const p of products) {
      const seller = await db.collection('sellers').findOne({_id: p.seller});
      console.log(`Product: ${p.productName}, Seller: ${seller ? seller.storeName : 'None'}, City: ${seller ? seller.city : 'None'}`);
  }
  
  process.exit(0);
}

run().catch(console.error);
