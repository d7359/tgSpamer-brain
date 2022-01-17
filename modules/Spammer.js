const moment = require('moment')
const request = require('request')
const TgAccounts = require('../controllers/tgAccountsController')
const TgContacts = require('../controllers/tgContactsController')
const TgMailings = require('../controllers/tgMailingsController')
const TgTasks = require('../controllers/tgTasksController')
const TgMessages = require('../controllers/tgMessagesController')
const TgParsings = require('../controllers/tgParsingsController')


class Spammer{

	constructor() {
	}


	async createAccount(req, callback){
		TgAccounts.getAllByCondition({phone:req.body.phone}, result=>{

			if(result.status!=='ok'){
				return callback({status:'error'})
			}

			if(result.data.length>0){
				return callback({status:'error', msg:'Уже есть такой аккаунт'})
			}

			TgAccounts.create({phone: req.body.phone, api_id: req.body.api_id, api_hash:req.body.api_hash, ip:req.body.ip, status:'draft'}, result=>{
				if(result.status!=='ok'){
					return callback({status:'error'})
				}

				return request({
					url:'http://'+req.body.ip+':8080/create_account',
					method:"POST",
					headers:{
						'Content-Type':'application/json'
					},
					body:JSON.stringify(req.body)
				}, (err, httpCode, body)=>{

					console.log(err);

					console.log(body)

					return callback(body)

				})
			})

		})

	}

	// async createSendTask(req, res){
	//
	// 	let result = await sendTasksController.createMany(req.body.tasks)
	//
	// 	if(result.error){
	// 		console.error(result)
	// 		return res.json({status:'error', msg:'Ошибка при создании'})
	// 	}
	//
	// 	return res.json({status:'ok'})
	//
	// }


	async confirmCode(req, callback){


		return request({
			url:'http://'+req.body.ip+':8080/confirm_code',
			method:"POST",
			headers:{
				'Content-Type':'application/json'
			},
			body:JSON.stringify(req.body)
		}, (err, httpCode, body)=>{

			console.log(err);

			console.log(body)

			// return res.json(body)

			try{
				const resultBody = JSON.parse(body)

				if(!resultBody || !resultBody.status || resultBody.status!=='ok'){
					return callback({status:'error'})
				}

				return TgAccounts.update({phone:req.body.phone}, {status:'active', code:req.body.code}, result=> {

					if (result.status !== 'ok') {
						return callback({status: 'error'})
					}

					return callback({status: 'ok'})
				})
			}
			catch (e){
				console.error(e)
				return callback({status: 'error'})

			}


		})



	}

	async parseContacts(req, callback){

		TgParsings.create({}, result=>{
			const parsing = result.data;

			return TgAccounts.getAllByCondition({status:'active'}, result=>{

				const ips = Array.from(new Set(result.data.map(el=>el.ip)))

				for(const ip of ips){
					request({
						url: 'http://'+ip+':8080/parse_contacts',
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({...req.body, parsingId:parsing._id.toString()})
					}, (error,  httpResponse, body)=> {
						console.log(error)
						console.log(body)
					})
				}

				return callback({status: 'ok'})
			})
		})







	}


	saveContacts(req, callback){
		TgParsings.getAllByCondition({_id:req.body.parsingId, end:'no'}, result=>{
			if(result.data.length===0){
				return callback()
			}

			TgParsings.update({_id:req.body.parsingId}, {end:'yes'}, result=>{
				console.log(result)
			})

			const contactIds = req.body.contacts.map(el=>el.id)

			const contacts = []

			return TgContacts.getAllByCondition({id:{$in:contactIds}}, result=>{

				const oldContacts = result.data.map(el=>el.id)

				// const diffContacts = contactIds.filter(el => !oldContacts.includes(el))

				for(const user of req.body.contacts){

					if(oldContacts.includes(user.id)){
						continue;
					}

					contacts.push({
						id:user.id,
						access_hash:user.access_hash,
						first_name:user.first_name || '',
						last_name:user.last_name || '',
						username:user.username || '',
						phone:user.phone || '',
						project:req.body.project
					})

				}

				return TgContacts.createMany(contacts, result=>{


					console.log(result)


					return callback()

				})

			})
		})
	}

