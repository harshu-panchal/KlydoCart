const mongoose = require('mongoose');

async function dropIndex() {
  try {
    await mongoose.connect('mongodb+srv://klydocart:Klydocart%40123@cluster0.7mq15xm.mongodb.net/SpeeUp?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // The collection name for the Tax model is 'taxes'
    try {
      await db.collection('taxes').dropIndex('name_1');
      console.log('Successfully dropped index name_1 on taxes collection');
    } catch (err) {
      console.log('Index might not exist or another error:', err.message);
    }
  } catch (error) {
    console.error('Connection error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

dropIndex();
