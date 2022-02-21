const moment = require('moment')
const request = require('request')
const TgAccounts = require('../controllers/tgAccountsController')
const TgContacts = require('../controllers/tgContactsController')
const TgMailings = require('../controllers/tgMailingsController')
const TgTasks = require('../controllers/tgTasksController')
const TgMessages = require('../controllers/tgMessagesController')
const TgParsings = require('../controllers/tgParsingsController')
const TgConfigs = require('../controllers/tgConfigsController')


class Spammer{

	constructor() {
	}

	async createAccount(req, callback){



			this.checkActivation( result=>{
				if(result.status!=='ok'){
					return callback(result)
				}

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
			})

	}

	checkActivation( callback){

		TgConfigs.getAllByConditionWithOptions({}, {sort:{_id:-1}}, result=>{

			if(result.status!=='ok'){
				return callback({status:'error', msg:'Ошибка'})
			}

			if(result.data.length===0){
				return callback({status:'error', msg:'Ошибка'})
			}

			request({
				url: 'https://pay.telegramer.bot/check_spamer_activation',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(result.data[0])
			}, (error,  httpResponse, body)=> {
				console.log(error)
				console.log(body)

				if(body==='{"status":"ok"}'){
					return callback({status:'ok'})
				}

				callback({status:'error', msg: 'Ошибка при активации'})
			})
		})
	}

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

	async activation(req, callback){

		const data = {
			key: req.body.hash
		}

		TgConfigs.create({data}, result=>{
			console.log(result)

			if(result.status!=='ok'){
				return callback({status:'error', msg: 'Ошибка при активации'})
			}

			request({
				url: 'https://pay.telegramer.bot/spamer_activation',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(result.data)
			}, (error,  httpResponse, body)=> {
				console.log(error)
				console.log(body)

				if(body==='{"status":"ok"}'){
					return callback({status:'ok'})
				}

				callback({status:'error', msg: 'Ошибка при активации'})
			})
		})
	}

	async parseContacts(req, callback){


		return this.checkActivation(result=>{

			if(result.status!=='ok'){
				return callback({status:'error',msg   : 'Не активировано'})
			}

			return TgAccounts.getAllByCondition({status:'active'}, result=>{

				const ips = Array.from(new Set(result.data.map(el=>el.ip)))

				if(ips.length===0){
					return callback({status:'error',msg   : 'Нет подключенных номеров'})
				}

				TgParsings.create({}, result=>{
					const parsing = result.data;

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

					return callback({status: 'ok', parsingId: parsing._id.toString()})
				})
			})
		})

	}
	async checkParseContacts(req, callback){


		TgParsings.getAllByCondition({_id:req.body.parsingId}, result=>{

			if(result.status!=='ok'){
				return callback({status: 'error'})
			}

			const parsing = result.data[0];

			return callback({status: 'ok', finish: parsing.end==='yes'})
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
			const notClearContacts = []

			return TgContacts.getAllByCondition({id:{$in:contactIds}}, result=>{

				const oldContacts = result.data.map(el=>el.id)

				// const diffContacts = contactIds.filter(el => !oldContacts.includes(el))

				for(const user of req.body.contacts){

					if(oldContacts.includes(user.id)){
						notClearContacts.push(user.id)
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

					return TgContacts.updateMany({id:{$in:notClearContacts}}, {clear:false}, result=>{

						console.log(result)

						return callback()

					})


				})

			})
		})
	}