	mailingCallbacks(req, callback){

		if(req.body.incomingMessage){
			return this.sendSecondMessage(req.body, callback)
		}

		const push = {

		}

		const key = 'mailings.'+req.body.phone

		push[key] = {mailingId: req.body.mailingId, first_sent: true}

		if(req.body.answer){

			return TgContacts.updateManyWithPullFromArray({id:req.body.user.id}, {}, push, result=>{

				console.log(result)

				push[key].second_message = true

				return TgContacts.updateWithPushInArray({id:req.body.user.id}, {}, push, result=>{
					console.log(result)

					return callback({status:'ok'})
				})
			})


		}

		return TgContacts.updateWithPushInArray({id:req.body.user.id}, {}, push, result=>{
			console.log(result)

			return callback({status:'ok'})
		})
	}

	sendSecondMessage(data, callback){
		return TgContacts.getAllByCondition({id:data.user.id}, result=>{
			const contact = result.data[0];

			const lastMailingIndex = contact.mailings[data.phone].length-1

			console.log(contact.mailings[lastMailingIndex])

			return TgMailings.getAllByCondition({_id:contact.mailings[data.phone][lastMailingIndex].mailingId}, result=>{

				const mailing = result.data[0];

				const setup = mailing.second_message.split('|')
				const setupsLastIndex = setup.length-1
				const text = setup[this.getRandomInRange(0, setupsLastIndex)]

				const task ={
					data:{
						text,
							user:contact,
							mailingId : contact.mailings[data.phone][lastMailingIndex].mailingId,
							tg_account: data.phone
					},
					answer: true,
					execute_time: moment().format('YYYY-MM-DD HH:mm:ss')

				}

				return TgTasks.create(task, result=>{
					console.log(result);

					return callback({status:'ok'})
				})
			})
		})
	}

	async createMailing(req, callback){


			return TgMailings.create(req.body, result=>{


				console.log(result)


				return this.executeMailing(result.data._id.toString(), result=>{
					console.log(result)

					return callback({status: 'ok'})
				})

			})

	}



	executeMailing(id, callback){
		return TgMailings.getAllByCondition({_id:id}, result=>{

			if(result.status!=='ok') {

				console.error(result)

				return callback({
					status: 'error',
					msg   : 'Ошибка при поиске рассылки'
				})
			}

			const mailing = result.data[0];
			const setup = mailing.first_message.split('|')
			const setupsLastIndex = setup.length-1

			return TgContacts.getAllByCondition({project:mailing.project}, result=>{

				if(result.status!=='ok') {

					console.error(result)

					return callback({
						status: 'error',
						msg   : 'Ошибка при поиске контактов'
					})
				}

				const contacts = result.data

				// TgAccounts.getAllByCondition({status:'active'}, result=>{
				// 	const accounts = result.data
				//
				//
				// 	const countInParts = contacts.length/accounts.length
				// 	const countInLastPart = (contacts.length - countInParts*accounts.length)+countInParts

					const tasks = []

					for(const contact of contacts){
						const text = setup[this.getRandomInRange(0, setupsLastIndex)]

						tasks.push({
							data:{
								text,
								user:contact,
								mailingId : id
							},
							answer: false,
							execute_time: moment().format('YYYY-MM-DD HH:mm:ss')

						})

					}

				TgTasks.createMany(tasks, result=>{
					console.log(result)
				})


				// })







			})
		})
	}

