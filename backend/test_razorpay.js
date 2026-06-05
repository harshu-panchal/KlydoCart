const Razorpay = require('razorpay');

const keyId = 'rzp_test_S2tOuYBZiOuLb4';
const keySecret = 'tiR3NbQKSBa5mrdKyZbsnh7x';

const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
});

const options = {
    amount: 100, // Amount in paise
    currency: 'INR',
    receipt: 'test_order_123',
    notes: {
        orderId: 'test_order_123',
    },
};

razorpay.orders.create(options)
    .then((order) => {
        console.log('Order created successfully:', order);
    })
    .catch((error) => {
        console.error('Error creating order:', error);
    });
