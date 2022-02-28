const express = require('express');
// const auth  = require('basic-auth');
const multer = require('multer');
const router  = express.Router();
const Spammer = require('../modules/Spammer');

const upload = multer({dest: '/var/www/node/tgSpamer-brain/public/uploads/'});

router.options("/*", function(req, res, next){
	console.log(req.headers);
	res.header('Access-Control-Allow-Origin', req.headers.origin);
	res.header('Access-Control-Allow-Credentials','true')
	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
	// res.send(200);
	res.sendStatus(200);
});

router.post('/file_base', upload.single('files'), (req, res) =>  {

	// console.log(req);
	console.log(req.file);
	console.log(req.body);
	console.log(req.body.project);

	if(!req.file){
		return res.json({status:'error',message:'Недопустимое раcширение файла'});
	}


	return res.json({status:'ok', filename: req.file.filename})
});


router.post('/create_account', (req, res, next) => {

	console.log(req.body)

	return Spammer.createAccount(req, result=>{
		return res.json(result)
	})

})

router.post('/upload_base', (req, res) =>  {

	return Spammer.importContacts('/var/www/node/tgSpamer-brain/public/uploads/'+req.body.filename, req.body.project, result=>{
		res.json(result)
	})


});

router.post('/activation', (req, res, next) => {

	console.log(req.body)

	return Spammer.activation(req, result=>{
		return res.json(result)
	})

})

router.post('/confirm_account', (req, res, next) => {

	console.log(req.body)

	return Spammer.confirmCode(req, result=>{
		return res.json(result)
	})
})

router.post('/parse_contacts', (req, res, next) => {

	console.log(req.body)

	return Spammer.parseContacts(req, result=>{
		return res.json(result)
	})
})
router.post('/check_parse_contacts', (req, res, next) => {

	console.log(req.body)

	return Spammer.checkParseContacts(req, result=>{
		return res.json(result)
	})
})

router.post('/save_contacts', (req, res, next) => {

	console.log(req.body)

	res.json({status:'ok'})

	return Spammer.saveContacts(req, result=>{
		console.log(result)
	})
})

router.post('/create_mailing', (req, res, next) => {

	console.log(req.body)

	return Spammer.createMailing(req, result=>{
		return res.json(result)
	})
})

router.post('/mailing_callbacks', (req, res, next) => {

	console.log(req.body)

	return Spammer.mailingCallbacks(req, result=>{
		return res.json(result)
	})
})
router.post('/clear_base', (req, res, next) => {

	console.log(req.body)

	return Spammer.clearBase(req, result=>{
		return res.json(result)
	})
})

router.get('/tg_spammer_connect', function(req,res, next){


		return Spammer.checkActivation(result=>{

			if(result.status!=='ok'){
				return res.redirect('/tg_spammer_activation')
			}

			const objectData ={}

			return res.render('tg_spamer_connect', objectData);
		})



})
router.get('/tg_spammer_parser', function(req,res, next){

	return Spammer.checkActivation(result=>{

		if(result.status!=='ok'){
			return res.redirect('/tg_spammer_activation')
		}
		const objectData ={}

		return res.render('tg_spamer_parser', objectData);

	})

})

router.get('/tg_spammer_mailing', function(req,res, next){

	return Spammer.checkActivation(result=> {

		if (result.status !== 'ok') {
			return res.redirect('/tg_spammer_activation')
		}
		const objectData = {}

		return res.render('tg_spamer_mailing', objectData);
	})

})
router.get('/tg_spammer_activation', function(req,res, next){


		const objectData ={}

		return res.render('tg_spamer_activation', objectData);

})
router.get('/tg_spammer_clear', function(req,res, next){


		const objectData ={}

		return res.render('tg_spamer_clear', objectData);

})
router.get('/tg_spammer_upload_base', function(req,res, next){

		const objectData ={

		}

		return res.render('tg_spamer_upload_base', objectData);
})


module.exports = router;