var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const fs = require("fs")
const { response } = require('../app');




const verifylogin = (req, res, next) => {
  if (req.session.adminLoggedin) {
    adminData=req.session.admin
    next()
  } else {
    res.render('admin/admin-login',{admin:true})
  }
}

router.get('/',verifylogin, function (req, res, next) {
  productHelpers.getAllProducts().then((products) => {
    res.render('admin/admin-viewproducts', { adminData,products, admin:true})
  })
})

// router.get('/admin-login',verifylogin,(req,res)=>{
//   if(req.session.admin){
//     admin=req.session.admin
//   }else{
//     res.redirect('/admin')
//   }
// })

router.post('/admin-login', (req, res) => {
  productHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.adminLoggedin = true
      req.session.admin = response.admin
      res.redirect('/admin')
    } else {
      res.redirect('/admin')
    }
  })
})

router.get('/admin-signup',(req,res)=>{
  res.render('admin/admin-signup',{admin:true})
})

router.post('/admin-signup', (req, res) => {
  productHelpers.doSignUp(req.body).then((adminData) => {
    req.session.adminLoggedin = true
    req.session.admin = adminData
    res.redirect('/admin')
  })
})

router.get('/admin-logout', (req, res) => {
  req.session.destroy()
  res.redirect('/admin')
})


router.get('/add-products', (req, res) => {
  res.render('admin/add-products', { adminData,admin:true})
})



router.post('/add-product', (req, res) => {
  productHelpers.addProducts(req.body, (id) => {
    let Image = req.files.Image
    Image.mv('./public/images/proimages/' + id + '.jpg')
  })
  res.redirect("/admin/add-products")
})



router.get('/delete-product/:id', (req, res) => {
  let proId = req.params.id
  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect('/admin/')
    fs.unlinkSync('./public/images/proimages/' + proId + '.jpg')
  })
})



router.get('/edit-product/:id', async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id)
  res.render('admin/edit-product', {adminData, product, admin: true })
})



router.post('/edit-product/:id', (req, res) => {
  let id = req.params.id
  productHelpers.updateProduct(id, req.body).then(() => {
    res.redirect('/admin')
    if (req.files.Image) {
      let image = req.files.Image
      image.mv('./public/images/proimages/' + id + '.jpg')
    }
  })
})




module.exports = router;
