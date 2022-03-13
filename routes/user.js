
var express = require('express');
const { response } = require('../app');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers')



const verifylogin = (req, res, next) => {
  if (req.session.userLoggedin) {
    next()
  } else {
    res.redirect('/login')
  }
}

router.get('/', async function (req, res, next) {
  let user = req.session.user
  if (user) {
    var cartCount = await userHelpers.getCartCount(user._id)
  }
  productHelpers.getAllProducts().then((products) => {
    res.render('user/user-viewproducts', { products, user, cartCount })
  })
});

router.get('/signup', (req, res) => {
  res.render('user/user-signup')
})

router.post('/signup', (req, res) => {
  userHelpers.doSignUp(req.body).then((userData) => {
    req.session.userLoggedin = true
    req.session.user = userData
    res.redirect('/')
  })
})



router.get('/login', (req, res) => {
  if (req.session.userLoggedin) {
    res.redirect('/')
  } else
    res.render('user/user-login')
})

router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.userLoggedin = true
      req.session.user = response.user
      res.redirect('/')
    } else {
      res.redirect('/login')
    }
  })
})



router.get('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/')
})



router.get('/cart', verifylogin, async (req, res) => {
  let user = req.session.user
  if (user) {
    var cartCount = await userHelpers.getCartCount(user._id)
  }
  let products = await userHelpers.getCartProducts(user._id)
  let totalValue = await userHelpers.getTotalAmount(user._id)
    res.render('user/cart', { user, products, cartCount, totalValue })
  
})



router.get('/add-to-cart/:id', (req, res) => {
  let proId =req.params.id
  let user = req.session.user
  userHelpers.addToCart(proId,user._id).then(() => {
    res.json({ status: true })
  })
})

router.post('/change-product-quantity', (req, res, next) => {
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user)
    res.json(response)
  })
})

router.get('/remove-product/:proId', (req, res) => {
  let userId = req.session.user._id
  let proId = req.params.proId
  userHelpers.removeProduct(userId, proId).then(() => {
    res.redirect('/cart')
  })
})



router.get('/place-order', async (req, res) => {
  let user = req.session.user
  let total = await userHelpers.getTotalAmount(user._id)
  res.render('user/place-order', { user, total })
})


 router.post('/place-order', async(req, res) => {
   let products=await userHelpers.getCartProductList(req.body.userId)
   let total=req.body.total
   userHelpers.placeOrder(req.body,products).then((orderId)=>{
     if(req.body.payment==='COD'){
      res.json({codSuccess:true})
     }else{
       userHelpers.generateRazorpay(orderId,total).then((response)=>{
         res.json(response)
       })
     }
   })
 })

 router.get('/order-successful',(req,res)=>{
  let user=req.session.user
   res.render('user/order-successful',{user})
 })

 router.get('/orders',verifylogin,async(req,res)=>{
   let user=req.session.user
   let orders=await userHelpers.getUserOrders(user._id)
   res.render('user/orders',{user,orders})
 })

 router.post('/verify-payment',(req,res)=>{
   console.log(req.body)
    userHelpers.verifyPayment(req.body).then(()=>{
      userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
        res.json({status:true})
      })
    }).catch((err)=>{
      res.json({status:false})
    })
 })




module.exports = router;