	clearBase(req, callback){
		return TgContacts.updateMany({}, {clear:true}, result=>{
			return callback(result)
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

			if(result.data.length===0){
				return callback({status:'ok'})
			}

			const contact = result.data[0];

			if(!contact.mailings || !contact.mailings[data.phone]){
				return callback({status:'ok'})
			}

			const lastMailingIndex = contact.mailings[data.phone].length-1

			console.log(contact.mailings[lastMailingIndex])


			if(contact.mailings[data.phone][lastMailingIndex].second_message){
				return callback({status:'ok'})
			}

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

		return this.checkActivation(result=>{

			if(result.status!=='ok'){
				return callback({status:'error',msg   : 'Не активировано'})
			}
			return TgMailings.create(req.body, result=>{


				console.log(result)


				return this.executeMailing(result.data._id.toString(), result=>{
					console.log(result)

					return callback({status: 'ok'})
				})

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

			return TgContacts.getAllByCondition({clear:{$ne:true}, project:mailing.project}, result=>{

				if(result.status!=='ok') {

					console.error(result)

					return callback({
						status: 'error',
						msg   : 'Ошибка при поиске контактов'
					})
				}

				const contacts = result.data

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

			})
		})
	}

	tasksExecutor(answer){

		console.log('tasksExecutor')

		return this.checkActivation(result=> {

			if (result.status !== 'ok') {
				// return callback({
				// 	status: 'error',
				// 	msg   : 'Не активировано'
				// })

				return setTimeout(() => {
					this.tasksExecutor(answer)
				}, 10000)
			}

			const limit = 40

			TgTasks.getAllByCondition({
				status: null,
				answer: answer
			}, result => {
				if (result.status !== 'ok') {
					return setTimeout(() => {
						this.tasksExecutor(answer)
					}, 10000)
				}

				if (result.data.length === 0) {
					return setTimeout(() => {
						this.tasksExecutor(answer)
					}, 10000)
				}

				const task = result.data[0]

				if (task.answer) {
					return TgAccounts.getAllByCondition({phone: task.data.tg_account}, async result => {
						const tgAccount = result.data[0]

						const body = {
							data        : {
								phone    : tgAccount.phone,
								message  : task.data.text,
								user     : task.data.user,
								mailingId: task.data.mailingId,
								answer   : task.answer
							},
							execute_time: moment().format('YYYY-MM-DD HH:mm:ss')

						}

						console.log({
							url    : 'http://' + tgAccount.ip + '/create_send_task',
							method : 'POST',
							headers: {
								'Content-Type': 'application/json'
							},
							body   : JSON.stringify(body)
						})

						return request({
							url    : 'http://' + tgAccount.ip + ':8080/create_send_task',
							method : 'POST',
							headers: {
								'Content-Type': 'application/json'
							},
							body   : JSON.stringify(body)
						}, (error, httpResponse, body) => {
							console.log(error)
							console.log(body)

							try {
								const response = JSON.parse(body);


								TgTasks.update({_id: task._id}, {status: response.status}, result => {
									console.log(result)
								})

								return setTimeout(() => {
									this.tasksExecutor(answer)
								}, 10000)

							} catch (e) {
								console.error(e)
								return setTimeout(() => {
									this.tasksExecutor(answer)
								}, 10000)
							}
						})
					})
				}

				return TgAccounts.getAllByCondition({status: 'active'}, async result => {
					if (result.status !== 'ok') {
						return setTimeout(() => {
							this.tasksExecutor(answer)
						}, 10000)
					}

					if (result.data.length === 0) {
						return setTimeout(() => {
							this.tasksExecutor(answer)
						}, 10000)
					}

					const accounts = result.data;

					const tg_accounts = accounts.map(el => el.phone);


					let phonesData = await TgMessages.getDataByCondition({
						tg_account: {$in: tg_accounts},
						created_at: {$gte: new Date(moment().add(-24, 'hours').format('YYYY-MM-DD HH:mm:ss'))}
					})


					console.log(phonesData)

					if (phonesData.error) {
						console.error(phonesData)
						return setTimeout(() => {
							this.tasksExecutor(answer)
						}, 10000)
					}

					let tgAccount = false

					if (phonesData.length < tg_accounts.length) {

						for (const phone of tg_accounts) {
							if (!phonesData.find(el => el._id === phone)) {
								tgAccount = accounts.find(el => el.phone === phone)
							}
						}
					}


					if (phonesData.length === tg_accounts.length) {
						if (phonesData[0].countMessages < limit) {
							tgAccount = accounts.find(el => el.phone === phonesData[0]._id)
						}
					}

					if (!tgAccount) {
						return setTimeout(() => {
							this.tasksExecutor(answer)
						}, 10000)
					}

					const body = {
						data        : {
							phone    : tgAccount.phone,
							message  : task.data.text,
							user     : task.data.user,
							mailingId: task.data.mailingId,
							answer   : task.answer
						},
						execute_time: moment().format('YYYY-MM-DD HH:mm:ss')

					}

					console.log({
						url    : 'http://' + tgAccount.ip + '/create_send_task',
						method : 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body   : JSON.stringify(body)
					})

					return request({
						url    : 'http://' + tgAccount.ip + ':8080/create_send_task',
						method : 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body   : JSON.stringify(body)
					}, (error, httpResponse, body) => {
						console.log(error)
						console.log(body)

						try {
							const response = JSON.parse(body);


							TgTasks.update({_id: task._id}, {status: response.status}, result => {
								console.log(result)
							})

							TgMessages.create({
								tg_account: tgAccount.phone,
								contact   : task.data.user
							}, result => {
								console.log(result)
							})

							return setTimeout(() => {
								this.tasksExecutor(answer)
							}, 10000)

						} catch (e) {
							console.error(e)
							return setTimeout(() => {
								this.tasksExecutor(answer)
							}, 10000)
						}
					})
				})

			})
		})
	}

	getRandomInRange(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

}

const SpammerCls = new Spammer()

module.exports = SpammerCls