	tasksExecutor(){

		console.log('tasksExecutor')

		const limit = 40

		TgTasks.getAllByCondition({status:null}, result=>{
			if(result.status!=='ok'){
				return setTimeout(()=>{this.tasksExecutor()}, 10000)
			}

			if(result.data.length===0){
				return setTimeout(()=>{this.tasksExecutor()}, 10000)
			}

			const task = result.data[0]

			if(task.answer){
				return TgAccounts.getAllByCondition({phone: task.data.tg_account}, async result=>{
					const tgAccount = result.data[0]

					const body = {
						data: {
							phone: tgAccount.phone,
							message: task.data.text,
							user: task.data.user,
							mailingId: task.data.mailingId,
							answer: task.answer
						},
						execute_time: moment().format('YYYY-MM-DD HH:mm:ss')

					}

					console.log({
						url: 'http://'+tgAccount.ip+'/create_send_task',
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(body)
					})

					return request({
						url: 'http://'+tgAccount.ip+':8080/create_send_task',
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify(body)
					}, (error,  httpResponse, body)=>{
						console.log(error)
						console.log(body)

						try{
							const response = JSON.parse(body);

							let status
							// if(response.status==='ok'){
							//
							// }
							// else{
							//
							// }

							TgTasks.update({_id:task._id}, {status:response.status}, result=>{
								console.log(result)
							})

							// TgMessages.create({tg_account: tgAccount.phone, contact: task.data.user}, result=>{
							// 	console.log(result)
							// })

							return setTimeout(()=>{this.tasksExecutor()}, 10000)

						}
						catch (e){
							console.error(e)
							return setTimeout(()=>{this.tasksExecutor()}, 10000)
						}
					})
				})
			}

			return TgAccounts.getAllByCondition({status:'active'}, async result=>{
				if(result.status!=='ok'){
					return setTimeout(()=>{this.tasksExecutor()}, 10000)
				}

				if(result.data.length===0){
					return setTimeout(()=>{this.tasksExecutor()}, 10000)
				}

				const accounts = result.data;

				const tg_accounts = accounts.map(el=>el.phone);


				let phonesData = await TgMessages.getDataByCondition({tg_account:{$in:tg_accounts},created_at: {$gte:new Date(moment().add(-24,'hours').format('YYYY-MM-DD HH:mm:ss'))}})


				console.log(phonesData)

				if(phonesData.error){
					console.error(phonesData)
					return setTimeout(()=>{this.tasksExecutor()}, 10000)
				}

				// if(phonesData.length===0){
				// 	return setTimeout(()=>{this.tasksExecutor()}, 10000)
				// }

				let tgAccount = false

				if(phonesData.length<tg_accounts.length){

					for(const phone of tg_accounts){
						if(!phonesData.find(el=>el._id===phone)){
							tgAccount = accounts.find(el=>el.phone===phone)
						}
					}
				}


				if(phonesData.length===tg_accounts.length) {
					if (phonesData[0].countMessages < limit) {
						tgAccount = accounts.find(el => el.phone === phonesData[0]._id)
					}
				}

				if(!tgAccount){
					return setTimeout(()=>{this.tasksExecutor()}, 10000)
				}

				const body = {
					data: {
						phone: tgAccount.phone,
						message: task.data.text,
						user: task.data.user,
						mailingId: task.data.mailingId,
						answer: task.answer
					},
					execute_time: moment().format('YYYY-MM-DD HH:mm:ss')

				}

				console.log({
					url: 'http://'+tgAccount.ip+'/create_send_task',
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(body)
				})

				return request({
					url: 'http://'+tgAccount.ip+':8080/create_send_task',
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify(body)
				}, (error,  httpResponse, body)=>{
					console.log(error)
					console.log(body)

					try{
						const response = JSON.parse(body);

						let status
						// if(response.status==='ok'){
						//
						// }
						// else{
						//
						// }

						TgTasks.update({_id:task._id}, {status:response.status}, result=>{
							console.log(result)
						})

						TgMessages.create({tg_account: tgAccount.phone, contact: task.data.user}, result=>{
							console.log(result)
						})

						return setTimeout(()=>{this.tasksExecutor()}, 10000)

					}
					catch (e){
						console.error(e)
						return setTimeout(()=>{this.tasksExecutor()}, 10000)
					}
				})
			})

		})
	}

