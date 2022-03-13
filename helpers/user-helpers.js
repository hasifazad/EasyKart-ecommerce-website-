var db = require('../config/connection')
var bcrypt = require('bcrypt')
var ObjectId = require('mongodb').ObjectId
const { response } = require('express')
const Razorpay = require('razorpay')
const crypto = require('crypto');
const { resolve } = require('path')



module.exports = {
    doSignUp: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.password = await bcrypt.hash(userData.password, 10)
            db.get().collection('userdetails').insertOne(userData).then((response) => {
                resolve(userData)
            })

        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let response = {}
            let user = await db.get().collection('userdetails').findOne({ emailid: userData.emailid })
            if (user) {
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {

                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {

                        resolve({ status: false })
                    }
                })

            } else {

                resolve({ status: false })
            }
        })
    },
    addToCart: (proId, userId) => {
        let proObj = {
            item: ObjectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection('cart').findOne({ user: ObjectId(userId) })
            if (userCart) {
                let proExist = await userCart.products.findIndex(products => products.item == proId)
                if (proExist != -1) {
                    await db.get().collection('cart').updateOne({ user: ObjectId(userId), 'products.item': ObjectId(proId) }, { $inc: { 'products.$.quantity': 1 } }).then(() => { resolve() })
                } else {
                    await db.get().collection('cart').updateOne({ user: ObjectId(userId) },
                        {

                            $push: { products: proObj }

                        }
                    ).then((response) => { resolve() })
                }

            } else {
                let cartObj = {
                    user: ObjectId(userId),
                    products: [proObj]

                }
                db.get().collection('cart').insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection('cart').aggregate([
                {
                    $match: { user: ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: 'product',
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            if (cartItems.length === 0) {
                resolve('empty')
            } else {
                resolve(cartItems)
            }
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection('cart').findOne({ user: ObjectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)

        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection('cart').updateOne({ _id: ObjectId(details.cart) },
                    {
                        $pull: { products: { item: ObjectId(details.product) } }
                    }
                ).then((response) => { resolve({ removeproduct: true }) })

            } else {
                db.get().collection('cart').updateOne({ _id: ObjectId(details.cart), 'products.item': ObjectId(details.product) },
                    {
                        $inc: { 'products.$.quantity': details.count }
                    }).then((response) => {
                        resolve({ status: true })
                    })
            }


        })
    },
    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection('cart').aggregate([
                {
                    $match: { user: ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: 'product',
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $addFields: {
                        price: { $toInt: '$product.price' }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', '$price'] } }
                    }
                }
            ]).toArray()
            if (total.length === 0) {
                resolve('0')
            } else {
                resolve(total[0].total)
            }
        })
    },
    removeProduct: (userId, proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection('cart').updateOne({ user: ObjectId(userId) },
                {
                    $pull: { products: { item: ObjectId(proId) } }
                }
            ).then()
            resolve()
        })
    },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection('cart').findOne({ user: ObjectId(userId) })
            resolve(cart.products)
        })
    },
    placeOrder: (order, products) => {
        return new Promise((resolve, reject) => {
            let status = order.payment === 'COD' ? 'placed' : 'pending'
            let orderObj = {
                userId: ObjectId(order.userId),
                products: products,
                deliveryDetails: {
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode
                },
                totalAmount: order.total,
                payment: order.payment,
                date: new Date(),
                status: status
            }
            db.get().collection('orders').insertOne(orderObj).then(() => {
                db.get().collection('cart').deleteOne({ user: ObjectId(order.userId) })
                resolve(orderObj._id)
            })
        })
    },
    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection('orders').find({ userId: ObjectId(userId) }).toArray()
            resolve(orders)
        })
    },
    generateRazorpay: (orderId, total) => {
        var instance = new Razorpay({
            key_id: 'rzp_test_hpfEAD3AmmxVo5',
            key_secret: 'COn7Bt0WUqkULBks5g3znowZ',
        })
        return new Promise((resolve, reject) => {
            var options = {
                amount: total * 100,
                currency: "INR",
                receipt: '' + orderId
            };
            instance.orders.create(options, function (err, order) {
                resolve(order)
            });

        })
    },
    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            let hmac = crypto.createHmac('sha256', 'COn7Bt0WUqkULBks5g3znowZ')
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]'])
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
        })
    },
    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection('orders').updateOne({ _id: ObjectId(orderId) },
                {
                    $set: {
                        status: 'placed'
                    }
                }).then(() => { resolve() })
        })
    }

}