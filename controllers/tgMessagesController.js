const MainController = require('./MainController');
const TgAccounts = require('../models/TgMessages');

class tgAccountsController extends MainController{

	getDataByCondition(condition, callback){
		return new Promise(resolve => {

			if (!callback) {
				callback = () => {
				}
			}

			this.model.aggregate([
					{
						$match: condition,
					},
					{
						$addFields: {'contacts':[]}
					},
					{
						$group: {
							_id: '$tg_account',
							// channelId: {$first:'$channelId'},
							// contacts         : {$addToSet: '$contactId'},
							// contactsCount: {$sum: {$size: "$contacts"}},
							countMessages: {$sum: 1},
						},
					},
					// {
					// 	$project: {
					// 		tg_account         : 1,
					// 		// channelId: 2,
					// 		// contacts         : 3,
					// 		// contactsCount: {$size: "$contacts"},
					// 		countMessages : 2
					// 	}
					// },
					{ $sort: {countMessages:1} }
				],
				(err, doc) => {

					if (err) {
						callback({
							error: err
						})
						return resolve({
							error: err
						})
					}
					callback(doc)
					return resolve(doc)

				}
			);
		})
	}
}

const tgAccountsControllerCls = new tgAccountsController(TgAccounts);

module.exports = tgAccountsControllerCls;