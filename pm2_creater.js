const pm2 = require('pm2');

const exec = require('child_process').exec;

// https://pm2.io/doc/en/runtime/reference/pm2-cli/

const  pm2LoaderRow = {
	name: 'tgSpamer-brain',
	script: '/var/www/node/tgSpamer-brain/bin/www',
	interpreter: "/root/.nvm/versions/node/v16.13.2/bin/node",
	args: "--disable-trace",
	node_args: "--trace-warnings",
};




exec('pm2 save', (error, stdout, stderr) => {

	console.error('error', error);
	console.log('stdout', stdout);
	console.log('stderr', stderr);
});

//
pm2.connect(function (err) {
	if (err) {
		console.error(err);
		process.exit(2)
	}

	pm2.restart( pm2LoaderRow, (err, apps) => {
		pm2.disconnect();
		if (err) {
			throw err
		}

		console.log('pm2Loader', apps);
	});
});