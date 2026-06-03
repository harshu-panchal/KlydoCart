const mongoose = require('mongoose');

async function getCats() {
  try {
    await mongoose.connect('mongodb+srv://klydocart:Klydocart%40123@cluster0.7mq15xm.mongodb.net/SpeeUp?retryWrites=true&w=majority&appName=Cluster0');
    const db = mongoose.connection.db;
    const cats = await db.collection('headercategories').find({}).toArray();
    console.log(cats.map(c => c.name));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}
getCats();
