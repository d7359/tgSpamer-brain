const MainController = require('./MainController');
const TgAccounts = require('../models/TgContacts');

class tgAccountsController extends MainController{
	updateWithPushInArray(condition, update, push, callback){
		this.model.updateOne(
			condition,
			{
				$set: update,
				$push: push
			},
			{new: true},
			(err,doc)=>{
				// _mongoError(err)
				if(err){
					return callback({
						status:'error',
						data: err,
						// line  : __line,
					});
				}
				callback({
					status:'ok',
					data: doc
				})
			}
		);
	}

	updateManyWithPullFromArray(condition, update, pull, callback){
		this.model.updateMany(
			condition,
			{
				$set: update,
				$pull: pull
			},
			{new: true},
			(err,doc)=>{
				// _mongoError(err)
				if(err){
					return callback({
						status:'error',
						data: err,
						// line  : __line,
					});
				}
				callback({
					status:'ok',
					data: doc
				})
			}
		);
	}

}

const tgAccountsControllerCls = new tgAccountsController(TgAccounts);

module.exports = tgAccountsControllerCls;