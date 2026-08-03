const mongoose = require('mongoose');

const uri = "mongodb+srv://klydocart:Klydocart%40123@cluster0.7mq15xm.mongodb.net/SpeeUp?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const promoStrips = await db.collection('promostrips').find({}).toArray();
  console.log(`Total Promo Strips found: ${promoStrips.length}`);

  const now = new Date();
  console.log("Current date for query simulation:", now.toISOString());

  for (const strip of promoStrips) {
    console.log(`\nStrip ID: ${strip._id}`);
    console.log(`  Heading: ${strip.heading}`);
    console.log(`  HeaderCategorySlug: ${strip.headerCategorySlug}`);
    console.log(`  IsActive: ${strip.isActive}`);
    console.log(`  StartDate: ${strip.startDate ? strip.startDate.toISOString() : 'None'}`);
    console.log(`  EndDate: ${strip.endDate ? strip.endDate.toISOString() : 'None'}`);
    console.log(`  Category Cards Count: ${strip.categoryCards ? strip.categoryCards.length : 0}`);
    if (strip.categoryCards && strip.categoryCards.length > 0) {
      console.log(`  Category Cards:`, JSON.stringify(strip.categoryCards, null, 2));
    }
  }

  process.exit(0);
}

run().catch(console.error);
