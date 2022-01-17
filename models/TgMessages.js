// const moment = require('moment');
const mongoose = require('mongoose');
const connect = mongoose.createConnection('mongodb://127.0.0.1:27017/tg_spammer_brain', {
	serverSelectionTimeoutMS: 10000,
	useNewUrlParser: true,
	useUnifiedTopology: true,
});
connect.once('open', () => {
	console.info('mongoose|connect|open');
});
connect.once('error', (error) => {
	console.error('mongoose|connect|error', error);
	process.exit(1);
});

const Schema = mongoose.Schema;

/**
 * Схема событий
 * @type {Schema}
 */
const schemaEvents = new Schema({
	tg_account:{
		type:String
	},
	contact:{
		type:{}
	}

}, {timestamps: {createdAt: 'created_at', updatedAt: 'updated_at'}});
module.exports = connect.model('tg_messages', schemaEvents);