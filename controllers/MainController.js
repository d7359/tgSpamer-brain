

module.exports =  class MainController{
	constructor(model){
		this.model = model

		// console.log(this.model)
	}

	create(object, callback) {
		// console.log(this.model)
		const model = new this.model(object);

		model.save(err => {

			if(err){
				return callback({
					status: 'error',
					data: err
				});
			}
			return callback({
				status: 'ok',
				data: model
			});
		});
	}

	createMany(array, callback) {

		this.model.insertMany(array,err => {

			if(err){
				return callback({
					status: 'error',
					data: err
				});
			}
			return callback({
				status: 'ok',
				data: ''
			});
		});
	}


	increment(condition, update, callback){
		this.model.findOneAndUpdate(
			condition,
			{$inc: update},
			{new: true},
			(err,doc)=>{

				if(err){
					return callback({
						status:'error',
						data: err,
						line  : __line,
					});
				}
				callback({
					status:'ok',
					data: doc
				})
			}
		);
	}

	update(condition, update, callback){

		this.model.findOneAndUpdate(
			condition,
			{$set: update},
			{new: true},
			(err,doc)=>{

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

	updateMany(condition, update, callback){

		this.model.updateMany(
			condition,
			{$set: update},
			(err,doc)=>{

				if(err){
					return callback({
						status:'error',
						data: err,
						line  : __line,
					});
				}
				callback({
					status:'ok',
					data: doc
				})
			}
		);
	}

	getAllByCondition(condition, callback) {

		console.log(this.model)

		this.model.find(condition,
			(err, doc) => {

				if (err) {
					return callback({
						status:'error',
						data: err
					})
				}
				callback({
					status:'ok',
					data: doc
				})
			}
		)
	}

	getAllByConditionWithOptions(condition, options, callback){

		this.model.find(condition, null, options,
			(err, doc) => {

				if (err) {
					return callback({
						status:'error',
						data: err
					})
				}
				callback({
					status:'ok',
					data: doc
				})
			}
		)
	}

	deleteOne(condition, callback){

		this.model.deleteOne(condition, (err) => {

			if (err) {
				return callback({
					status: 'error',
					data  : err,
				});
			}
			callback({
				status: 'ok',
			});
		});
	}

	deleteMany(condition, callback){

		this.model.deleteMany(condition, (err) => {

			if (err) {
				return callback({
					status: 'error',
					data: err
				});
			}
			callback({
				status: 'ok',
				data: ''
			})
		})
	}

}