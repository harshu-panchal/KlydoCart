const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://klydocart:Klydocart%40123@cluster0.7mq15xm.mongodb.net/SpeeUp?retryWrites=true&w=majority&appName=Cluster0').then(async () => {
  const Product = require('./src/models/Product').default;
  const Category = require('./src/models/Category').default;
  const cats = await Category.find({ headerCategoryId: '69fb2bdca371628c09f6f711' }).lean();
  const ids = cats.map(c => c._id);
  const query = {
    status: 'Active',
    publish: true,
    $or: [
      { headerCategoryId: '69fb2bdca371628c09f6f711' },
      { category: { $in: ids } }
    ]
  };
  console.log('Query:', JSON.stringify(query));
  const products = await Product.find(query).select('name').lean();
  console.log('Found:', products.map(p => p.name));
  process.exit(0);
});
