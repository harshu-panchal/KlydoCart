const mongoose = require('mongoose');

const uri = "mongodb+srv://klydocart:Klydocart%40123@cluster0.7mq15xm.mongodb.net/SpeeUp?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const lowestPrices = await db.collection('lowestpricesproducts').find({}).toArray();
  console.log(`Found ${lowestPrices.length} lowest prices products`);

  for (const lp of lowestPrices) {
    const product = await db.collection('products').findOne({ _id: lp.product });
    if (!product) {
      console.log(`LP ID: ${lp._id}, Product ID: ${lp.product} -> PRODUCT NOT FOUND`);
      continue;
    }
    const seller = await db.collection('sellers').findOne({ _id: product.seller });
    console.log(`LP ID: ${lp._id}, Order: ${lp.order}, IsActive: ${lp.isActive}`);
    console.log(`  Product: ${product.productName}`);
    console.log(`  Status: ${product.status}, Publish: ${product.publish}`);
    console.log(`  Seller: ${seller ? seller.storeName : 'None'}, Status: ${seller ? seller.status : 'None'}, Deleted: ${seller ? seller.isDeleted : 'None'}`);
    if (seller && seller.location) {
      console.log(`  Seller Location: ${JSON.stringify(seller.location)}`);
    }
  }

  process.exit(0);
}

run().catch(console.error);
