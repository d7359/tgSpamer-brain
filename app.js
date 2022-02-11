const express        = require('express');
const cookieParser   = require('cookie-parser');
const bodyParser     = require('body-parser');
const path           = require('path');
const Spammer     = require('./modules/Spammer')
const isDebug        = process.env.IN_WORKS !== undefined;

const indexRouter = require('./routes/index')
// https://github.com/starak/node-console-stamp
require('console-stamp')(console, {
	metadata: function () {
		const orig              = Error.prepareStackTrace;
		Error.prepareStackTrace = (_, stack) => stack;
		const err               = new Error;
		Error.captureStackTrace(err, arguments.callee);
		const stack             = err.stack;
		Error.prepareStackTrace = orig;
		return (`[${stack[1].getFileName()}:${stack[1].getLineNumber()}\n`);
	},
	colors  : {
		stamp   : 'yellow',
		label   : 'white',
		metadata: 'green'
	},
	// exclude: isDebug || isLocalProduct ? [] : ["log", "info", "warn", "error", "dir", "assert"],
});

const app = express();


app.set('view cache', false);
app.use('/public', express.static(__dirname + '/public'));

app.use(bodyParser.json({
	limit   : '50mb',
	extended: true
}));
app.use(bodyParser.urlencoded({
	limit   : '50mb',
	extended: true
}));
app.use(express.json());
app.use(cookieParser());



app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'twig');


app.use('/', indexRouter);


class MainClass{

	constructor(){

		Spammer.tasksExecutor(true)
		Spammer.tasksExecutor(false)

	}
}

const ClsMainClass = new MainClass();

module.exports = app;