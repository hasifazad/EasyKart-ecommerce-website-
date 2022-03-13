
const { response } = require('../app')
var db = require('../config/connection')
var ObjectId = require('mongodb').ObjectId
var bcrypt = require('bcrypt')

module.exports = {

    doSignUp: (adminData) => {
        return new Promise(async (resolve, reject) => {
            adminData.password = await bcrypt.hash(adminData.password, 10)
            db.get().collection('admindetails').insertOne(adminData).then((response) => {
                resolve(adminData)
            })

        })
    },
    doLogin: (adminData) => {
        return new Promise(async (resolve, reject) => {
            let response = {}
            let admin = await db.get().collection('admindetails').findOne({ emailid: adminData.emailid })
            if (admin) {
                bcrypt.compare(adminData.password, admin.password).then((status) => {
                    if (status) {

                        response.admin = admin
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
    addProducts: (product, callback) => {
        db.get().collection('product').insertOne(product).then((data) => {
            callback(data.insertedId)
        })
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            var products = await db.get().collection('product').find().toArray()
            resolve(products)
        })
    },
    deleteProduct: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection('product').deleteOne({ _id: ObjectId(proId) }).then((response) => {

                resolve(response)
            })
        })
    },
    getProductDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection('product').findOne({ _id: ObjectId(proId) }).then((products) => {
                resolve(products)
            })
        })
    },
    updateProduct: (proId, proDetails) => {

        return new Promise((resolve, reject) => {
            db.get().collection('product')
                .updateOne({ _id: ObjectId(proId) }, {
                    $set: {
                        productname: proDetails.productname,
                        category: proDetails.category,
                        description: proDetails.description
                    }
                }).then((response) => {
                    resolve()
                })

        })
    }
}