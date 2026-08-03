const mongoose = require('mongoose');
const uri = "mongodb+srv://klydocart:Klydocart%40123@cluster0.7mq15xm.mongodb.net/SpeeUp?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const result = await db.collection('categories').aggregate([
    { $match: { status: 'Active', parentId: null } },
    {
      $lookup: {
        from: 'products',
        let: { catId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$category', '$$catId'] }, status: 'Active', publish: true } },
          { $limit: 1 },
          { $project: { _id: 1 } }
        ],
        as: 'productSample'
      }
    },
    { $match: { 'productSample.0': { $exists: true } } },
    { $sample: { size: 4 } },
    { $project: { name: 1, slug: 1 } }
  ]).toArray();

  console.log('\n✅ 4 random categories that HAVE active products:');
  result.forEach((c, i) => console.log(`  ${i + 1}. ${c.name}  (slug: ${c.slug})`));
  console.log(`\nTotal picked: ${result.length}`);
  process.exit(0);
}
run().catch(console.error);