	getRandomInRange(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	// async checkSendTasks(){
	//
	// 	const tasks = await sendTasksController.getAllByCondition({status: null, execute_time: {$lte: moment().format('YYYY-MM-DD HH:mm:ss')}})
	//
	// 	if(tasks.error){
	// 		return setTimeout(()=>{this.checkSendTasks()}, 3000)
	// 	}
	//
	// 	if(tasks.length===0){
	// 		return setTimeout(()=>{this.checkSendTasks()}, 3000)
	// 	}
	//
	// 	await this.executeSendTasks(tasks)
	//
	// 	this.checkSendTasks()
	//
	// }
	//
	// async checkCallbackTasks(){
	//
	// 	const tasks = await callbackTasksController.getAllByCondition({status: null, execute_time: {$lte: moment().format('YYYY-MM-DD HH:mm:ss')}})
	//
	// 	if(tasks.error){
	// 		return setTimeout(()=>{this.checkCallbackTasks()}, 3000)
	// 	}
	//
	// 	if(tasks.length===0){
	// 		return setTimeout(()=>{this.checkCallbackTasks()}, 3000)
	// 	}
	//
	// 	await this.executeSendTasks(tasks)
	//
	// 	this.checkCallbackTasks()
	//
	// }
	//
	// executeSendTasks(tasks){
	// 	return new Promise(resolve=>{
	//
	// 		const success_ids = []
	// 		const failure_ids = []
	// 		const callbackTasks = []
	//
	// 		return async.eachSeries(tasks, (task, taskCallback)=>{
	// 				(async ()=>{
	// 					let d = await this.sendMessage(task.data)
	//
	// 					const callbackTask = {
	// 						data:task.data,
	// 						execute_time: moment().format('YYYY-MM-DD HH:mm:ss')
	// 					}
	// 					callbackTask.data.type = 'status'
	//
	// 					if(d.status==='ok'){
	// 						callbackTask.sent = true
	// 						success_ids.push(task._id.toString())
	// 					}
	// 					else{
	// 						callbackTask.sent = false
	// 						failure_ids.push(task._id.toString())
	// 					}
	//
	// 					callbackTasks.push(callbackTask)
	//
	// 					return setTimeout(()=>{taskCallback()})
	// 				})();
	// 			},
	// 			err=>{
	// 				if(err){
	// 					console.error(err)
	// 				}
	//
	// 				sendTasksController.updateMany({_id:{$in:success_ids}}, {status:'ok'}, result=>{
	// 					console.log(result)
	// 				})
	// 				sendTasksController.updateMany({_id:{$in:failure_ids}}, {status:'error'}, result=>{
	// 					console.log(result)
	// 				})
	//
	// 				callbackTasksController.createMany(callbackTasks, result=>{
	// 					console.log(result)
	// 				})
	//
	//
	// 				return resolve()
	// 			}
	// 		)
	//
	// 	})
	// }
	//
	// executeCallbackTasks(tasks){
	// 	return new Promise(resolve=>{
	//
	// 		const success_ids = []
	// 		const failure_ids = []
	// 		// const callbackTasks = []
	//
	// 		return async.eachSeries(tasks, (task, taskCallback)=>{
	// 				(async ()=>{
	// 					let d = await this.sendRequest(task.data)
	//
	// 					// const callbackTask = {
	// 					// 	data:task.data,
	// 					// 	execute_time: moment().format('YYYY-MM-DD HH:mm:ss')
	// 					// }
	//
	// 					if(d.status==='ok'){
	// 						// callbackTask.sent = true
	// 						success_ids.push(task._id.toString())
	// 					}
	// 					else{
	// 						// callbackTask.sent = false
	// 						failure_ids.push(task._id.toString())
	// 					}
	//
	// 					// callbackTasks.push(callbackTask)
	//
	// 					return setTimeout(()=>{taskCallback()})
	// 				})();
	// 			},
	// 			err=>{
	// 				if(err){
	// 					console.error(err)
	// 				}
	//
	// 				callbackTasksController.updateMany({_id:{$in:success_ids}}, {status:'ok'}, result=>{
	// 					console.log(result)
	// 				})
	// 				callbackTasksController.updateMany({_id:{$in:failure_ids}}, {status:'error'}, result=>{
	// 					console.log(result)
	// 				})
	//
	// 				// callbackTasksController.createMany(callbackTasks, result=>{
	// 				// 	console.log(result)
	// 				// })
	//
	//
	// 				return resolve()
	// 			}
	// 		)
	//
	// 	})
	// }
	//
	// async sendMessage(data){
	//
	// 	return new Promise(async resolve=>{
	// 		const addContact = await this.accounts[data.phone].call('contacts.addContact', {
	// 			id	:{
	// 				_: 'inputUser',
	// 				user_id: data.user.id,
	// 				access_hash: data.user.access_hash
	// 			},
	// 			first_name:	data.user.first_name || '',
	// 			last_name:	data.user.last_name || '',
	// 			phone:	data.user.phone ||''
	// 		})
	//
	//
	// 		const sendMessage = await this.accounts[data.phone].call('messages.sendMessage', {
	// 			peer	:{
	// 				_: 'inputPeerUser',
	// 				user_id: data.user.id,
	// 				access_hash: data.user.access_hash
	// 			},
	// 			message:	data.message,
	// 			random_id:	Math.ceil(Math.random() * 0xffffff) + Math.ceil(Math.random() * 0xffffff),
	// 			// phone:	user.phone ||''
	// 		})
	//
	// 		if(sendMessage._!=='updateShortSentMessage'){
	//
	// 			console.error(sendMessage)
	//
	// 			return resolve({status:'error'})
	// 		}
	//
	// 		return resolve({status:'ok'})
	//
	// 	})
	// }
	//
	// sendRequest(data){
	// 	return new Promise(resolve => {
	// 		return request({
	// 			url:'https://go.geeko.tech/tg_callback',
	// 			method:'POST',
	// 			headers:{'Content-Type':'application/json'},
	// 			body:JSON.stringify(data)
	// 		}, (error,  httpResponse, body)=>{
	// 			console.error(error)
	// 			// console.log(httpResponse)
	// 			console.log(body)
	//
	// 			if(error){
	// 				return resolve({status:'error'})
	// 			}
	//
	// 			return resolve({status:'ok'})
	// 		})
	// 	})
	// }

}

const SpammerCls = new Spammer()

module.exports = SpammerCls