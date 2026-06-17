const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://klydocart:Klydocart%40123@cluster0.7mq15xm.mongodb.net/SpeeUp?retryWrites=true&w=majority&appName=Cluster0')
  .then(async () => {
    const db = mongoose.connection.db;
    const collection = db.collection('deliveries');
    const result = await collection.updateMany(
      { cashCollected: { $gt: 0 } },
      [{ $set: { pendingAdminPayout: '$cashCollected' } }]
    );
    console.log(result);
    process.exit(0);
  });
